const { v4: uuidv4 } = require('uuid');
var session = require('express-session');
var path = require('path');
var redisStore = require('connect-redis')(session);
var redis = require("redis");

require('dotenv').config({ path: path.join(__dirname,'/../.env') });

var client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
  // password: process.env.REDIS_PASS

 });


let sessionObject = {
  genid: function(req) {
   return uuidv4() // use UUIDs for session IDs
  },
  name: process.env.COOKIE_NAME,
  secret: process.env.SESSION_KEY,
  resave: true,
  saveUninitialized: true,
  cookie: {
    httpOnly: false,
    secure: false,
    // sameSite: 'none',
    maxAge: 4 * 24 * 60 * 60 * 1000
  },
  rolling: true,
  store: new redisStore({ host: process.env.REDIS_HOST, port: parseInt(process.env.REDIS_PORT),
   client: client }),
};

let sessConfig = session(sessionObject);

module.exports = {
  sessConfig
}