const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        requestNumber: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
        employeeId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        type: {
            type: DataTypes.STRING(50),
            allowNull: false,
            validate: {
                isIn: [['Equipment', 'Leave', 'Resources']]
            }
        },
        status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'Pending',
            validate: {
                isIn: [['Pending', 'Approved', 'Rejected']]
            }
        },
        createdDate: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        lastModifiedDate: {
            type: DataTypes.DATE,
            allowNull: true
        }
    };

    const options = {
        timestamps: false,
        tableName: 'requests',
        hooks: {
            beforeUpdate: (request) => {
                request.lastModifiedDate = new Date();
            }
        }
    };

    return sequelize.define('Request', attributes, options);
} 