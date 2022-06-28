'use strict';

module.exports = (sequelize, DataTypes) => {
    const Condition = sequelize.define('Condition', {
        value: {
            type: DataTypes.STRING
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