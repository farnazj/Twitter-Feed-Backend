'use strict';

module.exports = (sequelize, DataTypes) => {
    const FeedDeliveryLog = sequelize.define('FeedDeliveryLog', {
        userId: {
            type: DataTypes.INTEGER
        },
        stage: {
            type: DataTypes.INTEGER
        },
        limit: {
            type: DataTypes.INTEGER
        },
        offset: {
            type: DataTypes.INTEGER
        },
        tweetIds: {
            type: DataTypes.TEXT('long')
        }
        
    }, {
        charset: 'utf8mb4',
    });

    return FeedDeliveryLog;
  }

  /*
  log of the ordr of tweets sent to participants in each stage
  */