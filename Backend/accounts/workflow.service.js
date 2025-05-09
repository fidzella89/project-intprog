const db = require('../_helpers/db');

module.exports = {
    getAll,
    getById,
    getByEmployeeId,
    create,
    update,
    delete: _delete
};

async function getAll() {
    const workflows = await db.Workflow.findAll({
        include: [
            {
                model: db.Employee,
                as: 'employee',
                include: [{
                    model: db.Account,
                    attributes: ['id', 'firstName', 'lastName', 'email']
                }]
            }
        ],
        order: [['datetimecreated', 'DESC']]
    });
    return workflows;
}

async function getById(id) {
    const workflow = await getWorkflow(id);
    return workflow;
}

async function getByEmployeeId(employeeid) {
    return await db.Workflow.findAll({
        where: { employeeid: employeeid },
        include: [
            {
                model: db.Employee,
                as: 'employee',
                include: [{
                    model: db.Account,
                    attributes: ['id', 'firstName', 'lastName', 'email']
                }]
            }
        ],
        order: [['datetimecreated', 'DESC']]
    });
}

async function create(params) {
    // validate employee exists
    const employee = await db.Employee.findByPk(params.employeeid);
    if (!employee) throw 'Employee not found';
    
    const workflow = new db.Workflow(params);
    await workflow.save();
    
    return getById(workflow.id);
}

async function update(id, params) {
    const workflow = await getWorkflow(id);
    
    // copy params to workflow and save
    Object.assign(workflow, params);
    await workflow.save();
    
    return getById(workflow.id);
}

async function _delete(id) {
    const workflow = await getWorkflow(id);
    await workflow.destroy();
}

// helper functions
async function getWorkflow(id) {
    const workflow = await db.Workflow.findByPk(id, {
        include: [
            {
                model: db.Employee,
                as: 'employee',
                include: [{
                    model: db.Account,
                    attributes: ['id', 'firstName', 'lastName', 'email']
                }]
            }
        ]
    });
    if (!workflow) throw 'Workflow not found';
    return workflow;
} 