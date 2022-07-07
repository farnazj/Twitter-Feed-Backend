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


predictionsQueue = new Queue('check-AI-predictions', `${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);

function processRealTimeQueue(userIdSocketMapping) {

    predictionsQueue.process( async function (job, done) {

        let labelingStatus = (await sleuthServices.getLabelingStatus(job.data.modelConfig.workspace)).data;
        logger.info(`\nlabeling status for the model for stage ${job.data.modelConfig.workspace} : ${JSON.stringify(labelingStatus)}`);
        
        let models = (await sleuthServices.getModels(job.data.modelConfig.workspace)).data.models;
        // console.log('models for stage', job.data.modelConfig.forStage, "***", models)
        logger.info(`models for stage ${job.data.modelConfig.forStage} : ${JSON.stringify(models)}`)

        let userModelConfig = (await db.ModelConfig.findOne({
            where: {
                forStage: job.data.modelConfig.forStage,
                UserId: job.data.userId
            }
        }));

        logger.info(`latest user config for stage ${job.data.modelConfig.forStage}: ${JSON.stringify(userModelConfig)}`);

        let newestModels = models.filter(model => model.iteration > userModelConfig.iteration);
        // console.log('newest models', newestModels)
        logger.info(`newest models: ${JSON.stringify(newestModels)}`)

        let modelChanged = false;
        let positiveElements = [];

        if (newestModels.length) {
            if (newestModels.length > 1) {
                logger.info(`missed some number of iterations: ${newestModels.length}`);
            }

            modelChanged = true;
            positiveElements = (await sleuthServices.getPositivePredictions({
                workspaceName: job.data.modelConfig.workspace,
                documentId: job.data.modelConfig.documentId
            })).data.elements;
            
            // console.log('positive elements are',  positiveElements.map(el => el.id))
            logger.info(`'positive elements are ${positiveElements.map(el => el.id)}`);

        }

        logger.info( `model changed? ${modelChanged}, for model: ${job.data.modelConfig.forStage}`);

        done( null, {
            modelChanged: modelChanged,
            positiveElements: positiveElements }); 
    });


    predictionsQueue.on('failed', wrapAsync(async (job, result) => {
        console.log('job failed', job.name, job.failedReason, '\n\n')

    }))


    predictionsQueue.on('completed', wrapAsync(async (job, result) => {
        
        if (result.modelChanged) {

            console.log(job.data, 'job', result)
            let user = await db.User.findByPk(job.data.userId);
            let userCondition = (await user.getUserConditions({
                where: {
                  version: 1
                }
              }))[0];

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

            // console.log('positive tweet indices for stage', job.data.modelConfig.forStage, "****", positiveTweetIndices)
            logger.info(`positive tweet indices for stage ${job.data.modelConfig.forStage}, ${positiveTweetIndices}`)

            let positiveTweetIds = (await db.Tweet.findAll({
                attributes: ['id'],
                where: {
                    index: {
                        [Op.in]: positiveTweetIndices
                    }
                }
            })).map(el => el.id);

            // console.log('positive tweet ids', positiveTweetIds)
            logger.info(`positive tweet ids for stage ${job.data.modelConfig.forStage}: ${positiveTweetIds}`)

            let whereConfig = {};


            let tweetStageMapping = JSON.parse((await user.getTweetStage()).mappingsBlob);
            let tweetsForStage = Object.entries(tweetStageMapping).filter(([tweetId, stage]) => stage == job.data.modelConfig.forStage).map(el => parseInt(el[0]));
            whereConfig = {
                id: {
                    [Op.in]: tweetsForStage
                }
            }

            //fetching all tweets that belong to the same stage for which the model is training
            let allTweets = await db.Tweet.findAll({
                where: whereConfig,
                include: [{
                    model: db.AccuracyLabel,
                    as: 'TweetAccuracyLabels',
                    where: {
                        userId: job.data.userId,
                        // stage: job.data.modelConfig.forStage
                    },
                    required: false
                }]
            });

            await modelConfigProm;

            logger.info(`model for stage ${job.data.modelConfig.forStage}`);
            logger.info(`this is iteration ${modelConfig.iteration} for stage ${job.data.modelConfig.forStage}`)
            logger.info(`positive tweets given by model for stage ${job.data.modelConfig.forStage}: ${positiveTweetIds}`);
            logger.info(`Accuracy labels length for all tweets ${allTweets.map(tweet => [tweet.id, tweet.TweetAccuracyLabels.length])}`);
            
            
            console.log('accuracy labels length for all tweets', allTweets.map(tweet => [tweet.id, tweet.TweetAccuracyLabels.length]))

            let tweetsWChangedLabels = allTweets.filter(tweet => tweet.TweetAccuracyLabels.length == 0 ||
                (tweet.TweetAccuracyLabels.filter(label => label.assessor == 0).length == 0 && 
                ( (positiveTweetIds.includes(tweet.id) && tweet.TweetAccuracyLabels.find(label=> label.version == 1).value == 0) || 
                    (!positiveTweetIds.includes(tweet.id) && tweet.TweetAccuracyLabels.find(label=> label.version == 1).value == 1) )));

            logger.info(`what needs to be changed ${tweetsWChangedLabels.map(el => [el.id, el.TweetAccuracyLabels.length ? el.TweetAccuracyLabels.filter(label=> label.version == 1)[0].value : 'nothing' ])}`)
            console.log('what I calculated', tweetsWChangedLabels.map(el => [el.id, el.TweetAccuracyLabels.length ? el.TweetAccuracyLabels.filter(label=> label.version == 1)[0].value : 'nothing' ]))

            let allProms = tweetsWChangedLabels
            .map(tweet => {

                let iterationProms = []
                if (tweet.TweetAccuracyLabels.length) {
                    logger.info(`updating old labels for tweet ${tweet.id}`)
                    iterationProms.push(...(tweet.TweetAccuracyLabels.map(oldLabel => {
                        logger.info(`this is label ${oldLabel.id}`)
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

            })
            

            let promsArr = [...allProms.flat()]
            await Promise.all(promsArr);

            logger.info('\n')
    
            console.log('job data is ', job.data)
            console.log('user condition stage', userCondition.stage, 'modelconfig forStage', job.data.modelConfig.forStage)
            console.log('is user in socket', '' + job.data.userId in userIdSocketMapping )
            console.log('there are changed labels?', tweetsWChangedLabels.length)

            if ('' + job.data.userId in userIdSocketMapping) {
                if (tweetsWChangedLabels.length && userCondition.stage == job.data.modelConfig.forStage) {
                    console.log('is sending')
                    userIdSocketMapping['' + job.data.userId].send( Buffer.from(JSON.stringify({
                        type: 'new_labels',
                        data: tweetsWChangedLabels.map(el => el.id)
                    })));
                }
            }
            else {
                //the user has disconnected from the ws, so we stop the job for this user
                console.log('removing the job', job)
                await predictionsQueue.removeRepeatableByKey(job.opts.repeat.key);
            }

        }
       

    }))

}

module.exports = {
    processRealTimeQueue
}