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

router.route('/users/:id/pre-task')
.put(routeHelpers.isLoggedIn, wrapAsync(async function(req, res) {

    let user = await db.User.findByPk(req.params.id);
    user.completedPreTask = true;
    await user.save()
    res.send({ message: 'pre task is complete' });
}));

router.route('/users/:id/update-condition')
.put(routeHelpers.isLoggedIn, wrapAsync(async function(req, res) {

    let user = await db.User.findByPk(req.params.id);
    let conditions = await user.getUserConditions();

    let mostRecentCondtion = conditions.find(condition => condition.version == 1);

    let proms = conditions.map(condition => {
        condition.version = condition.version - 1;
        return condition.save();
    });

    let nextCondtion = mostRecentCondtion.value == 'RQ1A' ? 'RQ1B' : 'TODO';

    let newCondition = await db.condition.create({
        version: 1,
        value: nextCondtion
    });

    await Promise.all([user.addUserCondition(newCondition), ...proms ]);
    res.send({ message: 'condition update is complete', condition: newCondition });
}));

module.exports = router;