const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('../_middleware/validate-request');
const authorize = require('../_middleware/authorize');
const Role = require('../_helpers/role');
const workflowService = require('./workflow.service');

// routes
router.get('/', authorize(), getAll);
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

function getByRequestId(req, res, next) {
    workflowService.getByRequestId(req.params.requestId)
        .then(workflows => res.json(workflows))
        .catch(next);
}

function getById(req, res, next) {
    workflowService.getById(req.params.id)
        .then(workflow => res.json(workflow))
        .catch(next);
}

function createSchema(req, res, next) {
    const schema = Joi.object({
        requestId: Joi.number().required(),
        stage: Joi.string().required(),
        status: Joi.string().valid('Pending', 'Completed', 'Skipped', 'Failed').required(),
        handledBy: Joi.number().allow(null),
        comments: Joi.string().allow('', null),
        completedAt: Joi.date().allow(null)
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
        stage: Joi.string().empty(''),
        status: Joi.string().valid('Pending', 'Completed', 'Skipped', 'Failed').empty(''),
        handledBy: Joi.number().allow(null),
        comments: Joi.string().allow('', null),
        completedAt: Joi.date().allow(null)
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