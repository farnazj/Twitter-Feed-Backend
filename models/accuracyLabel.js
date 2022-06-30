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
        changedLastInIteration: {
            type: DataTypes.INTEGER
        },
        value: {
            type: DataTypes.INTEGER //0 for accurate or NA, 1 for inaccurate
        },
        reason: {
            type: DataTypes.TEXT('long')
        },
        stage: {
            type: DataTypes.INTEGER
        }
       
    }, {
        charset: 'utf8mb4',
    });

    AccuracyLabel.associate = function (models) {
        models.AccuracyLabel.belongsTo(models.User);
    };

    return AccuracyLabel;
  };