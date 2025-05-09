const { DataTypes } = require('sequelize');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Drop existing unique constraint if it exists
        try {
            await queryInterface.removeConstraint('requests', 'requests_requestNumber_unique');
        } catch (error) {
            // Ignore error if constraint doesn't exist
        }

        // Add new index
        await queryInterface.addIndex('requests', ['requestNumber'], {
            unique: true,
            name: 'idx_request_number'
        });
    },

    down: async (queryInterface, Sequelize) => {
        // Remove index
        await queryInterface.removeIndex('requests', 'idx_request_number');

        // Add back unique constraint
        await queryInterface.addConstraint('requests', {
            fields: ['requestNumber'],
            type: 'unique',
            name: 'requests_requestNumber_unique'
        });
    }
}; 