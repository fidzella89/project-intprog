const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        requestId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        employeeid: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'employees',
                key: 'id'
            }
        },
        type: {
            type: DataTypes.STRING(50),
            allowNull: false,
            validate: {
                isIn: [['Leave Request', 'Equipment Request', 'Department Change', 'Other',
                       'Added', 'Updated', 'Department Transfer', 'Deleted']]
            }
        },
        details: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'ForReviewing',
            validate: {
                isIn: [['ForReviewing', 'Completed']]
            }
        },
        datetimecreated: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
        }
    };

    const options = {
        timestamps: false,
        tableName: 'workflows'
    };

    return sequelize.define('Workflow', attributes, options);
} 