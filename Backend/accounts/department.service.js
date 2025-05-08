const db = require('../_helpers/db');

module.exports = {
    getAll,
    getById,
    create,
    update,
    delete: _delete
};

async function getAll() {
    const departments = await db.Department.findAll({
        include: [
            { 
                model: db.Employee, 
                as: 'managerEmployee',
                include: [
                    { model: db.Account, attributes: ['id', 'firstName', 'lastName', 'email'] }
                ] 
            }
        ]
    });
    return departments.map(x => basicDetails(x));
}

async function getById(id) {
    const department = await getDepartment(id);
    return basicDetails(department);
}

async function create(params) {
    // validate
    if (await db.Department.findOne({ where: { name: params.name } })) {
        throw 'Department with this name already exists';
    }

    // Validate manager exists if provided
    if (params.manager) {
        const manager = await db.Employee.findByPk(params.manager);
        if (!manager) throw 'Manager employee not found';
    }

    const department = new db.Department(params);
    department.created = new Date();
    
    // save department
    await department.save();

    return basicDetails(department);
}

async function update(id, params) {
    const department = await getDepartment(id);

    // validate (if name was changed)
    if (params.name && params.name !== department.name && 
        await db.Department.findOne({ where: { name: params.name } })) {
        throw 'Department with this name already exists';
    }

    // Validate manager exists if provided
    if (params.manager) {
        const manager = await db.Employee.findByPk(params.manager);
        if (!manager) throw 'Manager employee not found';
    }

    // copy params to department and save
    Object.assign(department, params);
    department.updated = new Date();
    await department.save();

    return basicDetails(department);
}

async function _delete(id) {
    const department = await getDepartment(id);
    
    // check if department has any employees
    const employeeCount = await db.Employee.count({ where: { departmentId: department.id } });
    if (employeeCount > 0) {
        throw `Department cannot be deleted because it has ${employeeCount} employees assigned`;
    }
    
    await department.destroy();
}

// helper functions

async function getDepartment(id) {
    const department = await db.Department.findByPk(id, {
        include: [
            { 
                model: db.Employee, 
                as: 'managerEmployee',
                include: [
                    { model: db.Account, attributes: ['id', 'firstName', 'lastName', 'email'] }
                ] 
            }
        ]
    });
    if (!department) throw 'Department not found';
    return department;
}

function basicDetails(department) {
    const { id, name, description, code, manager, status, created, updated, managerEmployee } = department;
    return { 
        id, 
        name, 
        description, 
        code, 
        manager, 
        status, 
        created, 
        updated,
        managerEmployee: managerEmployee ? {
            id: managerEmployee.id,
            employeeId: managerEmployee.employeeId,
            position: managerEmployee.position,
            account: managerEmployee.account ? {
                id: managerEmployee.account.id,
                firstName: managerEmployee.account.firstName,
                lastName: managerEmployee.account.lastName,
                email: managerEmployee.account.email
            } : null
        } : null
    };
} 