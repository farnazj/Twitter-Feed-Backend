'use strict';

module.exports = (sequelize, DataTypes) => {
    const TweetElementMapping = sequelize.define('TweetElementMapping', {
        assignedId: {
            type: DataTypes.STRING
        },
        index: {
            type: DataTypes.INTEGER
        }
       
    }, {
        charset: 'utf8mb4',
    });

    TweetElementMapping.associate = function (models) {
        // models.TweetElementMapping.belongsTo(models.Tweet);
        models.TweetElementMapping.belongsTo(models.User);
    };


    return TweetElementMapping;
  };