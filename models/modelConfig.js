'use strict';

module.exports = (sequelize, DataTypes) => {
    const ModelConfig = sequelize.define('ModelConfig', {
        iteration: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        workspace: {
            type: DataTypes.STRING
        },
        forStage: {
            type: DataTypes.INTEGER
        }
       
    }, {
        charset: 'utf8mb4',
    });

    return ModelConfig;
  };