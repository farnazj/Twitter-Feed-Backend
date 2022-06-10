var db  = require('../models');
var Sequelize = require('sequelize');
const Op = Sequelize.Op;

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function dummyRelabel(tweetsWUserLabels) {

    let unlabeledTweets = await db.Tweet.findAll({
        where: {
            version: 1,
            AIAssigned: 1
        }
    });

    let newtweetLabels = unlabeledTweets.map(tweet => {
        return {
            tweet: tweet.id,
            label: getRandomInt(-1, 2)
        }
    })

    return newtweetLabels;
}

async function submitTrainingData(userId) {

    let tweetsWUserLabels = await db.Tweet.findAll({
        //TODO: find out if sleuth wants the whole training labels or just the updated ones
        include: [{
            model: db.AccuracyLabel,
            as: 'TweetAccuracyLabels',
            where: {
                version: 1,
                AIAssigned: 0,
                UserId: {
                    [Op.eq]: userId
                }
            }
        }]
    })

    let newAILabels = await dummyRelabel(tweetsWUserLabels); //TODO: change this to call the sleuth API. It should also probably be in a different process so the main process wouldn't need to wait on it

}



module.exports = {
    submitTrainingData
}