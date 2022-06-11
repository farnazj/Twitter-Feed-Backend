const uuidv4 = require('uuid/v4');
require('dotenv').config();
var session = require('express-session');
var path = require('path');
var redisStore = require('connect-redis')(session);
var redis = require("redis");
var client  = redis.createClient();
require('dotenv').config({ path: path.join(__dirname,'/../.env') });

let sessionObject = {
  genid: function(req) {
   return uuidv4() // use UUIDs for session IDs
  },
  secret: process.env.SESSION_KEY,
  resave: true,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 4 * 24 * 60 * 60 * 1000
  },
  rolling: true,
  store: new redisStore({ host: 'localhost', port: parseInt(process.env.REDIS_PORT),
   client: client }),
};

let sessConfig = session(sessionObject);

module.exports = {
  sessConfig
}