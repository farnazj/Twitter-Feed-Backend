const logger = require('../lib/logger');


function isLoggedIn(req, res, next) {

    logger.silly('checking isLoggedIn ' + req.headers.cookie);
    // if user is authenticated in the session, carry on
    if (req.isAuthenticated())
        return next();
  
    // if user is not authenticated
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

module.exports = {
    isLoggedIn,
    getLimitOffset
}