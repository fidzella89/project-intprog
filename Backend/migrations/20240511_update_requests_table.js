const { DataTypes } = require('sequelize');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Remove description column
        await queryInterface.removeColumn('requests', 'description');

        // Modify lastModifiedDate to be nullable
        await queryInterface.changeColumn('requests', 'lastModifiedDate', {
            type: DataTypes.DATE,
            allowNull: true
        });
    },

    down: async (queryInterface, Sequelize) => {
        // Add back description column
        await queryInterface.addColumn('requests', 'description', {
            type: DataTypes.TEXT,
            allowNull: false,
            defaultValue: ''  // Provide a default value for existing rows
        });

        // Revert lastModifiedDate to not nullable with default
        await queryInterface.changeColumn('requests', 'lastModifiedDate', {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        });
    }
}; 