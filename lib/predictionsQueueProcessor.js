const Queue = require('bull');
const util = require('../lib/util');
var wrapAsync = require('../lib/wrappers').wrapAsync;
const db = require('../models');
var path = require('path');
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

        console.log(modelChanged, 'model changed')

        if (modelChanged)
            returnedLabels = await util.fetchPositiveLabels(job.data.userId);
        done( null, {
            modelChanged: modelChanged,
            labelObjs: returnedLabels }); 
    });


    predictionsQueue.on('completed', wrapAsync(async (job, result) => {
        
        if (result.modelChanged) {

            console.log(job.data, 'job', result)
            let user = await db.User.findByPk(job.data.userId);

            let modelConfig = await user.getModelConfig();
            modelConfig.iteration += 1;
            let modelConfigProm = modelConfig.save();

            let tweetIds = result.labelObjs.map(el => el.tweet);

            let allTweets = await db.Tweet.findAll({
                where: {
                    preTask: 0
                },
                include: [{
                    model: db.AccuracyLabel,
                    as: 'TweetAccuracyLabels',
                    where: {
                        UserId: job.data.userId,
                        version: 1
                    },
                    required: false
                }]
            });
            
            let allProms = allTweets.filter(tweet => !tweet.TweetAccuracyLabels.length ||
                (tweet.TweetAccuracyLabels[0].AIAssigned == 0 && tweetIds.includes(tweet.id)))
            .map(tweet => {

                let iterationProms = []
                if (tweet.TweetAccuracyLabels.length) {
                    iterationProms.push(...(tweet.TweetAccuracyLabels.map(accuracyLabel => {
                        accuracyLabel.version = accuracyLabel.version - 1;
                        return accuracyLabel.save();
                    })));
                }

                let value = tweetIds.includes(tweet.id) ? result.labelObjs.filter(el => el.tweet == tweet.id)[0].label :
                    0;
                iterationProms.push(db.AccuracyLabel.create({
                    version: 1,
                    AIAssigned: 1,
                    value: value
                })
                .then((newLabel) => {
                    return Promise.all([
                        user.addUserAccuracyLabels(newLabel),
                        newLabel.setUser(user),
                        tweet.addTweetAccuracyLabels(newLabel)
                    ])
      
                }))

            })
            

            console.log(allProms.flat(), modelConfigProm)
            let promsArr = [...allProms.flat(), modelConfigProm]
            await Promise.all(promsArr);
    
            console.log('socket mapping', userIdSocketMapping)
            console.log(job.data, result)
            userIdSocketMapping['' + job.data.userId].send( Buffer.from(JSON.stringify({
                type: 'new_labels',
                data:result.labelObjs
            })));
        }
       

    }))

}

module.exports = {
    processRealTimeQueue
}