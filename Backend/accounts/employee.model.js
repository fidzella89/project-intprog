const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        employeeId: { type: DataTypes.STRING, allowNull: false },
        accountId: { type: DataTypes.INTEGER, allowNull: false },
        departmentId: { type: DataTypes.INTEGER },
        position: { type: DataTypes.STRING, allowNull: false },
        hireDate: { type: DataTypes.DATE, allowNull: false },
        salary: { type: DataTypes.DECIMAL(10, 2) },
        status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Active' },
        created: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated: { type: DataTypes.DATE }
    };

    const options = {
        // disable default timestamp fields (createdAt and updatedAt)
        timestamps: false
    };

    return sequelize.define('employee', attributes, options);
} 