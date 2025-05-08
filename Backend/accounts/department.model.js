const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        name: { type: DataTypes.STRING, allowNull: false },
        description: { type: DataTypes.TEXT },
        code: { type: DataTypes.STRING },
        manager: { type: DataTypes.INTEGER }, // Reference to employee ID who manages this department
        status: { 
            type: DataTypes.STRING, 
            allowNull: false, 
            defaultValue: 'Active',
            validate: {
                isIn: [['Active', 'Inactive', 'Archived']]
            }
        },
        created: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated: { type: DataTypes.DATE }
    };

    const options = {
        // disable default timestamp fields (createdAt and updatedAt)
        timestamps: false
    };

    return sequelize.define('department', attributes, options);
} 