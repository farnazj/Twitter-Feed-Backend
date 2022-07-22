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
var util = require('../lib/util');


router.route('/users/:id')
.get(routeHelpers.isLoggedIn, wrapAsync(async function(req, res) {

    let user = await db.User.findOne({
        where: {
            id: req.params.id
        },
        include: [{
            model: db.Condition,
            as: 'UserConditions',
            where: {
                version: 1
            }
        }]
    });

    res.send(user);
}));


router.route('/users/:id/update-condition')
.put(routeHelpers.isLoggedIn, wrapAsync(async function(req, res) {

    let user = await db.User.findByPk(req.params.id);
    let conditions = await user.getUserConditions();

    let newCondition = await util.advanceStage(conditions, user);

    if (newCondition.stage == 2) {
        let allRepeatableJobs = await predictionsQueue.getRepeatableJobs();
        let stage1UserJobkey = allRepeatableJobs.filter(job => job.id == `stage1-modelcheck-user${user.id}` )[0].key;
        await predictionsQueue.removeRepeatableByKey(stage1UserJobkey);
    }

    res.send({ message: 'condition update is complete', condition: newCondition });
}));


router.route('/users/mturk-code')
.get(routeHelpers.isLoggedIn, wrapAsync(async function(req, res) {

    let code = await db.MTurkCode.findOne({
        where: {
            UserId: req.user.id
        }
    });

    if (code) {
        res.send(code);
    }
    else {
        let results = await Promise.all([
            db.User.findByPk(req.user.id),
            db.MTurkCode.create({
                code: util.makeRandomId(6)
            })
        ]) ;

        let user = results[0];
        let code = results[1];

        await code.setUser(user);

        res.send(code);
    }

}));


router.route('/users/:id/end-study')
.post(routeHelpers.isLoggedIn, wrapAsync(async function(req, res) {
    let user = await db.User.findByPk(req.params.id);
    let allRepeatableJobs = await predictionsQueue.getRepeatableJobs();

    let userJobkeys = allRepeatableJobs.filter(job => [`stage1-modelcheck-user${user.id}`, `stage2-modelcheck-user${user.id}`].includes(job.id) ).map(el =>
      el.key);

    for (let jobKey of userJobkeys) {
        await predictionsQueue.removeRepeatableByKey(jobKey);
    }

    res.send({ message: 'ended study' });

}));

module.exports = router;