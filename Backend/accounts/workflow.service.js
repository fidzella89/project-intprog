const db = require('../_helpers/db');

module.exports = {
    getAll,
    getById,
    getByRequestId,
    create,
    update,
    delete: _delete
};

async function getAll() {
    const workflows = await db.Workflow.findAll({
        include: [
            { model: db.Account, as: 'handler', attributes: ['id', 'firstName', 'lastName', 'email'] },
            { model: db.Request }
        ]
    });
    return workflows;
}

async function getById(id) {
    const workflow = await db.Workflow.findByPk(id, {
        include: [
            { model: db.Account, as: 'handler', attributes: ['id', 'firstName', 'lastName', 'email'] },
            { model: db.Request }
        ]
    });
    if (!workflow) throw 'Workflow not found';
    return workflow;
}

async function getByRequestId(requestId) {
    const workflows = await db.Workflow.findAll({
        where: { requestId: requestId },
        include: [
            { model: db.Account, as: 'handler', attributes: ['id', 'firstName', 'lastName', 'email'] }
        ],
        order: [['created', 'ASC']]
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
    const workflow = new db.Workflow(params);
    workflow.created = new Date();
    
    // save workflow
    await workflow.save();
    return workflow;
}

async function update(id, params) {
    const workflow = await getById(id);
    
    // copy params to workflow and save
    Object.assign(workflow, params);
    workflow.updated = new Date();
    await workflow.save();
    
    return workflow;
}

async function _delete(id) {
    const workflow = await getById(id);
    await workflow.destroy();
} 