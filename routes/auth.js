var express = require('express');
var router = express.Router();
const passport = require('passport');
var db  = require('../models');
var constants = require('../lib/constants');
const logger = require('../lib/logger');
var Sequelize = require('sequelize');
const Op = Sequelize.Op;
var crypto = require('crypto');
var path = require('path');
require('dotenv').config({ path: path.join(__dirname,'/../.env') })
var util = require('../lib/util');

router.route('/login')

.post(function(req, res, next) {

  passport.authenticate('local-login', function(err, user, info) {
    if (err) {
      return next(err)
    }
    if (!user) {
      return res.status(400).send({ message: info.message });
    }
    else {
      req.logIn(user, function(err) {
        if (err) {
          return next(err);
        }

        db.User.findOne({
          where: {
              id: user.id
          },
          include: [{
              model: db.Condition,
              as: 'UserConditions',
              where: {
                  version: 1
              }
          }]
      })
      .then(expandedUser => {
        return res.send({'user': expandedUser});
      })


      });
    }
  })(req, res, next)
});


router.route('/logout')

.post( function(req, res) {

  req.logout(function(err) {
    if (err) { return next(err); }
      res.sendStatus(200);
    });
  
});


router.route('/signup')

.post( function(req, res, next)  {

  passport.authenticate('local-signup', async function(err, user, info) {

    if (err) {
      return next(err);
    }

    if (user) {

      let allNonPreTaskTweets = (await db.Tweet.findAll({
        where: {
          preTask: false
        }
      })).map(el => el.id);

      const shuffledTweets = allNonPreTaskTweets.sort(() => 0.5 - Math.random());
      let stage1Tweets = shuffledTweets.slice(0, constants.STAGE_1_SIZE);
      let mapping = {};
      for (let tweetId of stage1Tweets) {
        mapping[tweetId] = 1;
      }
      let stage2Tweets = shuffledTweets.slice(constants.STAGE_1_SIZE);
      for (let tweetId of stage2Tweets) {
        mapping[tweetId] = 2;
      }

      let tweetStage = await db.TweetStage.create({
        mappingsBlob: JSON.stringify(mapping)
      })

      let proms = [];

      proms.push(user.setTweetStage(tweetStage));

      let experiments = ['exp1', 'exp2']; 
      let randomIndex = util.getRandomInt(0, 1);

      let condition = await db.Condition.create({
        stage: 0,
        experiment: experiments[randomIndex]
      })

      proms.push(user.addUserCondition(condition));

      proms.push(util.modelSetup(user));

      await Promise.all(proms);

      let allJobs = await predictionsQueue.getJobs()
      res.status(200).send({ message: `Thanks for signing up! Your account is all set.` })
      
    }
    else {
      res.status(400).send({ message: info.message });
    }

 })(req, res, next);
});

module.exports = router;