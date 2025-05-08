const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('../_middleware/validate-request');
const authorize = require('../_middleware/authorize');
const Role = require('../_helpers/role');
const employeeService = require('./employee.service');

// routes
router.get('/', authorize(), getAll);
router.get('/:id', authorize(), getById);
router.get('/account/:id', authorize(), getByAccountId);
router.post('/', authorize(Role.Admin), createSchema, create);
router.put('/:id', authorize(), updateSchema, update);
router.delete('/:id', authorize(Role.Admin), _delete);

module.exports = router;

function getAll(req, res, next) {
    employeeService.getAll()
        .then(employees => res.json(employees))
        .catch(next);
}

function getById(req, res, next) {
    employeeService.getById(req.params.id)
        .then(employee => res.json(employee))
        .catch(next);
}

function getByAccountId(req, res, next) {
    employeeService.getByAccountId(req.params.id)
        .then(employee => res.json(employee))
        .catch(next);
}

function createSchema(req, res, next) {
    const schema = Joi.object({
        accountId: Joi.number().required(),
        employeeId: Joi.string().required(),
        departmentId: Joi.number(),
        position: Joi.string().required(),
        hireDate: Joi.date().required(),
        salary: Joi.number(),
        status: Joi.string()
    });
    validateRequest(req, next, schema);
}

function create(req, res, next) {
    employeeService.create(req.body)
        .then(employee => res.json(employee))
        .catch(next);
}

function updateSchema(req, res, next) {
    const schema = Joi.object({
        employeeId: Joi.string(),
        departmentId: Joi.number(),
        position: Joi.string(),
        hireDate: Joi.date(),
        salary: Joi.number(),
        status: Joi.string()
    }).min(1);
    validateRequest(req, next, schema);
}

function update(req, res, next) {
    // Restrict non-admin users to updating only their own employee record
    if (req.params.id !== req.user.id && req.user.role !== Role.Admin) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    employeeService.update(req.params.id, req.body)
        .then(employee => res.json(employee))
        .catch(next);
}

function _delete(req, res, next) {
    employeeService.delete(req.params.id)
        .then(() => res.json({ message: 'Employee deleted successfully' }))
        .catch(next);
} 