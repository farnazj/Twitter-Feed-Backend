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

    let user = await db.User.findByPk(req.params.id);
    res.send(user);
}));

router.route('/users/:id/pre-task')
.put(routeHelpers.isLoggedIn, wrapAsync(async function(req, res) {

    let user = await db.User.findByPk(req.params.id);
    user.completedPreTask = true;
    await user.save()
    res.send({ message: 'pre task is complete' });
}));

module.exports = router;