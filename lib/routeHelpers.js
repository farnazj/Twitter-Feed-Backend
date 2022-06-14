const logger = require('../lib/logger');
var bCrypt = require('bcrypt');


function isLoggedIn(req, res, next) {

    logger.silly('checking isLoggedIn ' + req.headers.cookie);
    console.log(req.headers.cookie)
    // if user is authenticated in the session, carry on
    if (req.isAuthenticated())
        return next();
    else
        res.status(401).send({ message:'unauthorized' });
}

function getLimitOffset(req) {

    let paginationObj = {};
    for (let key of ['limit', 'offset']){
      if (req.query[key])
        paginationObj[key] = parseInt(req.query[key]);
    }
  
    return paginationObj;
}

function generateHash(password) {
    return bCrypt.hash(password, bCrypt.genSaltSync(8), null); // a promise
  };
  

module.exports = {
    isLoggedIn,
    getLimitOffset,
    generateHash
}