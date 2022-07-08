var LocalStrategy = require('passport-local').Strategy;
var models = require('../../models');
var routeHelpers = require('../../lib/routeHelpers');
var bCrypt = require('bcrypt');

module.exports = function(passport) {

    var User = models.User;
    passport.use('local-signup', new LocalStrategy({
      passReqToCallback: true,
      usernameField: 'workerId', 
      passwordField: 'password'
      },

        function(req, workerId, password, done) {

          User.findOne({
            where: {
              workerId: workerId
            }
          }).then(function(user) {

              if (user)
              {
                return done(null, false, {
                  message: 'That worker ID has already been used'
                });
              }
              else {
                  routeHelpers.generateHash(password).then((userPassword) => {
                      
                    User.create({ passwordHash: userPassword, workerId: workerId })
                    .then((newUser, created) => {
                      if (!newUser) {
                          return done(null, false, { message: 'Sth went wrong' });
                      }
                      else {
                          return done(null, newUser, { message: 'New user created', type: 'NEW_USER' });
                      }

                    })
                  }

              )}

          })
          .catch(function(reason) {
              return done(null, false, { message: reason });
          });

        }

    ));

    passport.serializeUser(function(user, done) {
      done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
      User.findByPk(id).then(function(user) {

        if (user) {
          done(null, user.get());
        }
        else {
            done("sth went wrong", null);
        }

      });

  });


  passport.use('local-login', new LocalStrategy({
        passReqToCallback : true,
        usernameField: 'workerId',    // define the parameter in req.body that passport can use as username and password
        passwordField: 'password'
    },
    function(req, workerId, password, done) {
        User.findOne({ where: { workerId: workerId }}).then(function(user) {

          // if no user is found, return the message
          // console.log('user is found?', user)
          if (!user)
              return done(null, false, { message: 'No user found with the given worker ID' });
          if (!user.isVerified)
              return done(null, false, { message: 'user not activated' });

          bCrypt.compare(password, user.passwordHash, (err, isValid) => {

             if (err) {
               return done(err)
             }
             if (!isValid) {
               return done(null, false, {message: 'Password not valid'});
             }
             console.log('logging in the user')
             return done(null, user);
           })

        }).catch(function(err) {
          return done(err);
        });

    }));

  };