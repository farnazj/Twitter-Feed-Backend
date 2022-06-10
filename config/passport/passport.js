var LocalStrategy = require('passport-local').Strategy;
var models = require('../../models');
var routeHelpers = require('../../lib/routeHelpers');
var bCrypt = require('bcrypt');

module.exports = function(passport) {

    var User = models.User;
    passport.use('local-signup', new LocalStrategy({
      passReqToCallback: true
      },

        function(req, email, password, done) {

            User.findOne({
              where: {
                email: email
              }
            }).then(function(user) {

                if (user)
                {
                  return done(null, false, {
                    message: 'That email is already taken'
                  });
                }
                else {
                    routeHelpers.generateHash(password).then((userPassword) => {
                        
                        User.create({ passwordHash: userPassword, email: email }).then((newUser, created) => {

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
        passReqToCallback : true
    },
    function(req, email, password, done) {
        User.findOne({where: { email: email }}).then(function(user) {

          // if no user is found, return the message
          if (!user)
              return done(null, false, { message: 'No user found with the given email' });
          if (!user.isVerified)
              return done(null, false, { message: 'user not activated' });

          bCrypt.compare(password, user.passwordHash, (err, isValid) => {

             if (err) {
               return done(err)
             }
             if (!isValid) {
               return done(null, false, {message: 'Password not valid'});
             }
             return done(null, user);
           })

        }).catch(function(err) {
          return done(err);
        });

    }));

  };