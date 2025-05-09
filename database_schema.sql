-- Database Schema for Employee Management System

-- Accounts Table
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('Admin', 'User', 'Manager', 'HR')),
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Departments Table
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employees Table
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id),
    employee_number VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    department_id INTEGER REFERENCES departments(id),
    position VARCHAR(100),
    hire_date DATE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Drop tables if they exist (in correct order)
DROP TABLE IF EXISTS workflows;
DROP TABLE IF EXISTS requests;

-- Create Requests table first
CREATE TABLE requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    requestNumber VARCHAR(20) NOT NULL UNIQUE,
    employeeId INT NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending',
    createdDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lastModifiedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employeeId) REFERENCES employees(id),
    CHECK (type IN ('Equipment', 'Leave', 'Resources')),
    CHECK (status IN ('Pending', 'Approved', 'Rejected'))
);

-- Create Workflows table without reference to Requests
CREATE TABLE workflows (
    id INT AUTO_INCREMENT PRIMARY KEY,
    requestId INT NULL,  -- Made nullable and removed foreign key
    employeeid INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    details TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending',
    datetimecreated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employeeid) REFERENCES employees(id),
    CHECK (type IN ('Leave Request', 'Equipment Request', 'Department Change', 'Other')),
    CHECK (status IN ('Pending', 'Approved', 'Rejected'))
);

-- Request Items Table
CREATE TABLE request_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
);

-- Request Attachments Table
CREATE TABLE request_attachments (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(512) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Request Approvers Table
CREATE TABLE request_approvers (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE,
    approver_id INTEGER REFERENCES employees(id),
    step_number INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    notes TEXT,
    action_date TIMESTAMP,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Department Change History Table
CREATE TABLE department_changes (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    old_department_id INTEGER REFERENCES departments(id),
    new_department_id INTEGER REFERENCES departments(id),
    request_id INTEGER REFERENCES requests(id),
    change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Indexes
CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_requests_employee ON requests(employeeId);
CREATE INDEX idx_request_items_request ON request_items(request_id);
CREATE INDEX idx_request_attachments_request ON request_attachments(request_id);
CREATE INDEX idx_request_approvers_request ON request_approvers(request_id);
CREATE INDEX idx_request_approvers_approver ON request_approvers(approver_id);
CREATE INDEX idx_department_changes_employee ON department_changes(employee_id);

-- Triggers
CREATE OR REPLACE FUNCTION update_last_modified_date()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_modified_date = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply last_modified_date trigger to relevant tables
CREATE TRIGGER update_accounts_last_modified
    BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_last_modified_date();

CREATE TRIGGER update_departments_last_modified
    BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_last_modified_date();

CREATE TRIGGER update_employees_last_modified
    BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_last_modified_date();

CREATE TRIGGER update_requests_last_modified
    BEFORE UPDATE ON requests
    FOR EACH ROW EXECUTE FUNCTION update_last_modified_date();

CREATE TRIGGER update_request_items_last_modified
    BEFORE UPDATE ON request_items
    FOR EACH ROW EXECUTE FUNCTION update_last_modified_date(); 