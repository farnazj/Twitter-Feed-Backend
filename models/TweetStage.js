'use strict';

module.exports = (sequelize, DataTypes) => {
    const TweetStage = sequelize.define('TweetStage', {
        mappingsBlob: {
            type: DataTypes.TEXT('long')
       }
    }, {
        charset: 'utf8mb4',
    });

    
    return TweetStage;

  };