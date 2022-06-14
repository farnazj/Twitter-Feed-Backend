var db  = require('../models');
var Sequelize = require('sequelize');
const Op = Sequelize.Op;

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function dummyFetchRelabels(userId) {

    let unlabeledTweets = await db.Tweet.findAll({
        where: {    
            '$AccuracyLabel.UserId$': {
                [Op.eq]: userId
            }
        },
        include: [{
            model: db.AccuracyLabel,
            as: 'TweetAccuracyLabels',
            where: {
                version: 1,
                AIAssigned: 1
            }
        }]
    });

    let newtweetLabels = unlabeledTweets.map(tweet => {
        return {
            tweet: tweet.id,
            label: getRandomInt(-1, 2)
        }
    })

    return newtweetLabels;
}

function dummyRelabel(tweetsWUserLabels) {

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

    dummyRelabel(tweetsWUserLabels); //TODO: change this to call the sleuth API. It should also probably be in a different process so the main process wouldn't need to wait on it
    predictionsQueue.add({
        userId: userId
    });

}


function makeRandomId(length) {
    let result           = '';
    let characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for ( let i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}


module.exports = {
    submitTrainingData,
    dummyFetchRelabels,
    makeRandomId
}