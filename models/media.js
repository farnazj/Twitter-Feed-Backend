'use strict';

module.exports = (sequelize, DataTypes) => {
    const Media = sequelize.define('Media', {
        url: {
            type: DataTypes.STRING
        },
        type: {
            type: DataTypes.STRING
        },
        width: {
            type: DataTypes.INTEGER 
        },
        height: {
            type: DataTypes.INTEGER
        }
    }, {
        charset: 'utf8mb4',
    });

    return Media;
  }