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
    const sequelize = new Sequelize(database, user, password, { dialect: 'mysql' });

    // init models and add them to the exported db object
    db.Account = require('../accounts/account.model')(sequelize);
    db.RefreshToken = require('../accounts/refresh-token.model')(sequelize);
    db.Employee = require('../accounts/employee.model')(sequelize);
    db.Request = require('../accounts/request.model')(sequelize);
    db.Workflow = require('../accounts/workflow.model')(sequelize);
    db.Department = require('../accounts/department.model')(sequelize);

    // define relationships
    db.Account.hasMany(db.RefreshToken, { onDelete: 'CASCADE' });
    db.RefreshToken.belongsTo(db.Account);

    // Account-Employee relationship (one-to-one)
    db.Account.hasOne(db.Employee, { foreignKey: 'accountId', onDelete: 'CASCADE' });
    db.Employee.belongsTo(db.Account, { foreignKey: 'accountId' });

    // Employee-Request relationships
    db.Employee.hasMany(db.Request, { foreignKey: 'requesterId', as: 'createdRequests' });
    db.Request.belongsTo(db.Employee, { foreignKey: 'requesterId', as: 'requester' });
    
    db.Employee.hasMany(db.Request, { foreignKey: 'assignedTo', as: 'assignedRequests' });
    db.Request.belongsTo(db.Employee, { foreignKey: 'assignedTo', as: 'assignee' });

    // Request-Workflow relationship (one-to-many)
    db.Request.hasMany(db.Workflow, { foreignKey: 'requestId', onDelete: 'CASCADE' });
    db.Workflow.belongsTo(db.Request, { foreignKey: 'requestId' });

    // Account-Workflow relationship (who handled the workflow stage)
    db.Account.hasMany(db.Workflow, { foreignKey: 'handledBy' });
    db.Workflow.belongsTo(db.Account, { foreignKey: 'handledBy', as: 'handler' });

    // Department-Employee relationship (one-to-many)
    db.Department.hasMany(db.Employee, { foreignKey: 'departmentId' });
    db.Employee.belongsTo(db.Department, { foreignKey: 'departmentId' });

    // Department-Manager relationship (one employee manages a department)
    db.Employee.hasOne(db.Department, { foreignKey: 'manager' });
    db.Department.belongsTo(db.Employee, { foreignKey: 'manager', as: 'managerEmployee' });

    // sync all models with database
    await sequelize.sync({ alter: true });
}
