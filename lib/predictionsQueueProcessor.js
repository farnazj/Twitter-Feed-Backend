const Queue = require('bull');
const util = require('../lib/util');
const db = require('../models');
var path = require('path');
require('dotenv').config({ path: path.join(__dirname,'/../.env') });

predictionsQueue = new Queue('check-AI-predictions', `${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);

function processRealTimeQueue(userIdSocketMapping) {

    predictionsQueue.process( async function (job, done) {

        //TODO: check thru the API to see if relabeling is done

        let returnedLabels = await util.dummyFetchRelabels(job.data.userId);
        done( null, { userId: job.data.userId, labelObjs: returnedLabels }); 
    });


    predictionsQueue.on('completed', async (job, result) => {
        
        let user = await db.User.findByPk(job.userId);
        let allProms = result.labelObjs.map(labelObj => {
            return Promise.all([
                db.AccuracyLabel.findAll({
                    where: {
                        UserId: job.userId,
                        TweetId: labelObj.tweet
                    }
                })
                ,
                db.Tweet.findByPk(labelObj.tweet)
            ])
            .then(results => {
                let prevAccuracyLabels = results[0];
                let tweet = results[1];

                let proms = [];
                if (prevAccuracyLabels.length) {
                    proms = prevAccuracyLabels.map(label => {
                        label.version = label.version - 1;
                        return label.save();
                    })
                }
                return db.AccuracyLabel.create({
                    version: 1,
                    AIAssigned: 1,
                    value: labelObj.label
                })
                .then(newLabel => {
                    proms.extend([
                        user.addUserAccuracyLabels(newLabel),
                        newLabel.setUser(user),
                        tweet.addTweetAccuracyLabels(newLabel)]);
                    return Promise.all(proms);
                })

            })
        
        })

        await Promise.all(allProms.flat());
        
        userIdSocketMapping[job.userId].send({
            type: 'new_labels',
            data: JSON.stringify(result.labelObjs)
        });

    })

}

module.exports = {
    processRealTimeQueue
}