'use strict';

module.exports = (sequelize, DataTypes) => {
    const Tweet = sequelize.define('Tweet', {
        tweetId: {
            type: DataTypes.INTEGER
        },
        postTime: {
            type: DataTypes.DATE
        },
        text: {
            type: DataTypes.TEXT('long')
        },
        retweetCount: {
            type: DataTypes.INTEGER
        },
        like_count: {
            type: DataTypes.INTEGER
        }
        // no reply or quote count because we can't show them 
    }, {
        charset: 'utf8mb4',
    });
  
    Tweet.associate = function (models) {
        models.Tweet.hasOne(models.TweetSource);
        models.Tweet.hasMany(models.AccuracyLabel, {as: 'TweetAccuracyLabels' });
    };
 

    return Tweet;
  };