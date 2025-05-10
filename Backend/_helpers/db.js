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
        db.Department.hasMany(db.Employee, {
            foreignKey: 'departmentId',
            as: 'employees'
        });
        db.Employee.belongsTo(db.Department, {
            foreignKey: 'departmentId',
            as: 'Department'
        });
        db.Department.belongsTo(db.Employee, {
            foreignKey: 'managerId',
            as: 'departmentManager'
        });

        // Employee-Workflow relationship (one-to-many)
        db.Employee.hasMany(db.Workflow, {
            foreignKey: 'employeeid',
            sourceKey: 'id',
            as: 'workflows'
        });
        db.Workflow.belongsTo(db.Employee, {
            foreignKey: 'employeeid',
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

        // Check if tables exist and create/sync them
        console.log('Checking and syncing database tables...');
        try {
            // First check if any tables exist
            const [tables] = await sequelize.query('SHOW TABLES');
            const tableExists = tables.length > 0;

            if (!tableExists) {
                // No tables exist, create all tables
                console.log('No tables found. Creating all tables...');
                await sequelize.sync({ force: true });
                console.log('All tables created successfully');
            } else {
                // Tables exist, sync with alter to preserve data
                console.log('Existing tables found. Syncing with alter...');
                await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
                await sequelize.sync({ alter: true });
                await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
                console.log('Database synchronization completed');
            }
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
