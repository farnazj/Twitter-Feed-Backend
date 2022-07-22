const Queue = require('bull');
const util = require('../lib/util');
var wrapAsync = require('../lib/wrappers').wrapAsync;
const db = require('../models');
var path = require('path');
var Sequelize = require('sequelize');
const logger = require('../lib/logger');
const Op = Sequelize.Op;
require('dotenv').config({ path: path.join(__dirname,'/../.env') });
var sleuthServices = require('../lib/sleuthServices');
const { exit } = require('process');


//predictionsQueue = new Queue('check-AI-predictions', { redis: { host: process.env.REDIS_HOST, port: process.env.REDIS_PORT, password: process.env.REDIS_PASS }});

predictionsQueue = new Queue('check-AI-predictions', { redis: { host: process.env.REDIS_HOST, port: parseInt(process.env.REDIS_PORT) }});

function processRealTimeQueue(userIdSocketMapping) {

    predictionsQueue.process( async function (job, done) {

        let labelingStatus = (await sleuthServices.getLabelingStatus(job.data.modelConfig.workspace)).data;
        // logger.info(`\n (in predictions queue processing) labeling status for the model for stage ${job.data.modelConfig.workspace} : ${JSON.stringify(labelingStatus)}`);
        
        
        let models = (await sleuthServices.getModels(job.data.modelConfig.workspace)).data.models;
        // logger.info(`models for stage ${job.data.modelConfig.forStage} : ${JSON.stringify(models)}`)

        let userModelConfigProm = db.ModelConfig.findOne({
            where: {
                forStage: job.data.modelConfig.forStage,
                UserId: job.data.userId
            }
        });

        let user = await db.User.findByPk(job.data.userId);

        let tweetStageMapping = JSON.parse((await user.getTweetStage()).mappingsBlob);
        let tweetsForStage = Object.entries(tweetStageMapping).filter(([tweetId, stage]) => stage == job.data.modelConfig.forStage).map(el => parseInt(el[0]));

        let userModelConfig = await userModelConfigProm;
        // logger.info(`latest user config for stage ${job.data.modelConfig.forStage}: ${JSON.stringify(userModelConfig)}`);

    
        let nextToLabelsProm = new Promise((resolve, reject) => resolve([]));
        // if (models.length)
        //     nextToLabelsProm = util.getNextToLabel(job.data.userId, userModelConfig, tweetsForStage);

        let newestModels = models.filter(model => model.iteration > userModelConfig.iteration);
        // logger.info(`newest models: ${JSON.stringify(newestModels)}`)

        let modelChanged = false;
        let positiveElements = [];

        if (newestModels.length) {
            if (newestModels.length > 1) {
                // logger.info(`missed some number of iterations: ${newestModels.length}`);
            }

            modelChanged = true;
            positiveElements = (await sleuthServices.getPositivePredictions({
                workspaceName: job.data.modelConfig.workspace,
                documentId: job.data.modelConfig.documentId
            })).data.elements;
            
            // logger.info(`'positive elements are ${positiveElements.map(el => el.id)}`);

        }

        let nextToLabels = await nextToLabelsProm;

        // logger.info( `model changed? ${modelChanged}, for model: ${job.data.modelConfig.forStage}`);

        done( null, {
            modelChanged: modelChanged,
            positiveElements: positiveElements,
            tweetsForStage: tweetsForStage,
            user: user,
            nextToLabels: nextToLabels }); 
    });


    predictionsQueue.on('failed', wrapAsync(async (job, result) => {
        logger.info(`job${job.name} failed for the following reason: ${job.failedReason}`)
    }))


    predictionsQueue.on('completed', wrapAsync(async (job, result) => {
        
        let user = result.user;

        let tweetsWChangedLabels = [];
        let userCondition = (await user.getUserConditions({
            where: {
              version: 1
            }
          }))[0];

        if (result.modelChanged) {  

            let modelConfig = (await user.getUserModelConfigs({
                where: {
                    forStage: job.data.modelConfig.forStage
                }
            }))[0];
            modelConfig.iteration += 1;
            let modelConfigProm = modelConfig.save();


            let positiveTweetIndices = (await db.TweetElementMapping.findAll({
                attributes: ['index'],
                where: {
                    assignedId: {
                        [Op.in]: result.positiveElements.map(el => el.id)
                    }
                }
            })).map(el => el.index);

            // logger.info(`positive tweet indices for stage ${job.data.modelConfig.forStage}, ${positiveTweetIndices}`)

            let positiveTweetIds = (await db.Tweet.findAll({
                attributes: ['id'],
                where: {
                    index: {
                        [Op.in]: positiveTweetIndices
                    }
                }
            })).map(el => el.id);

            // logger.info(`positive tweet ids for stage ${job.data.modelConfig.forStage}: ${positiveTweetIds}`)

            //fetching all tweets that belong to the same stage for which the model is training or that are in the seeding stage
            let allTweets = await db.Tweet.findAll({
                where: {
                    [Op.or]: [{
                        id: {    
                            [Op.in]: result.tweetsForStage   
                        }
                        }, {
                            preTask: true

                        }]
                    
                    },
                include: [{
                    model: db.AccuracyLabel,
                    as: 'TweetAccuracyLabels',
                    where: {
                        userId: job.data.userId
                    },
                    required: false
                }]
            });

            await modelConfigProm;

            // logger.info(`this is iteration ${modelConfig.iteration} for stage ${job.data.modelConfig.forStage}`)
            // logger.info(`positive tweets given by model for stage $ {job.data.modelConfig.forStage}: ${positiveTweetIds}`);
            // logger.info(`Accuracy labels length for all tweets ${allTweets.map(tweet => [tweet.id, tweet.TweetAccuracyLabels.length])}`);
            
            tweetsWChangedLabels = allTweets.filter(tweet => tweet.TweetAccuracyLabels.length == 0 ||
                (tweet.TweetAccuracyLabels.filter(label => label.assessor == 0).length == 0 && 
                ( (positiveTweetIds.includes(tweet.id) && tweet.TweetAccuracyLabels.find(label=> label.version == 1).value == 0) || 
                    (!positiveTweetIds.includes(tweet.id) && tweet.TweetAccuracyLabels.find(label=> label.version == 1).value == 1) )));

            // logger.info(`for which tweets accuracy labels need to be changed, previous label length: ${tweetsWChangedLabels.map(el => [el.id, el.TweetAccuracyLabels.length ? el.TweetAccuracyLabels.filter(label=> label.version == 1)[0].value : 'nothing ' ])}`)

            let preUserAssessmentProms = tweetsWChangedLabels
            .map(tweet => {

                let iterationProms = []
                if (tweet.TweetAccuracyLabels.length) {
                    // logger.info(`updating old labels for tweet ${tweet.id}`)
                    iterationProms.push(...(tweet.TweetAccuracyLabels.map(oldLabel => {
                        // logger.info(`this is label ${oldLabel.id}`)
                        let newVersion = oldLabel.version - 1
                        oldLabel.update({ version: newVersion });

                        return oldLabel.save();
                    })));
                }

                let value = positiveTweetIds.includes(tweet.id) ? 1 : 0;

                iterationProms.push(db.AccuracyLabel.create({
                    version: 1,
                    assessor: 1,
                    value: value,
                    stage: job.data.modelConfig.forStage,
                    changedLastInIteration: modelConfig.iteration
                })
                .then((newLabel) => {
                    return Promise.all([
                        user.addUserAccuracyLabels(newLabel),
                        newLabel.setUser(user),
                        tweet.addTweetAccuracyLabels(newLabel)
                    ])
      
                }))

                return iterationProms;
            });


            tweetsWGroundTruthAndConflictingPred = allTweets.filter(tweet => tweet.TweetAccuracyLabels.filter(label => label.assessor == 0).length > 0 && (
                (positiveTweetIds.includes(tweet.id) && 
                 tweet.TweetAccuracyLabels.find(label => label.version == Math.max(...(tweet.TweetAccuracyLabels.map(label => label.version)))).value == 0)
                  || 
                (!positiveTweetIds.includes(tweet.id) && tweet.TweetAccuracyLabels.find(label=> label.version == Math.max(...(tweet.TweetAccuracyLabels.map(label => label.version)))).value == 1) 
            ));

            let postUserAssessmentProms = tweetsWGroundTruthAndConflictingPred
            .map(tweet => {
                let value = positiveTweetIds.includes(tweet.id) ? 1 : 0;

                let maxVersion = Math.max(...(tweet.TweetAccuracyLabels.map(label => label.version)));

                return db.AccuracyLabel.create({
                    version: maxVersion + 1,
                    assessor: 1,
                    value: value,
                    stage: job.data.modelConfig.forStage,
                    changedLastInIteration: modelConfig.iteration
                })
                .then((newLabel) => {
                    return Promise.all([
                        user.addUserAccuracyLabels(newLabel),
                        newLabel.setUser(user),
                        tweet.addTweetAccuracyLabels(newLabel)
                    ])
      
                })
            })
            

            let promsArr = [...preUserAssessmentProms.flat(), ...postUserAssessmentProms]
            await Promise.all(promsArr);

            // logger.info('\n')
        }

        let socketKey = '' + job.data.userId;
        if (socketKey in userIdSocketMapping) {
            if (tweetsWChangedLabels.length && userCondition.stage == job.data.modelConfig.forStage) {
                userIdSocketMapping[socketKey].send( Buffer.from(JSON.stringify({
                    type: 'new_labels',
                    data: tweetsWChangedLabels.filter(tweet => tweet.preTask == false).map(el => el.id)
                })));
            }

            // console.log('in result', result.nextToLabels)
            // if (result.nextToLabels.length & userCondition.stage == job.data.modelConfig.forStage) { 
            //     userIdSocketMapping[socketKey].send( Buffer.from(JSON.stringify({
            //         type: 'next_to_labels',
            //         data: result.nextToLabels.map(el => el.id)
            //     })));
            // }
        }
        else {
            //the user has disconnected from the ws, so we stop the job for this user
            logger.info(`removing the job ${JSON.stringify(job)} because user ${job.data.userId} is no longer connected to the ws`)
            await predictionsQueue.removeRepeatableByKey(job.opts.repeat.key);
        }

    }))

}

module.exports = {
    processRealTimeQueue
}