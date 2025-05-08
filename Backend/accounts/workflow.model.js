const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        requestId: { type: DataTypes.INTEGER, allowNull: false },
        stage: { type: DataTypes.STRING, allowNull: false },
        status: { 
            type: DataTypes.STRING, 
            allowNull: false,
            validate: {
                isIn: [['Pending', 'Completed', 'Skipped', 'Failed']]
            }
        },
        handledBy: { type: DataTypes.INTEGER }, // Reference to account who handled this stage
        comments: { type: DataTypes.TEXT },
        created: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated: { type: DataTypes.DATE },
        completedAt: { type: DataTypes.DATE }
    };

    const options = {
        // disable default timestamp fields (createdAt and updatedAt)
        timestamps: false
    };

    return sequelize.define('workflow', attributes, options);
} 