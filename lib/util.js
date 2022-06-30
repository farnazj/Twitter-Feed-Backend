var db  = require('../models');
var Sequelize = require('sequelize');
const Op = Sequelize.Op;

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function dummyFetchModel(workspace) {

    let items = [1, 0]
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
            },
            preTask: 0
        }
    })

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

async function submitTrainingData(userId, newLabel, model) {

    dummyRelabel(userId, newLabel, model); //TODO: change this to call the sleuth API. It should also probably be in a different process so the main process wouldn't need to wait on it
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


async function advanceStage(userConditions, user) {

    let mostRecentCondtion = userConditions.find(condition => condition.version == 1);
    let conditionProms = userConditions.map(condition => {
        condition.version = condition.version - 1;
        return condition.save();
    });

    let newCondition = await db.Condition.create({
        version: 1,
        stage:  mostRecentCondtion.stage + 1,
        experiment: mostRecentCondtion.experiment
    });

    let allProms = [user.addUserCondition(newCondition), ...conditionProms];
    await Promise.all(allProms);
    return newCondition;
    
}

async function modelSetup(user) {

    let proms = [];
    let configProms = [];
    for (let stage of [1, 2]) {

        let modelConfigProm = db.ModelConfig.create({
            forStage: stage,
            iteration: 0, 
            workspace: user.email + '-' + makeRandomId(5) + '-' + stage
        })
        configProms.push(modelConfigProm)

        proms.push(
        modelConfigProm
        .then((modelConfig) => {
            //TODO: create sleuth workspace with workspace name equal to modelconfig.workspace
            return user.addUserModelConfig(modelConfig)
        }))
  
    }

    let configs = await Promise.all(configProms);
    console.log('config doroste?', configs)
    for (let index = 0 ; index < 2 ; index++ ) {
        await predictionsQueue.add(
            {
                userId: user.id,
                modelConfig: configs[index]
            },
            {
                repeat: {
                    every: 10000
                },
                jobId: `stage${index + 1}-modelcheck-user${user.id}`
            }
       )
    }

    let jobs = await predictionsQueue.getJobs();
    console.log('all jobs', jobs)

    return Promise.all(proms);

}

module.exports = {
    submitTrainingData,
    dummyFetchModel,
    fetchPositiveLabels,
    makeRandomId,
    advanceStage,
    modelSetup
}