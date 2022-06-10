'use strict';

module.exports = (sequelize, DataTypes) => {
    const AccuracyLabel = sequelize.define('AccuracyLabel', {
        version: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },
        AIAssigned: {
            type: DataTypes.BOOLEAN //1 for AI, 0 for user
        }
       
    }, {
        charset: 'utf8mb4',
    });

    AccuracyLabel.associate = function (models) {
        models.AccuracyLabel.belongsTo(models.Tweet);
    };

    return AccuracyLabel;
  };