var express = require('express');
var router = express.Router();
const passport = require('passport');
var db  = require('../models');
// var constants = require('../lib/constants');
const logger = require('../lib/logger');
var Sequelize = require('sequelize');
const Op = Sequelize.Op;
var crypto = require('crypto');
var path = require('path');
require('dotenv').config({ path: path.join(__dirname,'/../.env') })


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
        return res.send({'user': user});
      });
    }
  })(req, res, next)
});


router.route('/logout')

.post( function(req, res) {

  req.logout();
  res.sendStatus(200);
});


router.route('/signup')

.post(function(req, res, next) {

  passport.authenticate('local-signup', function(err, user, info) {

    if (err) {
      return next(err);
    }

    if (user) {

      res.status(200).send({ message: `Thanks for signing up! Your account is all set.` })
    }
    else {
      res.status(400).send({ message: info.message });
    }

 })(req, res, next);
});

module.exports = router;