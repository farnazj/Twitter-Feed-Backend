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
const { use } = require('passport');


router.route('/bulk-accuracy-labels') //for the pre-task
.post(routeHelpers.isLoggedIn, wrapAsync(async function(req, res) {

    let user = await db.User.findByPk(req.user.id);

    user.completedPreTask = true;
    user.save();

    let labelProms = Object.entries(req.body.labels).map( ([tweetId, labelObj]) => {
       return Promise.all([
            db.AccuracyLabel.create({
                AIAssigned: 0,
                value: labelObj.value,
                reason: labelObj.reason,
                version: 1,
                condition: user.condition
            }),
            db.Tweet.findByPk(tweetId)
        ])
        .then((results) => {
            let newTweetLabel = results[0];
            let tweet = results[1];
            return Promise.all([user.addUserAccuracyLabels(newTweetLabel),
                newTweetLabel.setUser(user), 
                tweet.addTweetAccuracyLabels(newTweetLabel)]);
        })
    });

    let newLabels = await Promise.all(labelProms);

    let modelConfig = (await user.getUserModelConfigs({
        where: {
            condition: user.condition
        }
    }))[0];

    console.log(modelConfig, 'model config')

    util.submitTrainingData(req.user.id, newLabels);

    //initialize checking for updates from the model
    predictionsQueue.add({
        userId: req.user.id,
        modelConfig: modelConfig
    }, {
        repeat: {
            every: 10000
        }
    });

    res.send({ message: 'Labels updated' });
}));   

router.route('/accuracy-label/:tweet_id')
.get(routeHelpers.isLoggedIn, wrapAsync(async function(req, res) {

    let user = await db.User.findByPk(req.user.id);
    let condition = user.condition;

    let accuracyLabel = await db.AccuracyLabel.findOne({
        where: {
            UserId: {
                [Op.eq]: req.user.id
            },
            TweetId: {
                [Op.eq]: req.params.tweet_id
            },
            version: 1,
            condition: condition
        }
    });

    res.send(accuracyLabel);
}))

.post(routeHelpers.isLoggedIn, wrapAsync(async function(req, res) {

    let user = await db.User.findByPk(req.user.id);
    let tweetProm = db.Tweet.findByPk(req.params.tweet_id);

    let existingAccuracyLabels = await db.AccuracyLabel.findAll({
        where: {
            UserId: {
                [Op.eq]: req.user.id
            },
            TweetId: {
                [Op.eq]: req.params.tweet_id
            },
            condition: user.condition
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
            AIAssigned: 0,
            value: req.body.value,
            version: 1,
            condition: user.condition
        });
        
        let tweet = await tweetProm;
    
        let associationProms = [user.addUserAccuracyLabels(newTweetLabel), newTweetLabel.setUser(user), tweet.addTweetAccuracyLabels(newTweetLabel)];
        await Promise.all(associationProms);
        util.submitTrainingData(req.user.id);
        
        returnedLabel = newTweetLabel;
    }



    res.send({ message: 'updated', data: returnedLabel });

}))

module.exports = router;