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
            type: DataTypes.STRING
        },
        verified: {
           type: DataTypes.BOOLEAN
        }
    }, {
        charset: 'utf8mb4',
    });
 
    TweetSource.associate = function (models) {
        models.TweetSource.belongsToMany(models.Tweet, { through: 'TweetsofSource' });
    }

    return TweetSource;
  };