var LocalStrategy = require('passport-local').Strategy;
var models = require('../../models');
var routeHelpers = require('../../lib/routeHelpers');
var bCrypt = require('bcrypt');

module.exports = function(passport) {

    var User = models.User;
    passport.use('local-signup', new LocalStrategy({
      passReqToCallback: true,
      usernameField: 'email', 
      passwordField: 'password'
      },

        function(req, username, password, done) {
          console.log('req', username, password)

            User.findOne({
              where: {
                email: username
              }
            }).then(function(user) {

              console.log('peida shod', user)

                if (user)
                {
                  return done(null, false, {
                    message: 'That email is already taken'
                  });
                }
                else {
                    routeHelpers.generateHash(password).then((userPassword) => {
                        
                        User.create({ passwordHash: userPassword, email: username }).then((newUser, created) => {
                            console.log('inja umad',newUser )
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
      console.log('going to serialize', user.id)
      done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
      User.findByPk(id).then(function(user) {

        console.log('did it work', user)

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
        usernameField: 'email',    // define the parameter in req.body that passport can use as username and password
        passwordField: 'password'
    },
    function(req, username, password, done) {
        User.findOne({where: { email: username }}).then(function(user) {

          // if no user is found, return the message
          console.log('user is found?', user)
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
             console.log('logging in the user')
             return done(null, user);
           })

        }).catch(function(err) {
          return done(err);
        });

    }));

  };