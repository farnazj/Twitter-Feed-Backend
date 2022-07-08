'use strict';

module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: false
      },
      workerId: {
        type: DataTypes.STRING
      },
      isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      }
    });
  
  
    User.prototype.toJSON = function() {
      var values = Object.assign({}, this.get());
  
      delete values.passwordHash;
      return values;
    }

    User.associate = function (models) {
      models.User.hasMany(models.AccuracyLabel, { as: 'UserAccuracyLabels' });
      models.User.hasMany(models.ModelConfig, { as: 'UserModelConfigs' });
      models.User.hasMany(models.Condition, { as: 'UserConditions' });
      models.User.hasOne(models.TweetStage);
    };

    return User;
  };