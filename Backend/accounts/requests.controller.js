const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('../_middleware/validate-request');
const authorize = require('../_middleware/authorize');
const Role = require('../_helpers/role');
const requestService = require('./request.service');
const employeeService = require('./employee.service');

// routes
router.get('/', authorize(), getAll);
router.get('/:id', authorize(), getById);
router.get('/requester/:id', authorize(), getByRequesterId);
router.get('/assigned/:id', authorize(), getByAssignedTo);
router.get('/my-requests', authorize(), getMyRequests);
router.get('/assigned-to-me', authorize(), getAssignedToMe);
router.post('/', authorize(), createSchema, create);
router.put('/:id', authorize(), updateSchema, update);
router.put('/:id/status', authorize(), statusSchema, changeStatus);
router.delete('/:id', authorize([Role.Admin, Role.Moderator]), _delete);

module.exports = router;

function getAll(req, res, next) {
    // Restrict access based on role
    if (req.user.role !== Role.Admin && req.user.role !== Role.Moderator) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    
    requestService.getAll()
        .then(requests => res.json(requests))
        .catch(next);
}

function getById(req, res, next) {
    requestService.getById(req.params.id)
        .then(request => {
            // Users can only view their own requests or requests assigned to them
            // Admins and moderators can view all requests
            if (req.user.role !== Role.Admin && req.user.role !== Role.Moderator && 
                request.requesterId !== req.user.id && request.assignedTo !== req.user.id) {
                return res.status(401).json({ message: 'Unauthorized' });
            }
            
            res.json(request);
        })
        .catch(next);
}

function getByRequesterId(req, res, next) {
    // Users can only view their own requests
    // Admins and moderators can view all requests
    if (req.params.id !== req.user.id && 
        req.user.role !== Role.Admin && req.user.role !== Role.Moderator) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    
    requestService.getByRequesterId(req.params.id)
        .then(requests => res.json(requests))
        .catch(next);
}

function getByAssignedTo(req, res, next) {
    // Users can only view requests assigned to them
    // Admins and moderators can view all requests
    if (req.params.id !== req.user.id && 
        req.user.role !== Role.Admin && req.user.role !== Role.Moderator) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    
    requestService.getByAssignedTo(req.params.id)
        .then(requests => res.json(requests))
        .catch(next);
}

async function getMyRequests(req, res, next) {
    try {
        // Get employee ID for current user
        const employee = await employeeService.getByAccountId(req.user.id);
        
        const requests = await requestService.getByRequesterId(employee.id);
        res.json(requests);
    } catch (error) {
        next(error);
    }
}

async function getAssignedToMe(req, res, next) {
    try {
        // Get employee ID for current user
        const employee = await employeeService.getByAccountId(req.user.id);
        
        const requests = await requestService.getByAssignedTo(employee.id);
        res.json(requests);
    } catch (error) {
        next(error);
    }
}

function createSchema(req, res, next) {
    const schema = Joi.object({
        title: Joi.string().required(),
        description: Joi.string().required(),
        requestType: Joi.string().required(),
        requesterId: Joi.number().required(),
        assignedTo: Joi.number(),
        priority: Joi.string().valid('Low', 'Medium', 'High', 'Urgent'),
        dueDate: Joi.date()
    });
    validateRequest(req, next, schema);
}

async function create(req, res, next) {
    try {
        // Ensure requester is the current user or user is admin
        if (req.body.requesterId != req.user.id && req.user.role !== Role.Admin) {
            return res.status(401).json({ message: 'Unauthorized: Cannot create requests for other users' });
        }
        
        const request = await requestService.create(req.body);
        res.json(request);
    } catch (error) {
        next(error);
    }
}

function updateSchema(req, res, next) {
    const schema = Joi.object({
        title: Joi.string(),
        description: Joi.string(),
        requestType: Joi.string(),
        assignedTo: Joi.number(),
        priority: Joi.string().valid('Low', 'Medium', 'High', 'Urgent'),
        dueDate: Joi.date()
    }).min(1);
    validateRequest(req, next, schema);
}

async function update(req, res, next) {
    try {
        const request = await requestService.getById(req.params.id);
        
        // Check if user is authorized to update this request
        if (req.user.role !== Role.Admin && req.user.role !== Role.Moderator && 
            request.requesterId !== req.user.id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        
        // Regular users cannot assign requests
        if (req.body.assignedTo && req.user.role === Role.User) {
            return res.status(401).json({ message: 'Unauthorized: Cannot assign requests' });
        }
        
        const updatedRequest = await requestService.update(req.params.id, req.body);
        res.json(updatedRequest);
    } catch (error) {
        next(error);
    }
}

function statusSchema(req, res, next) {
    const schema = Joi.object({
        status: Joi.string().valid('Pending', 'In Progress', 'Under Review', 'Approved', 'Rejected', 'Completed', 'Cancelled').required(),
        comments: Joi.string().required()
    });
    validateRequest(req, next, schema);
}

async function changeStatus(req, res, next) {
    try {
        const request = await requestService.getById(req.params.id);
        
        // Check if user is authorized to change status
        // Only admins, moderators, requesters, or assignees can change status
        if (req.user.role !== Role.Admin && req.user.role !== Role.Moderator && 
            request.requesterId !== req.user.id && request.assignedTo !== req.user.id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        
        // Regular users can only cancel their own requests
        if (req.user.role === Role.User && 
            request.requesterId === req.user.id && 
            req.body.status !== 'Cancelled') {
            return res.status(401).json({ message: 'Unauthorized: Can only cancel your own requests' });
        }
        
        // Only assignees, moderators, and admins can change to statuses other than 'Cancelled'
        if (req.user.role === Role.User && 
            request.assignedTo !== req.user.id && 
            req.body.status !== 'Cancelled') {
            return res.status(401).json({ message: 'Unauthorized: Only assignees can update request status' });
        }
        
        const result = await requestService.changeStatus(req.params.id, {
            status: req.body.status,
            handledById: req.user.id,
            comments: req.body.comments
        });
        
        res.json(result);
    } catch (error) {
        next(error);
    }
}

function _delete(req, res, next) {
    requestService.delete(req.params.id)
        .then(() => res.json({ message: 'Request deleted successfully' }))
        .catch(next);
} 