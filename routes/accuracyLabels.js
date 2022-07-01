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
// const { use } = require('passport');



router.route('/accuracy-label/:tweet_id')
.get(routeHelpers.isLoggedIn, wrapAsync(async function(req, res) {

    // let user = await db.User.findByPk(req.user.id);
    // let userCondition = (await user.getUserConditions({
    //     where: {
    //       version: 1
    //     }
    //   }))[0];

    let accuracyLabel = await db.AccuracyLabel.findOne({
        where: {
            UserId: {
                [Op.eq]: req.user.id
            },
            TweetId: {
                [Op.eq]: req.params.tweet_id
            },
            version: 1,
            // condition: userCondition.stage
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
            stage: userCondition.stage
        }
    });

    let returnedLabel;

    if (req.body.reason) {
        console.log('existing labels', existingAccuracyLabels)

        let mostRecentLabel = existingAccuracyLabels.filter(label => label.version == 1)[0];
        mostRecentLabel.reason = req.body.reason;
        await mostRecentLabel.save();
        returnedLabel = mostRecentLabel;
    }
    else {

        let tweetPrevLabelsProms = existingAccuracyLabels.map(label => {
            label.version = label.version - 1;
            return label.save();
        })
    
        await Promise.all(tweetPrevLabelsProms);
    
        
        let newTweetLabel = await db.AccuracyLabel.create({
            assessor: 0,
            value: req.body.value,
            version: 1,
            stage: userCondition.stage
        });
        
        let tweet = await tweetProm;
    
        let associationProms = [user.addUserAccuracyLabels(newTweetLabel), newTweetLabel.setUser(user), tweet.addTweetAccuracyLabels(newTweetLabel)];
        await Promise.all(associationProms);

        console.log('user stage is', userCondition.stage)
       
        if (userCondition.stage == 0) {
            for (let stage of [1, 2])
                util.submitTrainingData(req.user.id, {tweetId: req.params.tweet_id, value: req.body.value}, stage);
        }
        else {
            util.submitTrainingData(req.user.id, {tweetId: req.params.tweet_id, value: req.body.value}, userCondition.stage);
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