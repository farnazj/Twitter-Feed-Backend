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


router.route('/tweets')
.get(routeHelpers.isLoggedIn, wrapAsync(async function(req, res) {
    let paginationReq = routeHelpers.getLimitOffset(req);

    let tweets;
    if (typeof req.headers.pretask !== 'undefined' && req.headers.pretask == 'true') { //for fetching the subset of tweets that the user needs to assess in the pre-task
        tweets = await db.Tweet.findAll({
            where: {
                preTask: {
                    [Op.eq]: true
                }
            },
            include:[{
                model: db.TweetSource,
            }],
            ...paginationReq
        });
    }
    else {

        tweets = await db.Tweet.findAll({
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
            }],
            ...paginationReq
        });
    }
    
    res.send(tweets);

}));

module.exports = router;