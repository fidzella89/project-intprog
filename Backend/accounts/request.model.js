const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        title: { type: DataTypes.STRING, allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: false },
        requestType: { type: DataTypes.STRING, allowNull: false },
        requesterId: { type: DataTypes.INTEGER, allowNull: false }, // Reference to employee
        assignedTo: { type: DataTypes.INTEGER }, // Reference to employee (can be null initially)
        status: { 
            type: DataTypes.STRING, 
            allowNull: false, 
            defaultValue: 'Pending',
            validate: {
                isIn: [['Pending', 'In Progress', 'Under Review', 'Approved', 'Rejected', 'Completed', 'Cancelled']]
            }
        },
        priority: { 
            type: DataTypes.STRING, 
            allowNull: false, 
            defaultValue: 'Medium',
            validate: {
                isIn: [['Low', 'Medium', 'High', 'Urgent']]
            }
        },
        dueDate: { type: DataTypes.DATE },
        created: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated: { type: DataTypes.DATE }
    };

    const options = {
        // disable default timestamp fields (createdAt and updatedAt)
        timestamps: false
    };

    return sequelize.define('request', attributes, options);
} 