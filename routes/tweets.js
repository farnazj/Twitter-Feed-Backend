var express = require('express');
var router = express.Router();
var db  = require('../models');
var wrapAsync = require('../lib/wrappers').wrapAsync;
var Sequelize = require('sequelize');
const Op = Sequelize.Op;
var constants = require('../lib/constants');
var db  = require('../models');
const logger = require('../lib/logger');
var routeHelpers = require('../lib/routeHelpers');
const user = require('../models/user');
const { where } = require('sequelize');


router.route('/tweets-count')
.get(routeHelpers.isLoggedIn, wrapAsync(async function(req, res) {
    let user = await db.User.findByPk(req.user.id);
  
    let userConditions = await user.getUserConditions();
    let currentStage = userConditions.find(condition => condition.version == 1).stage;
    let whereStatement;

    if (currentStage == 0) {
        whereStatement = {
            preTask: 1
        }
    }
    else {
        let tweetStageMapping = JSON.parse((await user.getTweetStage()).mappingsBlob);
        let tweetsForStage = Object.entries(tweetStageMapping).filter(([tweetId, stage]) => stage == currentStage).map(el => parseInt(el[0]));
        whereStatement = {
            id: {
                [Op.in]: tweetsForStage
            }
        }
    }

    let count = (await db.Tweet.findAll({
        where: whereStatement
    })).length;
    
    res.send({data: count});
}));

router.route('/tweets')
.get(routeHelpers.isLoggedIn, wrapAsync(async function(req, res) {
    let paginationReq = routeHelpers.getLimitOffset(req);

    let user = await db.User.findByPk(req.user.id);
  
    let userConditions = await user.getUserConditions();
    let mostRecentCondtion = userConditions.find(condition => condition.version == 1);

    let tweetStageMapping = JSON.parse((await user.getTweetStage()).mappingsBlob);
    let tweetsForStage = Object.entries(tweetStageMapping).filter(([tweetId, stage]) => stage == mostRecentCondtion.stage).map(el => parseInt(el[0]));

    let tweets;

    let whereConfig = {};
    if (mostRecentCondtion.stage == 0) {
        whereConfig = {
            preTask: {
                [Op.eq]: true
            }
        }
    }
    else {
        whereConfig = {
            id: {
                [Op.in]: tweetsForStage
            }
        }
    }

    if (mostRecentCondtion.stage <= 1) {

        tweets = await db.Tweet.findAll({
            where: whereConfig,
            include:[{
                model: db.TweetSource,
            }, {
                model: db.Media,
                as: 'TweetMedia',
                required: false
            }],
            ...paginationReq
        });
    }
    else {

        tweets = await db.Tweet.findAll({
            where: whereConfig,
            include: [{
                model: db.AccuracyLabel,
                as: 'TweetAccuracyLabels',
                where: {
                    UserId: {
                        [Op.eq]: req.user.id
                    },
                    version: 1
                }
            }, {
                model: db.TweetSource
            }, {
                model: db.Media,
                as: 'TweetMedia',
                required: false
            }],
            ...paginationReq
        });    

    }

    db.FeedDeliveryLog.create({
        userId: req.user.id,
        stage: mostRecentCondtion.stage,
        limit: paginationReq.limit,
        offset: paginationReq.offset,
        tweetIds: JSON.stringify(tweets.map(tweet => tweet.id))
    })
    
    res.send(tweets);
}));

module.exports = router;