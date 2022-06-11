const Queue = require('bull');
const util = require('../util');
const db = require('../models');

const predictionsQueue = new Queue('check-AI-predictions', 'redis://127.0.0.1:6379');

function processRealTimeQueue(userIdSocketMapping) {

    predictionsQueue.process( async function (job, done) {

        //TODO: check thru the API to see if relabeling is done

        let returnedLabels = await util.dummyFetchRelabels(job.data.userId);
        done(null, { userId: job.data.userId, labelObjs: returnedLabels }); 
    });


    predictionsQueue.on('completed', (job, result) => {
        
        let user = await db.findByPk(job.userId);
        let allProms = result.labelObjs.map(labelObj => {
            Promise.all([
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
                    proms.extend([user.addUserAccuracyLabels(newLabel), tweet.addTweetAccuracyLabels(newLabel)]);
                    return Promise.all(proms);
                })

            })
        
        })

        userIdSocketMapping[job.userId].send({
            type: 'new_labels',
            data: JSON.stringify(labelObjs)
        });

    })

}

module.exports = {
    processRealTimeQueue
}