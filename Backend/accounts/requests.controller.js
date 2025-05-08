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
router.get('/employee/:id', authorize(), getByRequesterId);
router.post('/', authorize(), createSchema, create);
router.put('/:id', authorize(), updateSchema, update);
router.put('/:id/status', authorize(), changeStatusSchema, changeStatus);
router.delete('/:id', authorize(), _delete);

module.exports = router;

function getAll(req, res, next) {
    requestService.getAll()
        .then(requests => res.json(requests))
        .catch(next);
}

function getById(req, res, next) {
    requestService.getById(req.params.id)
        .then(request => {
            // Users can only view their own requests
            // Admins and moderators can view all requests
            if (req.user.role !== Role.Admin && req.user.role !== Role.Moderator && 
                request.employeeId !== req.user.id) {
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

function createSchema(req, res, next) {
    const schema = Joi.object({
        title: Joi.string().required(),
        description: Joi.string().required(),
        requestType: Joi.string().required(),
        employeeId: Joi.number().required(),
        priority: Joi.string().valid('Low', 'Medium', 'High', 'Urgent'),
        dueDate: Joi.date()
    });
    validateRequest(req, next, schema);
}

function create(req, res, next) {
    requestService.create(req.body)
        .then(request => res.json(request))
        .catch(next);
}

function updateSchema(req, res, next) {
    const schema = Joi.object({
        title: Joi.string(),
        description: Joi.string(),
        requestType: Joi.string(),
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
            request.employeeId !== req.user.id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        
        const updatedRequest = await requestService.update(req.params.id, req.body);
        res.json(updatedRequest);
    } catch (error) {
        next(error);
    }
}

function changeStatusSchema(req, res, next) {
    const schema = Joi.object({
        status: Joi.string().valid('Draft', 'Submitted', 'In Progress', 'Approved', 'Rejected', 'Completed', 'Cancelled').required(),
        comments: Joi.string()
    });
    validateRequest(req, next, schema);
}

async function changeStatus(req, res, next) {
    try {
        const request = await requestService.getById(req.params.id);
        
        // Check if user is authorized to change status
        // Only admins, moderators, or the request owner can change status
        if (req.user.role !== Role.Admin && req.user.role !== Role.Moderator && 
            request.employeeId !== req.user.id) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        
        // Regular users can only cancel their own requests
        if (req.user.role === Role.User && 
            request.employeeId === req.user.id && 
            req.body.status !== 'Cancelled') {
            return res.status(401).json({ message: 'Unauthorized: Can only cancel your own requests' });
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

async function _delete(req, res, next) {
    try {
        const request = await requestService.getById(req.params.id);
        
        // Users can only delete their own draft requests
        // Admins can delete any request
        if (req.user.role !== Role.Admin && 
            (request.employeeId !== req.user.id || request.status !== 'Draft')) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        
        await requestService.delete(req.params.id);
        res.json({ message: 'Request deleted successfully' });
    } catch (error) {
        next(error);
    }
} 