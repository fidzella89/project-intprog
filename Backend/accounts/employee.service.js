const db = require('../_helpers/db');

module.exports = {
    getAll,
    getById,
    getByAccountId,
    create,
    update,
    delete: _delete
};

async function getAll() {
    const employees = await db.Employee.findAll({
        include: [
            {
                model: db.Account,
                attributes: ['id', 'firstName', 'lastName', 'email']
            },
            {
                model: db.Department,
                attributes: ['id', 'name', 'code', 'status']
            }
        ]
    });
    return employees;
}

async function getById(id) {
    const employee = await getEmployee(id);
    return employee;
}

async function getByAccountId(accountId) {
    const employee = await db.Employee.findOne({
        where: { accountId },
        include: [
            {
                model: db.Account,
                attributes: ['id', 'firstName', 'lastName', 'email']
            },
            {
                model: db.Department,
                attributes: ['id', 'name', 'code', 'status']
            }
        ]
    });
    if (!employee) throw 'Employee not found';
    return employee;
}

async function create(params) {
    // validate
    if (await db.Employee.findOne({ where: { accountId: params.accountId } })) {
        throw 'Employee already exists for this account';
    }

    // validate department exists if provided
    if (params.departmentId) {
        const department = await db.Department.findByPk(params.departmentId);
        if (!department) throw 'Department not found';
    }

    const employee = new db.Employee(params);
    await employee.save();

    return employee;
}

async function update(id, params) {
    const employee = await getEmployee(id);

    // validate department exists if provided
    if (params.departmentId) {
        const department = await db.Department.findByPk(params.departmentId);
        if (!department) throw 'Department not found';
    }

    // copy params to employee and save
    Object.assign(employee, params);
    employee.updated = Date.now();
    await employee.save();

    return employee;
}

async function _delete(id) {
    const employee = await getEmployee(id);
    await employee.destroy();
}

// helper functions
async function getEmployee(id) {
    const employee = await db.Employee.findByPk(id, {
        include: [
            {
                model: db.Account,
                attributes: ['id', 'firstName', 'lastName', 'email']
            },
            {
                model: db.Department,
                attributes: ['id', 'name', 'code', 'status']
            }
        ]
    });
    if (!employee) throw 'Employee not found';
    return employee;
} 