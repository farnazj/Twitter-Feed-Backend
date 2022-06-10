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
      }
    });
  
  
    User.prototype.toJSON = function() {
      var values = Object.assign({}, this.get());
  
      delete values.passwordHash;
      return values;
    }

    User.associate = function (models) {
        models.User.hasMany(models.AccuracyLabel, { as: 'UserAccuracyLabels' });
    };


    return User;
  };