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


router.route('/logs')
.post(routeHelpers.isLoggedIn, wrapAsync(async function(req, res) {

    let userCondition = await db.Condition.findOne({
        where: {
            UserId: req.user.id,
            version: 1
        }
    });

    let userModelConfig = await db.ModelConfig.findOne({
        where: {
            forStage: userCondition.stage,
            UserId: req.user.id
        }
    });

    db.ReceiptLog.create({
        UserId: req.user.id,
        modelIteration: userModelConfig.iteration,
        timeReceived: req.body.timeReceived,
        timeDisplayed: req.body.timeDisplayed,
        changedTweets: JSON.stringify(req.body.changedTweets)
    });

    res.send({ message: 'log created' });
}));

module.exports = router;