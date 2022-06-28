'use strict';

module.exports = (sequelize, DataTypes) => {
    const TweetSource = sequelize.define('TweetSource', {
        username: {
            type: DataTypes.STRING
        },
        name: {
            type: DataTypes.STRING
        },
        imageUrl: {
            type: DataTypes.STRING,
            validate: {
                isUrl: true 
            }
        },
        verified: {
           type: DataTypes.BOOLEAN
        }
    }, {
        charset: 'utf8mb4',
    });
 

    return TweetSource;
  };