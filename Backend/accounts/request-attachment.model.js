const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        fileName: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        filePath: {
            type: DataTypes.STRING(512),
            allowNull: false
        },
        fileSize: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: 0
            }
        },
        mimeType: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        uploadedDate: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    };

    const options = {
        timestamps: false
    };

    return sequelize.define('RequestAttachment', attributes, options);
} 