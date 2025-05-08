const db = require('../_helpers/db');

module.exports = {
    getAll,
    getById,
    getByEmployeeId,
    getByRequestId,
    create,
    update,
    delete: _delete
};

async function getAll() {
    const workflows = await db.Workflow.findAll({
        include: [
            { 
                model: db.Employee, 
                as: 'handler',
                include: [{
                    model: db.Account,
                    attributes: ['id', 'firstName', 'lastName', 'email']
                }]
            },
            { 
                model: db.Request,
                include: [{
                    model: db.Employee,
                    as: 'employee',
                    include: [{
                        model: db.Account,
                        attributes: ['id', 'firstName', 'lastName', 'email']
                    }]
                }]
            }
        ],
        order: [['createdDate', 'DESC']]
    });
    return workflows;
}

async function getById(id) {
    const workflow = await db.Workflow.findByPk(id, {
        include: [
            { 
                model: db.Employee, 
                as: 'handler',
                include: [{
                    model: db.Account,
                    attributes: ['id', 'firstName', 'lastName', 'email']
                }]
            },
            { 
                model: db.Request,
                include: [{
                    model: db.Employee,
                    as: 'employee',
                    include: [{
                        model: db.Account,
                        attributes: ['id', 'firstName', 'lastName', 'email']
                    }]
                }]
            }
        ]
    });
    if (!workflow) throw 'Workflow not found';
    return workflow;
}

async function getByEmployeeId(employeeId) {
    const workflows = await db.Workflow.findAll({
        include: [
            { 
                model: db.Employee, 
                as: 'handler',
                include: [{
                    model: db.Account,
                    attributes: ['id', 'firstName', 'lastName', 'email']
                }]
            },
            { 
                model: db.Request,
                where: { employeeId: employeeId },
                include: [{
                    model: db.Employee,
                    as: 'employee',
                    include: [{
                        model: db.Account,
                        attributes: ['id', 'firstName', 'lastName', 'email']
                    }]
                }]
            }
        ],
        order: [['createdDate', 'DESC']]
    });
    return workflows;
}

async function getByRequestId(requestId) {
    const workflows = await db.Workflow.findAll({
        where: { requestId: requestId },
        include: [
            { 
                model: db.Employee, 
                as: 'handler',
                include: [{
                    model: db.Account,
                    attributes: ['id', 'firstName', 'lastName', 'email']
                }]
            },
            { 
                model: db.Request,
                include: [{
                    model: db.Employee,
                    as: 'employee',
                    include: [{
                        model: db.Account,
                        attributes: ['id', 'firstName', 'lastName', 'email']
                    }]
                }]
            }
        ],
        order: [['createdDate', 'DESC']]
    });
    return workflows;
}

async function create(params) {
    // validate
    if (!params.requestId) throw 'Request ID is required';
    
    // check if request exists
    const request = await db.Request.findByPk(params.requestId);
    if (!request) throw 'Request not found';
    
    // create workflow
    const workflow = new db.Workflow({
        ...params,
        createdDate: new Date(),
        lastModifiedDate: new Date()
    });
    
    // save workflow
    await workflow.save();
    return workflow;
}

async function update(id, params) {
    const workflow = await getById(id);
    
    // copy params to workflow and save
    Object.assign(workflow, {
        ...params,
        lastModifiedDate: new Date()
    });
    await workflow.save();
    
    return workflow;
}

async function _delete(id) {
    const workflow = await getById(id);
    await workflow.destroy();
} 