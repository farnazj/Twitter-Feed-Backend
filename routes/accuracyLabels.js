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


router.route('/bulk-accuracy-labels') //for the pre-task
.post(routeHelpers.isLoggedIn, wrapAsync(async function(req, res) {

    let user = await db.User.findByPk(req.user.id);

    let labelProms = req.body.labels.map(label => {
       return Promise.all([
            db.AccuracyLabel.create({
                AIAssigned: 0,
                value: label.value,
                reason: label.reason,
                version: 1
            }),
            db.Tweet.findByPk(label.tweetId)
        ])
        .then((results) => {
            let newTweetLabel = results[0];
            let tweet = results[1];
            return Promise.all([user.addUserAccuracyLabels(newTweetLabel), tweet.addTweetAccuracyLabels(newTweetLabel)]);
        })
    });

    await Promise.all(labelProms);

    util.submitTrainingData(req.user.id);
    res.send({ message: 'Labels updated' });
}));   

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
            version: 1
        }
    });

    res.send(accuracyLabel);
}))

.post(routeHelpers.isLoggedIn, wrapAsync(async function(req, res) {

    let userProm = db.User.findByPk(req.user.id);
    let tweetProm = db.Tweet.findByPk(req.tweet.id);

    let existingAccuracyLabels = await db.AccuracyLabel.findAll({
        where: {
            UserId: {
                [Op.eq]: req.user.id
            },
            TweetId: {
                [Op.eq]: req.params.tweet_id
            }
        }
    });

    let tweetPrevLabelsProms = existingAccuracyLabels.map(label => {
        label.version = label.version - 1;
        return label.save();
    })

    await Promise.all(tweetPrevLabelsProms);

    
    let newTweetLabel = await AccuracyLabel.create({
        AIAssigned: 0,
        value: req.body.value,
        reason: req.body.reason,
        version: 1
    });
    
    let [user, tweet] = await Promise.all([userProm, tweetProm]);

    let associationProms = [user.addUserAccuracyLabels(newTweetLabel), tweet.addTweetAccuracyLabels(newTweetLabel)];


}))

module.exports = router;