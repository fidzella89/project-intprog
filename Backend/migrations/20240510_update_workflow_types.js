const { DataTypes } = require('sequelize');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Modify the type column constraints to include employee-related actions
        await queryInterface.changeColumn('workflows', 'type', {
            type: DataTypes.STRING(50),
            allowNull: false,
            validate: {
                isIn: [['Leave Request', 'Equipment Request', 'Department Change', 'Other', 
                       'Added', 'Updated', 'Department Transfer', 'Deleted']]
            }
        });
    },

    down: async (queryInterface, Sequelize) => {
        // Revert the type column constraints
        await queryInterface.changeColumn('workflows', 'type', {
            type: DataTypes.STRING(50),
            allowNull: false,
            validate: {
                isIn: [['Leave Request', 'Equipment Request', 'Department Change', 'Other']]
            }
        });
    }
}; 