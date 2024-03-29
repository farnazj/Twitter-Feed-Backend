'use strict';

module.exports = (sequelize, DataTypes) => {
    const ReceiptLog = sequelize.define('ReceiptLog', {
        userId: {
            type: DataTypes.INTEGER
        },
        timeReceived: {
            type: DataTypes.DATE
        },
        timeDisplayed: {
            type: DataTypes.DATE
        },
        modelIteration: {
            type: DataTypes.INTEGER
        },
        changedTweets: {
            type: DataTypes.TEXT('long')
        }
        
    }, {
        charset: 'utf8mb4',
    });

    return ReceiptLog;
  }

  /*
  Receipt of model prediction changes in stage 2 sent by the client
  */