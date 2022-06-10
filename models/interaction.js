'use strict';

module.exports = (sequelize, DataTypes) => {
    const Interaction = sequelize.define('Interaction', {
        retweet: {
            type: DataTypes.BOOLEAN
        },
        like: {
            type: DataTypes.BOOLEAN
        }
       
    }, {
        charset: 'utf8mb4',
    });

    return Interaction;
  };