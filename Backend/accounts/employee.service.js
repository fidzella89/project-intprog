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
                as: 'Department',
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
                as: 'Department',
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
        throw 'Employee already exists for this account.';
    }

    // validate department exists if provided
    if (params.departmentId) {
        const department = await db.Department.findByPk(params.departmentId);
        if (!department) throw 'Department not found.';
    }

    const employee = new db.Employee(params);
    await employee.save();

    // Get account details for the workflow log
    const account = await db.Account.findByPk(params.accountId);
    const department = params.departmentId ? await db.Department.findByPk(params.departmentId) : null;

    // Create workflow entry for new employee
    await createWorkflowLog(employee.id, 'Added', {
        details: `The Employee Named ${capitalizeFirstLetter(account.firstName)} ${capitalizeFirstLetter(account.lastName)} was added${department ? ` to ${department.name} Department` : ''}.`
    });

    return employee;
}

async function update(id, params) {
    const employee = await getEmployee(id);
    const oldDepartmentId = employee.departmentId;

    // validate department exists if provided
    if (params.departmentId) {
        const department = await db.Department.findByPk(params.departmentId);
        if (!department) throw 'Department not found.';
    }

    // copy params to employee and save
    Object.assign(employee, params);
    employee.updated = Date.now();
    await employee.save();

    // Get account details for the workflow log
    const account = await db.Account.findByPk(employee.accountId);

    // Create workflow entry for employee update
    if (params.departmentId && oldDepartmentId !== params.departmentId) {
        // Department transfer workflow
        const oldDept = await db.Department.findByPk(oldDepartmentId);
        const newDept = await db.Department.findByPk(params.departmentId);
        await createWorkflowLog(employee.id, 'Department Transfer', {
            details: `The Employee Named ${capitalizeFirstLetter(account.firstName)} ${capitalizeFirstLetter(account.lastName)} was transferred from ${oldDept ? oldDept.name : 'No Department'} to ${newDept.name} Department.`
        });
    } else {
        // General update workflow
        await createWorkflowLog(employee.id, 'Updated', {
            details: `The Employee Named ${capitalizeFirstLetter(account.firstName)} ${capitalizeFirstLetter(account.lastName)} information was updated.`
        });
    }

    return employee;
}

async function _delete(id) {
    const employee = await getEmployee(id);
    
    // Get account details for the workflow log
    const account = await db.Account.findByPk(employee.accountId);

    // Create workflow entry for employee deletion
    await createWorkflowLog(employee.id, 'Deleted', {
        details: `The Employee Named ${capitalizeFirstLetter(account.firstName)} ${capitalizeFirstLetter(account.lastName)} was deleted.`
    });

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
                as: 'Department',
                attributes: ['id', 'name', 'code', 'status']
            }
        ]
    });
    if (!employee) throw 'Employee not found';
    return employee;
}

async function createWorkflowLog(employeeId, type, details) {
    await db.Workflow.create({
        employeeid: employeeId,
        type: type,
        details: details.details,
        status: 'Completed'
    });
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
} 