'use strict';

module.exports = (sequelize, DataTypes) => {
    const Condition = sequelize.define('Condition', {
        experiment: {
            type: DataTypes.STRING
        },
        stage: {
            type: DataTypes.INTEGER,
        },
        version: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        }
    }, {
        charset: 'utf8mb4',
    });

    return Condition;
  };