const { DataTypes } = require('sequelize');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Update existing statuses to match new values
        await queryInterface.sequelize.query(`
            UPDATE workflows 
            SET status = CASE 
                WHEN status IN ('Pending', 'InProgress') THEN 'ForReviewing'
                WHEN status = 'Completed' THEN 'Completed'
                ELSE 'ForReviewing'
            END;
        `);

        // Modify the status column constraints
        await queryInterface.changeColumn('workflows', 'status', {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'ForReviewing',
            validate: {
                isIn: [['ForReviewing', 'Completed']]
            }
        });
    },

    down: async (queryInterface, Sequelize) => {
        // Revert the status column constraints
        await queryInterface.changeColumn('workflows', 'status', {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'Pending',
            validate: {
                isIn: [['Pending', 'InProgress', 'Completed', 'Rejected']]
            }
        });

        // Note: Data won't be reverted as it would be difficult to determine original values
    }
}; 