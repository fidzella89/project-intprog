const config = require('../config.json');
const mysql = require('mysql2/promise');
const { Sequelize } = require('sequelize');

module.exports = db = {};

initialize();

async function initialize() {
    // create db if it doesn't already exist
    const { host, port, user, password, database } = config.database;
    const connection = await mysql.createConnection({ host, port, user, password });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);

    // connect to db
    const sequelize = new Sequelize(database, user, password, { 
        dialect: 'mysql',
        logging: false // Disable logging
    });

    // init models and add them to the exported db object
    db.Account = require('../accounts/account.model')(sequelize);
    db.RefreshToken = require('../accounts/refresh-token.model')(sequelize);
    db.Employee = require('../accounts/employee.model')(sequelize);
    db.Department = require('../accounts/department.model')(sequelize);
    db.Request = require('../accounts/request.model')(sequelize);
    db.RequestItem = require('../accounts/request-item.model')(sequelize);
    db.Workflow = require('../accounts/workflow.model')(sequelize);

    // Account-Employee relationship (one-to-one)
    db.Account.hasOne(db.Employee, {
        foreignKey: { name: 'accountId', allowNull: false },
        onDelete: 'CASCADE'
    });
    db.Employee.belongsTo(db.Account, { foreignKey: 'accountId' });

    // Account-RefreshToken relationship
    db.Account.hasMany(db.RefreshToken, {
        foreignKey: { name: 'accountId', allowNull: false },
        onDelete: 'CASCADE'
    });
    db.RefreshToken.belongsTo(db.Account, { foreignKey: 'accountId' });

    // Department-Employee relationships
    db.Department.hasMany(db.Employee, {
        as: 'employees',
        foreignKey: { name: 'departmentId', allowNull: true }
    });
    db.Employee.belongsTo(db.Department, { 
        as: 'Department',
        foreignKey: 'departmentId' 
    });
    
    // Department-Manager relationship
    db.Department.belongsTo(db.Employee, {
        as: 'departmentManager',
        foreignKey: { name: 'managerId', allowNull: true }
    });

    // Request-Employee relationship
    db.Employee.hasMany(db.Request, {
        foreignKey: { name: 'employeeId', allowNull: false },
        as: 'employeeRequests'
    });
    db.Request.belongsTo(db.Employee, { 
        foreignKey: 'employeeId',
        as: 'employee'
    });

    // Request Items relationship
    db.Request.hasMany(db.RequestItem, {
        foreignKey: { name: 'requestId', allowNull: false },
        onDelete: 'CASCADE'
    });
    db.RequestItem.belongsTo(db.Request, { foreignKey: 'requestId' });

    // Workflow relationships
    db.Request.hasMany(db.Workflow, {
        foreignKey: { name: 'requestId', allowNull: false },
        onDelete: 'CASCADE'
    });
    db.Workflow.belongsTo(db.Request, { foreignKey: 'requestId' });

    // Workflow-Handler relationship
    db.Employee.hasMany(db.Workflow, {
        foreignKey: 'handledBy',
        as: 'handledWorkflows'
    });
    db.Workflow.belongsTo(db.Employee, {
        foreignKey: 'handledBy',
        as: 'handler'
    });

    // sync all models with database
    await sequelize.sync({ alter: true });
}
