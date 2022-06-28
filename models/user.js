'use strict';

module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: false
      },
      email: {
        type: DataTypes.STRING,
        validate: {
          isEmail: true 
        }
      },
      isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      completedPreTask: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      condition: {
        type: DataTypes.STRING
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
    };

    return User;
  };