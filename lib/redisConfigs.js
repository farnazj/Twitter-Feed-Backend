var redis = require('redis');
var path = require('path');
require('dotenv').config({ path: path.join(__dirname,'/../.env') });

var client = redis.createClient({
 host: process.env.REDIS_HOST,
 port: parseInt(process.env.REDIS_PORT),
 password: process.env.REDIS_PASS
});

module.exports = client;