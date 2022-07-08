'use strict';

module.exports = (sequelize, DataTypes) => {
    const Tweet = sequelize.define('Tweet', {
        tweetId: {
            type: DataTypes.STRING
        },
        index: {
            type: DataTypes.INTEGER
        },
        postTime: {
            type: DataTypes.DATE
        },
        text: {
            type: DataTypes.TEXT('long')
        },
        preTask: { //part of the set of tweets that users assess as the pre-task
            type: DataTypes.BOOLEAN
        },
        retweetCount: {
            type: DataTypes.INTEGER
        },
        likeCount: {
            type: DataTypes.INTEGER
        },
        annotationLabel: {
            type: DataTypes.INTEGER //0 for accurate, 1 for inaccurate
        }
        // no reply or quote count because we can't show them 
    }, {
        charset: 'utf8mb4',
    });
  
    Tweet.associate = function (models) {
        models.Tweet.belongsTo(models.TweetSource);
        models.Tweet.hasMany(models.AccuracyLabel, { as: 'TweetAccuracyLabels' });
        models.Tweet.hasMany(models.Media, { as: 'TweetMedia' });
    };

    return Tweet;
  }