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
            allowNull: false
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        type: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        quantity: {
            type: DataTypes.INTEGER,
            validate: {
                min: 0
            }
        },
        startDate: {
            type: DataTypes.DATE
        },
        endDate: {
            type: DataTypes.DATE
        },
        notes: {
            type: DataTypes.TEXT
        },
        status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'Draft',
            validate: {
                isIn: [['Draft', 'Submitted', 'In Progress', 'Approved', 'Rejected', 'Completed']]
            }
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
        tableName: 'request_items',
        hooks: {
            beforeUpdate: (item) => {
                item.lastModifiedDate = new Date();
            }
        }
    };

    return sequelize.define('RequestItem', attributes, options);
} 