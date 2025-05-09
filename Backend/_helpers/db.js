const config = require('../config.json');
const mysql = require('mysql2/promise');
const { Sequelize } = require('sequelize');

module.exports = db = {};

initialize().catch(err => {
    console.error('Database initialization failed:', err);
    process.exit(1);
});

async function initialize() {
    try {
        const { host, port, user, password, database } = config.database;
        
        console.log('Connecting to MySQL server...');
        const connection = await mysql.createConnection({ 
            host, 
            port, 
            user, 
            password,
            connectTimeout: 30000
        });

        // Create database if it doesn't exist
        console.log('Checking database existence...');
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
        await connection.query(`USE \`${database}\`;`);
        
        // Connect to db with Sequelize
        const sequelize = new Sequelize(database, user, password, { 
            host,
            port,
            dialect: 'mysql',
            logging: console.log,
            pool: {
                max: 5,
                min: 0,
                acquire: 30000,
                idle: 10000
            },
            dialectOptions: {
                connectTimeout: 60000
            }
        });

        // Test the connection
        await sequelize.authenticate();
        console.log('Database connection authenticated successfully');

        // Initialize models
        console.log('Initializing models...');
        db.Account = require('../accounts/account.model')(sequelize);
        db.RefreshToken = require('../accounts/refresh-token.model')(sequelize);
        db.Employee = require('../accounts/employee.model')(sequelize);
        db.Department = require('../accounts/department.model')(sequelize);
        db.Request = require('../accounts/request.model')(sequelize);
        db.Workflow = require('../accounts/workflow.model')(sequelize);
        db.RequestItem = require('../accounts/request-item.model')(sequelize);

        // Define relationships
        console.log('Setting up model relationships...');
        
        // Account-Employee relationship (one-to-one)
        db.Account.hasOne(db.Employee, {
            foreignKey: { name: 'accountId', allowNull: false },
            onDelete: 'CASCADE'
        });
        db.Employee.belongsTo(db.Account, { foreignKey: 'accountId' });

        // Account-RefreshToken relationship (one-to-many)
        db.Account.hasMany(db.RefreshToken, {
            foreignKey: { name: 'accountId', allowNull: false },
            onDelete: 'CASCADE'
        });
        db.RefreshToken.belongsTo(db.Account, { foreignKey: 'accountId' });

        // Department-Employee relationships
        // Department has many employees
        db.Department.hasMany(db.Employee, {
            foreignKey: 'departmentId',
            as: 'employees'
        });

        // Employee belongs to Department
        db.Employee.belongsTo(db.Department, {
            foreignKey: 'departmentId',
            as: 'Department'  // Capital D to match the service layer
        });

        // Department has one manager (Employee)
        db.Department.belongsTo(db.Employee, {
            foreignKey: 'managerId',
            as: 'departmentManager'
        });

        // Employee-Workflow relationship (one-to-many)
        db.Employee.hasMany(db.Workflow, {
            foreignKey: 'employeeid',  // This references the employee's id column
            sourceKey: 'id',
            as: 'workflows'
        });
        
        db.Workflow.belongsTo(db.Employee, {
            foreignKey: 'employeeid',  // This references the employee's id column
            targetKey: 'id',
            as: 'employee'
        });

        // Employee-Request relationship (one-to-many)
        db.Employee.hasMany(db.Request, {
            foreignKey: 'employeeId',
            sourceKey: 'id',
            as: 'requests'
        });
        
        db.Request.belongsTo(db.Employee, {
            foreignKey: 'employeeId',
            targetKey: 'id',
            as: 'employee'
        });

        // Request-RequestItem relationship (one-to-many)
        db.Request.hasMany(db.RequestItem, {
            foreignKey: 'requestId',
            sourceKey: 'id',
            as: 'items',
            onDelete: 'CASCADE'
        });

        db.RequestItem.belongsTo(db.Request, {
            foreignKey: 'requestId',
            targetKey: 'id',
            as: 'request'
        });

        // Sync database - use alter for all tables to preserve data
        console.log('Synchronizing database models...');
        try {
            // First sync without foreign key checks to handle existing data
            await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
            await sequelize.sync({ alter: true });
            await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
            console.log('Database synchronization completed');
        } catch (syncError) {
            console.error('Error during database synchronization:', syncError);
            throw syncError;
        }
        
        await connection.end();
        return db;
    } catch (error) {
        console.error('Database initialization error:', error);
        throw error;
    }
}
