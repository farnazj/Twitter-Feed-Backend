'use strict';

module.exports = (sequelize, DataTypes) => {
    const AccuracyLabel = sequelize.define('AccuracyLabel', {
        version: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },
        assessor: {
            type: DataTypes.INTEGER //0 for user, 1 for AI, 2 for other
        },
        changedLastInIteration: {
            type: DataTypes.INTEGER
        },
        value: {
            type: DataTypes.INTEGER //0 for accurate or NA, 1 for inaccurate
        },
        confidence: {
            type: DataTypes.INTEGER //1-5
        },
        reason: {
            type: DataTypes.TEXT('long')
        },
        stage: {
            type: DataTypes.INTEGER
        },
        timeSinceFeedLoaded: {
            type: DataTypes.INTEGER
        },
        notesBlob: {
            type: DataTypes.TEXT('long')
        }
       
    }, {
        charset: 'utf8mb4',
    });

    AccuracyLabel.associate = function (models) {
        models.AccuracyLabel.belongsTo(models.User);
    };

    return AccuracyLabel;
  };