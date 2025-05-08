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
            allowNull: false,
            unique: true
        },
        employeeId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        title: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        type: {
            type: DataTypes.STRING(50),
            allowNull: false,
            validate: {
                isIn: [['Equipment', 'Leave', 'Department Change', 'Onboarding']]
            }
        },
        status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'Draft',
            validate: {
                isIn: [['Draft', 'Submitted', 'In Progress', 'Approved', 'Rejected', 'Completed', 'Cancelled']]
            }
        },
        currentStep: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1
        },
        totalSteps: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        notes: {
            type: DataTypes.TEXT
        },
        createdDate: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        lastModifiedDate: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
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