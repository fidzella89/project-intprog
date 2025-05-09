const db = require('../_helpers/db');
const { Op, literal } = require('sequelize');

module.exports = {
    getAll,
    getById,
    getByRequesterId,
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
                as: 'employee',
                include: [{
                    model: db.Account,
                    attributes: ['id', 'firstName', 'lastName', 'email']
                }]
            }
        ],
        attributes: {
            include: [
                [
                    literal(`(
                        SELECT CASE 
                            WHEN COUNT(*) = 0 THEN 'No Item'
                            WHEN COUNT(*) = 1 THEN '1 Item'
                            ELSE CONCAT(COUNT(*), ' Items')
                        END
                        FROM request_items 
                        WHERE request_items.requestId = Request.id
                    )`),
                    'itemsDisplay'
                ]
            ]
        }
    });
    return requests;
}

async function getById(id) {
    const request = await db.Request.findByPk(id, {
        include: [
            {
                model: db.Employee,
                as: 'employee',
                include: [{
                    model: db.Account,
                    attributes: ['id', 'firstName', 'lastName', 'email']
                }]
            },
            {
                model: db.RequestItem,
                as: 'items'
            }
        ],
        attributes: {
            include: [
                [
                    literal(`(
                        SELECT CASE 
                            WHEN COUNT(*) = 0 THEN 'No Item'
                            WHEN COUNT(*) = 1 THEN '1 Item'
                            ELSE CONCAT(COUNT(*), ' Items')
                        END
                        FROM request_items 
                        WHERE request_items.requestId = Request.id
                    )`),
                    'itemsDisplay'
                ]
            ]
        }
    });
    if (!request) throw 'Request not found';
    return request;
}

async function getByRequesterId(requesterId) {
    const requests = await db.Request.findAll({
        where: { requesterId },
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
        attributes: {
            include: [
                [
                    literal(`(
                        SELECT CASE 
                            WHEN COUNT(*) = 0 THEN 'No Item'
                            WHEN COUNT(*) = 1 THEN '1 Item'
                            ELSE CONCAT(COUNT(*), ' Items')
                        END
                        FROM request_items 
                        WHERE request_items.requestId = Request.id
                    )`),
                    'itemsDisplay'
                ]
            ]
        }
    });
    return requests;
}

async function create(params) {
    // Generate request number
    const requestNumber = await generateRequestNumber();
    params.requestNumber = requestNumber;
    
    // Set initial status based on role
    params.status = params.isAdmin ? 'Approved' : 'Pending';
    
    // Create a new request
    const request = new db.Request(params);
    await request.save();

    return getById(request.id);
}

async function update(id, params) {
    const request = await getRequest(id);

    // copy params to request and save
    Object.assign(request, params);
    request.updated = Date.now();
    await request.save();

    return getById(request.id);
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
    
    // Delete all associated items first
    await db.RequestItem.destroy({
        where: { requestId: id }
    });
    
    // Then delete the request
    await request.destroy();
}

// helper functions
async function getRequest(id) {
    const request = await db.Request.findByPk(id, {
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
    if (!request) throw 'Request not found';
    return request;
}

// Helper function to generate unique request number
async function generateRequestNumber() {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    
    // Get count of requests for current month to generate sequence
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const count = await db.Request.count({
        where: {
            createdDate: {
                [Op.between]: [startOfMonth, endOfMonth]
            }
        }
    });
    
    // Format: REQ-YY-MM-XXXX where XXXX is a sequential number
    const sequence = (count + 1).toString().padStart(4, '0');
    return `REQ-${year}-${month}-${sequence}`;
}

// Helper function to map request type to workflow type
function mapRequestTypeToWorkflowType(requestType) {
    switch(requestType) {
        case 'Equipment':
        case 'Resources':
            return 'Equipment Request';
        case 'Leave':
            return 'Leave Request';
        default:
            return 'Other';
    }
} 