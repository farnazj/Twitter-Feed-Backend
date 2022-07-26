var db  = require('../models');
var Sequelize = require('sequelize');
const Op = Sequelize.Op;
var sleuthServices = require('../lib/sleuthServices');
const logger = require('../lib/logger');

//min and max inclusive
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
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
                assessor: 0
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


async function submitTrainingData(userId, tweetId, newLabelValue, whichModel) {

    let modelConfigProm = db.ModelConfig.findOne({
        where: {
            forStage: whichModel,
            UserId: userId
        }
    });

    let tweet = await db.Tweet.findByPk(tweetId);
    let tweetElementMapping = await db.TweetElementMapping.findOne({
        where: {
            index: tweet.index,
            UserId: userId
        }
    });

    let workspace = (await modelConfigProm).workspace;
    let valueText = newLabelValue ? 'true' : 'false';
    // logger.info(`going to set element label ${workspace}, ${tweetElementMapping.assignedId}, ${valueText}`)


    sleuthServices.setElementLabel({
        workspaceName: workspace,
        elementId: tweetElementMapping.assignedId,
        value: valueText
    })
    .then(() => {
        sleuthServices.getLabelingStatus(workspace)
        .then((labelingStatusResp) => {
            // logger.info(`\nlabeling status for the model for stage ${workspace} : ${JSON.stringify(labelingStatusResp.data)}`);
        })
    })
    
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

function getUsername(user) {
    return user.workerId.substring(0, 5);
}

async function modelSetup(user) {

    try {
        let workspaceProms = [];
        let configProms = [];
        for (let stage of [1, 2]) {
    
            let modelConfigProm = db.ModelConfig.create({
                forStage: stage,
                workspace: getUsername(user) + '_' + makeRandomId(5) + '_' + stage,
            })
            configProms.push(modelConfigProm)
    
            workspaceProms.push(
            modelConfigProm
            .then((modelConfig) => {
                return Promise.all([
                    sleuthServices.registerWorkspace(modelConfig.workspace).then(() => {
                        return sleuthServices.createCategory(modelConfig.workspace)
                        .catch(err => logger.error(err))
                    }),
                    user.addUserModelConfig(modelConfig)]);
            }))
      
        }

        let configs = await Promise.all(configProms);

        await Promise.all(workspaceProms);

        let configSample = configs[0];

        let documentSetupProm = sleuthServices.getDocumentId(configSample.workspace).then((resp) => {
            let docId = resp.data.documents[0].document_id;

            configs[0].documentId = docId;
            configs[1].documentId = docId;

            return Promise.all([ sleuthServices.getDocumentElements({ 
                workspaceName: configSample.workspace,
                documentId: docId
            })
            .then((elementsResp) => {
                let elements = elementsResp.data.elements;

                let elementProms = elements.map((element, index) => {
                    return db.TweetElementMapping.create( {
                        assignedId: element.id,
                        index: index
                    })
                    .then(elementMapping => {
                        return elementMapping.setUser(user);
                    })

                    //TODO: associate with tweets?
                })

                return Promise.all(elementProms);
            })
            ,
                configs[0].save(),
                configs[1].save()
            ]);
        })

        await documentSetupProm;

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
                    jobId: `stage${index + 1}-modelcheck-user${user.id}`,
                    removeOnComplete: true
                }
           )
        }
    
        let jobs = await predictionsQueue.getJobs();
        // return Promise.all(proms);
    }
    catch(err) {
        console.error(err);
    }
    
}


async function getNextToLabel(userId, modelConfig, tweetsForStage) {
    let elementsToLabel = (await sleuthServices.getNextToLabel({
        workspaceName: modelConfig.workspace
    })).data.elements.map(el => el.id);

    let tweetsIndices = (await db.TweetElementMapping.findAll({
        attributes: ['index'],
        where: {
            assignedId: {
                [Op.in]: elementsToLabel
            }
        }
    })).map(el => el.index);
    
    let tweets = (await db.Tweet.findAll({
        where: {
            [Op.and]: [{
                id: {
                    [Op.in]: tweetsForStage
                }
            }, {
                index: tweetsIndices
            }]
        },
        include: [{
            model: db.AccuracyLabel,
            as: 'TweetAccuracyLabels',
            where: {
                userId: userId,
            },
            required: false
        }]
    })).filter(tweet => tweet.TweetAccuracyLabels.length == 0 || (tweet.TweetAccuracyLabels.filter(label => label.assessor == 0).length == 0 ));

    return tweets;
}

module.exports = {
    getRandomInt,
    submitTrainingData,
    fetchPositiveLabels,
    makeRandomId,
    advanceStage,
    modelSetup,
    getUsername,
    shuffleArray,
    getNextToLabel
}