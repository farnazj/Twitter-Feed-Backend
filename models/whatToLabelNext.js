'use strict';

module.exports = (sequelize, DataTypes) => {
    const WhatToLabelNext = sequelize.define('WhatToLabelNext', {

        iteration: {
            type: DataTypes.INTEGER
        },
        forStage: {
            type: DataTypes.INTEGER
        },
        tweetId: {
            type: DataTypes.INTEGER
        }
       
    }, {
        charset: 'utf8mb4',
    });

    WhatToLabelNext.associate = function (models) {
        models.WhatToLabelNext.belongsTo(models.User);
    };

    return WhatToLabelNext;
  };