const db = require('../_helpers/db');

module.exports = {
    getAll,
    getById,
    getByRequesterId,
    getByAssignedTo,
    create,
    update,
    changeStatus,
    delete: _delete
};

async function getAll() {
    const requests = await db.Request.findAll({
        include: [
            {
                model: db.Employee,
                as: 'requester',
                include: [{
                    model: db.Account,
                    attributes: ['id', 'firstName', 'lastName', 'email']
                }]
            },
            {
                model: db.Employee,
                as: 'assignee',
                include: [{
                    model: db.Account,
                    attributes: ['id', 'firstName', 'lastName', 'email']
                }]
            }
        ]
    });
    return requests;
}

async function getById(id) {
    const request = await getRequest(id);
    return request;
}

async function getByRequesterId(requesterId) {
    const requests = await db.Request.findAll({
        where: { requesterId },
        include: [
            {
                model: db.Employee,
                as: 'assignee',
                include: [{
                    model: db.Account,
                    attributes: ['id', 'firstName', 'lastName', 'email']
                }]
            }
        ]
    });
    return requests;
}

async function getByAssignedTo(assignedTo) {
    const requests = await db.Request.findAll({
        where: { assignedTo },
        include: [
            {
                model: db.Employee,
                as: 'requester',
                include: [{
                    model: db.Account,
                    attributes: ['id', 'firstName', 'lastName', 'email']
                }]
            }
        ]
    });
    return requests;
}

async function create(params) {
    // Create a new request
    const request = new db.Request(params);
    await request.save();

    // Create initial workflow stage
    await db.Workflow.create({
        requestId: request.id,
        stage: 'Submission',
        status: 'Completed',
        handledBy: params.requesterId,
        comments: 'Request submitted',
        completedAt: Date.now()
    });

    // Create the next workflow stage
    await db.Workflow.create({
        requestId: request.id,
        stage: 'Review',
        status: 'Pending',
        comments: 'Pending review'
    });

    return request;
}

async function update(id, params) {
    const request = await getRequest(id);

    // copy params to request and save
    Object.assign(request, params);
    request.updated = Date.now();
    await request.save();

    return request;
}

async function changeStatus(id, { status, handledById, comments }) {
    const request = await getRequest(id);
    const oldStatus = request.status;
    
    // Update request status
    request.status = status;
    request.updated = Date.now();
    await request.save();
    
    // Find current workflow stage
    const currentWorkflow = await db.Workflow.findOne({
        where: {
            requestId: id,
            status: 'Pending'
        }
    });
    
    if (currentWorkflow) {
        // Update current workflow stage
        currentWorkflow.status = 'Completed';
        currentWorkflow.handledBy = handledById;
        currentWorkflow.comments = comments;
        currentWorkflow.completedAt = Date.now();
        currentWorkflow.updated = Date.now();
        await currentWorkflow.save();
        
        // Create next workflow stage if needed
        if (status !== 'Completed' && status !== 'Rejected' && status !== 'Cancelled') {
            let nextStage;
            switch (currentWorkflow.stage) {
                case 'Review':
                    nextStage = 'Processing';
                    break;
                case 'Processing':
                    nextStage = 'Approval';
                    break;
                case 'Approval':
                    nextStage = 'Implementation';
                    break;
                case 'Implementation':
                    nextStage = 'Verification';
                    break;
                default:
                    nextStage = 'Completion';
            }
            
            await db.Workflow.create({
                requestId: id,
                stage: nextStage,
                status: 'Pending',
                comments: `Pending ${nextStage.toLowerCase()}`
            });
        }
    }
    
    return { 
        request,
        statusChanged: oldStatus !== status
    };
}

async function _delete(id) {
    const request = await getRequest(id);
    await request.destroy();
}

// helper functions
async function getRequest(id) {
    const request = await db.Request.findByPk(id, {
        include: [
            {
                model: db.Employee,
                as: 'requester',
                include: [{
                    model: db.Account,
                    attributes: ['id', 'firstName', 'lastName', 'email']
                }]
            },
            {
                model: db.Employee,
                as: 'assignee',
                include: [{
                    model: db.Account,
                    attributes: ['id', 'firstName', 'lastName', 'email']
                }]
            },
            {
                model: db.Workflow
            }
        ]
    });
    if (!request) throw 'Request not found';
    return request;
} 