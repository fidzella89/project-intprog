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
                ],
                [
                    literal(`(
                        SELECT GROUP_CONCAT(CONCAT(name, ' (', quantity, ')') SEPARATOR ', ')
                        FROM request_items 
                        WHERE request_items.requestId = Request.id
                    )`),
                    'itemsList'
                ]
            ]
        },
        order: [['createdDate', 'DESC']]
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
        where: { employeeId: requesterId },
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
                ],
                [
                    literal(`(
                        SELECT GROUP_CONCAT(CONCAT(name, ' (', quantity, ')') SEPARATOR ', ')
                        FROM request_items 
                        WHERE request_items.requestId = Request.id
                    )`),
                    'itemsList'
                ]
            ]
        },
        order: [['createdDate', 'DESC']]
    });
    return requests;
}

async function create(params, retryCount = 0) {
    const MAX_RETRIES = 5;
    
    console.log('Received create request params:', params); // Debug log
    
    // Extract items and isAdmin from params
    const items = params.items || [];
    const isAdmin = params.isAdmin === true; // Ensure boolean conversion
    delete params.items;
    delete params.isAdmin;

    console.log('Creating request with admin status:', isAdmin);
    console.log('Employee ID:', params.employeeId); // Debug log
    console.log('Request type:', params.type); // Debug log
    console.log('Items:', items); // Debug log

    // Generate request number
    const requestNumber = await generateRequestNumber();
    
    // Check if request number already exists
    const existingRequest = await db.Request.findOne({
        where: { requestNumber }
    });
    
    if (existingRequest) {
        if (retryCount >= MAX_RETRIES) {
            throw new Error('Failed to generate unique request number after maximum retries');
        }
        // If exists, try to generate a new one with incremented retry count
        return create({ ...params, items, isAdmin }, retryCount + 1);
    }
    
    params.requestNumber = requestNumber;
    params.status = isAdmin ? 'Approved' : 'Pending';
    
    console.log('Final request params:', params); // Debug log
    
    try {
        // Create request and items in a transaction
        const result = await db.Request.sequelize.transaction(async (t) => {
            // Create the request
            const request = await db.Request.create(params, { transaction: t });
            console.log('Created request:', request.toJSON()); // Debug log
            
            // Create items
            if (items.length > 0) {
                const requestItems = items.map(item => ({
                    ...item,
                    requestId: request.id
                }));
                await db.RequestItem.bulkCreate(requestItems, { 
                    transaction: t,
                    validate: true
                });
                console.log('Created request items:', requestItems); // Debug log
            }

            return request;
        });

        console.log('Request created successfully:', result.id);
        return getById(result.id);
    } catch (error) {
        console.error('Error creating request:', error);
        throw new Error('Failed to create request. Please try again later.');
    }
}

async function update(id, params) {
    const request = await getRequest(id);

    // Extract items from params
    const newItems = params.items || [];
    delete params.items;

    // Update request and items in a transaction
    await db.Request.sequelize.transaction(async (t) => {
        // Update request
    Object.assign(request, params);
        request.lastModifiedDate = new Date();
        await request.save({ transaction: t });

        // Get existing items
        const existingItems = await db.RequestItem.findAll({
            where: { requestId: id },
            transaction: t
        });

        // Create maps for tracking
        const existingItemsMap = new Map(
            existingItems.map(item => [item.id, item])
        );
        const newItemsMap = new Map(
            newItems.filter(item => item.id).map(item => [item.id, item])
        );

        // 1. Update existing items
        for (const [itemId, existingItem] of existingItemsMap) {
            if (newItemsMap.has(itemId)) {
                const newItem = newItemsMap.get(itemId);
                await existingItem.update({
                    name: newItem.name,
                    quantity: newItem.quantity
                }, { transaction: t });
            } else {
                // Item was removed in the edit
                await existingItem.destroy({ transaction: t });
            }
        }

        // 2. Add new items
        const itemsToCreate = newItems.filter(item => !item.id);
        if (itemsToCreate.length > 0) {
            await db.RequestItem.bulkCreate(
                itemsToCreate.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    requestId: id
                })),
                { transaction: t }
            );
        }
    });

    return getById(id);
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
    
    // Add a random suffix to reduce collision probability
    const randomSuffix = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    const sequence = (count + 1).toString().padStart(4, '0');
    return `REQ-${year}-${month}-${sequence}-${randomSuffix}`;
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