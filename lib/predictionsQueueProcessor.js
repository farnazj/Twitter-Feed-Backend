const Queue = require('bull');
const util = require('../lib/util');
var wrapAsync = require('../lib/wrappers').wrapAsync;
const db = require('../models');
var path = require('path');
var Sequelize = require('sequelize');
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

        console.log( 'model changed?', modelChanged)

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
            let userCondition = (await user.getUserConditions({
                where: {
                  version: 1
                }
              }))[0];


            let modelConfig = (await user.getUserModelConfigs({
                where: {
                    condition: userCondition.value
                }
            }))[0];
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
                        condition: userCondition.value
                    },
                    required: false
                }]
            });

            await modelConfigProm;
            
            let tweetsWChangedLabels = allTweets.filter(tweet => tweet.TweetAccuracyLabels.length == 0 ||
                (tweet.TweetAccuracyLabels.filter(label => label.AIAssigned == 0).length == 0 && 
                (tweetIds.includes(tweet.id) && tweet.TweetAccuracyLabels.find(label=> label.version == 1).value == 0) || 
                    (!tweetIds.includes(tweet.id) && tweet.TweetAccuracyLabels.find(label=> label.version == 1).value == 1) ));

            console.log('positive tweets given by model', tweetIds),
            console.log('what I calculated', tweetsWChangedLabels.map(el => [el.id, el.TweetAccuracyLabels.length ? el.TweetAccuracyLabels.filter(label=> label.version == 1)[0].value : 'nothing' ]))

            let allProms = tweetsWChangedLabels
            .map(tweet => {

                let iterationProms = []
                if (tweet.TweetAccuracyLabels.length) {
                    iterationProms.push(...(tweet.TweetAccuracyLabels.map(oldLabel => {

                        let newVersion = oldLabel.version - 1
                        oldLabel.update({ version: newVersion });

                        return oldLabel.save();
                    })));
                }

                let value = tweetIds.includes(tweet.id) ? 1 : 0;

                iterationProms.push(db.AccuracyLabel.create({
                    version: 1,
                    AIAssigned: 1,
                    value: value,
                    condition: userCondition.value,
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
    
            console.log(job.data)
            if ('' + job.data.userId in userIdSocketMapping) {
                if (tweetsWChangedLabels.length) {
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