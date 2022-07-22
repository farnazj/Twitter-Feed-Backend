'use strict';

module.exports = (sequelize, DataTypes) => {
    const MTurkCode = sequelize.define('MTurkCode', {
        code: {
            type: DataTypes.STRING
        }
    }, {
        charset: 'utf8mb4',
    });
  
    MTurkCode.associate = function (models) {
        models.MTurkCode.belongsTo(models.User);
    };

    return MTurkCode;
  }