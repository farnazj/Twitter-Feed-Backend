'use strict';

module.exports = (sequelize, DataTypes) => {
    const UserTweetOrder = sequelize.define('UserTweetOrder', {
        rank: {
            type: DataTypes.INTEGER
        }
    }, {
        charset: 'utf8mb4',
    });
 
    UserTweetOrder.associate = function (models) {
        models.UserTweetOrder.belongsTo(models.Tweet);
        models.UserTweetOrder.belongsTo(models.User);
    };

    return UserTweetOrder;
  };