'use strict';

module.exports = (sequelize, DataTypes) => {
    const AccuracyLabel = sequelize.define('AccuracyLabel', {
        version: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },
        AIAssigned: {
            type: DataTypes.BOOLEAN //1 for AI, 0 for user
        },
        value: {
            type: DataTypes.INTEGER //-1 for inaccurate, 0 for NA, 1 for accurate
        },
        reason: {
            type: DataTypes.TEXT('long')
        }
       
    }, {
        charset: 'utf8mb4',
    });

    return AccuracyLabel;
  };