const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('../_middleware/validate-request');
const authorize = require('../_middleware/authorize');
const Role = require('../_helpers/role');
const workflowService = require('./workflow.service');

// routes
router.get('/', authorize(), getAll);
router.get('/employee/:employeeId', authorize(), getByEmployeeId);
router.get('/request/:requestId', authorize(), getByRequestId);
router.get('/:id', authorize(), getById);
router.post('/', authorize(Role.Admin, Role.Moderator), createSchema, create);
router.put('/:id', authorize(Role.Admin, Role.Moderator), updateSchema, update);
router.delete('/:id', authorize(Role.Admin), _delete);

module.exports = router;

function getAll(req, res, next) {
    workflowService.getAll()
        .then(workflows => res.json(workflows))
        .catch(next);
}

function getById(req, res, next) {
    workflowService.getById(req.params.id)
        .then(workflow => res.json(workflow))
        .catch(next);
}

function getByEmployeeId(req, res, next) {
    workflowService.getByEmployeeId(req.params.employeeId)
        .then(workflows => res.json(workflows))
        .catch(next);
}

function getByRequestId(req, res, next) {
    workflowService.getByRequestId(req.params.requestId)
        .then(workflows => res.json(workflows))
        .catch(next);
}

function createSchema(req, res, next) {
    const schema = Joi.object({
        requestId: Joi.number().required(),
        step: Joi.number().required().default(1),
        status: Joi.string().valid('Pending', 'Approved', 'Rejected').required().default('Pending'),
        handledBy: Joi.number().allow(null),
        notes: Joi.string().allow('', null)
    });
    validateRequest(req, next, schema);
}

function create(req, res, next) {
    workflowService.create(req.body)
        .then(workflow => res.json(workflow))
        .catch(next);
}

function updateSchema(req, res, next) {
    const schema = Joi.object({
        step: Joi.number(),
        status: Joi.string().valid('Pending', 'Approved', 'Rejected'),
        handledBy: Joi.number().allow(null),
        notes: Joi.string().allow('', null)
    });
    validateRequest(req, next, schema);
}

function update(req, res, next) {
    workflowService.update(req.params.id, req.body)
        .then(workflow => res.json(workflow))
        .catch(next);
}

function _delete(req, res, next) {
    workflowService.delete(req.params.id)
        .then(() => res.json({ message: 'Workflow deleted successfully' }))
        .catch(next);
} 