var express = require('express');
var router = express.Router();
var db  = require('../models');
var wrapAsync = require('../lib/wrappers').wrapAsync;
var Sequelize = require('sequelize');
const Op = Sequelize.Op;
var constants = require('../lib/constants');
var db  = require('../models');
const logger = require('../lib/logger');
var util = require('../lib/util');
var routeHelpers = require('../lib/routeHelpers');

router.route('/accuracy-label/:tweet_id')
.get(routeHelpers.isLoggedIn, wrapAsync(async function(req, res) {

    let accuracyLabel = await db.AccuracyLabel.findOne({
        where: {
            UserId: {
                [Op.eq]: req.user.id
            },
            TweetId: {
                [Op.eq]: req.params.tweet_id
            },
            version: 1,
        }
    });

    res.send(accuracyLabel);
}))

.post(routeHelpers.isLoggedIn, wrapAsync(async function(req, res) {

    let user = await db.User.findByPk(req.user.id);
    let userCondition = (await user.getUserConditions({
        where: {
          version: 1
        }
      }))[0];


    let tweetProm = db.Tweet.findByPk(req.params.tweet_id);

    let existingAccuracyLabels = await db.AccuracyLabel.findAll({
        where: {
            UserId: {
                [Op.eq]: req.user.id
            },
            TweetId: {
                [Op.eq]: req.params.tweet_id
            },
            stage: userCondition.stage,
            version: {
                [Op.lte]: 1
            }
        }
    });

    let returnedLabel;

    if ('reason' in req.body || 'confidence' in req.body) {

        let mostRecentLabel = existingAccuracyLabels.filter(label => label.version == 1)[0];

        let updates = {};
        if ('reason' in req.body)
            updates.reason = req.body.reason;
        if ('confidence' in req.body)
            updates.confidence = req.body.confidence;
        
        mostRecentLabel.update(updates);

        await mostRecentLabel.save();
        returnedLabel = mostRecentLabel;
    }
    else {

        let mostRecentLabelByUser = existingAccuracyLabels.find(label => label.version == 1 && label.assessor == 0);

        let extraData = {};
        if (mostRecentLabelByUser) {
            extraData.confidence = mostRecentLabelByUser.confidence;
            extraData.reason = mostRecentLabelByUser.reason;
        }

        /*
        To record what iteration the model had had when the accuracy label was posted by the user.
        Can help determine if the model would have had a similar accuracy prediction had the user
        given it enough time to be updated in case the model had had enough datapoints for training
        the next iteration but just not enough time to do so before the user updated the accuracy
        assessment of a tweet.
        */
        let ConfigforStage = userCondition.stage == 0 ? 1 : userCondition.stage;
            
            let modelConfig = (await user.getUserModelConfigs({
                where: {
                    forStage: ConfigforStage
                }
            }))[0];

        let changedLastInIteration = modelConfig.iteration;
        
        
        let newTweetLabel = await db.AccuracyLabel.create({
            assessor: 0,
            value: req.body.value,
            version: 1,
            stage: userCondition.stage,
            timeSinceFeedLoaded: req.body.timeSinceFeedLoaded,
            changedLastInIteration: changedLastInIteration,
            ...extraData
        });
        
        let tweet = await tweetProm;
    
        let associationProms = [user.addUserAccuracyLabels(newTweetLabel), newTweetLabel.setUser(user), tweet.addTweetAccuracyLabels(newTweetLabel)];
        await Promise.all(associationProms);

        let tweetPrevLabelsProms = existingAccuracyLabels.map(label => {
            label.version = label.version - 1;
            return label.save();
        })
    
        await Promise.all(tweetPrevLabelsProms);
 
        // logger.info(`in label accuracy route, ${JSON.stringify(req.body)}, user condition is : ${JSON.stringify(userCondition)}`)
       
        if (userCondition.stage == 0) {
            for (let stage of [1, 2])
                util.submitTrainingData(req.user.id, req.params.tweet_id, req.body.value, stage);
        }
        else {
            util.submitTrainingData(req.user.id, req.params.tweet_id, req.body.value, userCondition.stage);
        }
        
        returnedLabel = newTweetLabel;
    }

    res.send({ message: 'updated', data: returnedLabel });

}));


router.route('/labels-ready/:stage')
.get(routeHelpers.isLoggedIn, wrapAsync(async function(req, res) {
    let user = await db.User.findByPk(req.user.id);

    let tweetStageMapping = JSON.parse((await user.getTweetStage()).mappingsBlob);
    let tweetsForStage = Object.entries(tweetStageMapping).filter(([tweetId, stage]) => stage == req.params.stage).map(el => parseInt(el[0]));

    let tweets = await db.Tweet.findAll({
        where: {
            id: {
                [Op.in]: tweetsForStage
            }
        },
        include: [{
            model: db.AccuracyLabel,
            as: 'TweetAccuracyLabels',
            where: {
                UserId: {
                    [Op.eq]: req.user.id
                }
            }
        }]
    })

    if (tweets.length)
        res.send(true);
    else
        res.send(false);
}));

module.exports = router;