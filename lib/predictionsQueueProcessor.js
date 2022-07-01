const Queue = require('bull');
const util = require('../lib/util');
var wrapAsync = require('../lib/wrappers').wrapAsync;
const db = require('../models');
var path = require('path');
var Sequelize = require('sequelize');
const logger = require('../lib/logger');
const Op = Sequelize.Op;
require('dotenv').config({ path: path.join(__dirname,'/../.env') });

predictionsQueue = new Queue('check-AI-predictions', `${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);

function processRealTimeQueue(userIdSocketMapping) {

    predictionsQueue.process( async function (job, done) {

        //TODO: check thru the API to see if relabeling is done
        let dummyFetchModel = await util.dummyFetchModel(job.data.modelConfig.workspace);
        //if (dummyFetchModel.maxIteration > job.data.modelConfig.iteration)
            //fetchlabels()

        let modelChanged = dummyFetchModel;
        let returnedLabels;

        console.log( 'model changed?', modelChanged, 'for model', job.data.modelConfig.forStage)

        if (modelChanged)
            returnedLabels = await util.fetchPositiveLabels(job.data.userId);
        done( null, {
            modelChanged: modelChanged,
            labelObjs: returnedLabels }); 
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

            let positiveTweetIds = result.labelObjs.map(el => el.tweet);

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
            logger.info(`this is iteration ${modelConfig.iteration}`)
            logger.info(`positive tweets given by model ${positiveTweetIds}`);
            logger.info(`Accuracy labels length for all tweets ${allTweets.map(tweet => [tweet.id, tweet.TweetAccuracyLabels.length])}`);
            
            
            console.log('positive tweets given by model', positiveTweetIds);
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