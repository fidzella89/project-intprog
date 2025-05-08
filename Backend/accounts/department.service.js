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
                as: 'departmentManager',
                include: [
                    { model: db.Account, attributes: ['id', 'firstName', 'lastName', 'email'] }
                ] 
            },
            {
                model: db.Employee,
                as: 'employees',
                attributes: ['id', 'employeeId', 'position'],
                include: [
                    { model: db.Account, attributes: ['firstName', 'lastName'] }
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
                as: 'departmentManager',
                include: [
                    { model: db.Account, attributes: ['id', 'firstName', 'lastName', 'email'] }
                ] 
            },
            {
                model: db.Employee,
                as: 'employees',
                attributes: ['id', 'employeeId', 'position'],
                include: [
                    { model: db.Account, attributes: ['firstName', 'lastName'] }
                ]
            }
        ]
    });
    if (!department) throw 'Department not found';
    return department;
}

function basicDetails(department) {
    const { id, name, description, code, manager, status, created, updated, departmentManager, employees } = department;
    return { 
        id, 
        name, 
        description, 
        code, 
        manager, 
        status, 
        created, 
        updated,
        departmentManager: departmentManager ? {
            id: departmentManager.id,
            employeeId: departmentManager.employeeId,
            position: departmentManager.position,
            account: departmentManager.account ? {
                id: departmentManager.account.id,
                firstName: departmentManager.account.firstName,
                lastName: departmentManager.account.lastName,
                email: departmentManager.account.email
            } : null
        } : null,
        employees: employees ? employees.map(emp => ({
            id: emp.id,
            employeeId: emp.employeeId,
            position: emp.position,
            fullName: `${emp.account.firstName} ${emp.account.lastName}`
        })) : []
    };
} 