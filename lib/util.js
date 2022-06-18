var db  = require('../models');
var Sequelize = require('sequelize');
const Op = Sequelize.Op;

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function dummyFetchModel(workspace) {

    let items = [1]
    return new Promise((resolve) => {
        setTimeout(function() {
            let hasModelChanged = items[Math.floor(Math.random()*items.length)];
            console.log('has model changed', hasModelChanged)
            resolve(hasModelChanged);
        }, 3000)
    })
    
}

async function fetchPositiveLabels(userId) {

    let labeledTweets = await db.Tweet.findAll({
        where: {
            '$TweetAccuracyLabels.UserId$': {
                [Op.eq]: userId
            },
            preTask: 0
        },
        include: [{
            model:  db.AccuracyLabel,
            as: 'TweetAccuracyLabels',
            where: {
                version: 1,
                AIAssigned: 0
            }
        }]
    })

    let labeledTweetIds = labeledTweets.map(tweet => tweet.id);
    let unlabeledTweets = await db.Tweet.findAll({
        where: {
            id: {
                [Op.notIn]: labeledTweetIds
            }
        }
    })
    console.log('unlabeled tweets', unlabeledTweets)

    let newtweetLabels = unlabeledTweets.map(tweet => {
        return {
            tweet: tweet.id,
            label: getRandomInt(0, 2)
        }
    })

    return newtweetLabels.filter(el => el.label == 1);
}

function dummyRelabel(userId, newLabels) {

}

async function submitTrainingData(userId, newLabels) {

    dummyRelabel(userId, newLabels); //TODO: change this to call the sleuth API. It should also probably be in a different process so the main process wouldn't need to wait on it
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
    dummyFetchModel,
    fetchPositiveLabels,
    makeRandomId
}