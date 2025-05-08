import { Injectable } from '@angular/core';
import { HttpRequest, HttpResponse, HttpHandler, HttpEvent, HttpInterceptor, HTTP_INTERCEPTORS, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay, materialize, dematerialize } from 'rxjs/operators';

import { AlertService } from '@app/_services';
import { Role } from '@app/_models';

// array in local storage for accounts
const accountsKey = 'angular-10-registration-login-example-accounts';
let accounts = JSON.parse(localStorage.getItem(accountsKey)) || [];

// array in local storage for employees
const employeesKey = 'angular-employees';
let employees = JSON.parse(localStorage.getItem(employeesKey)) || [];

// array in local storage for departments
const departmentsKey = 'angular-departments';
let departments = JSON.parse(localStorage.getItem(departmentsKey)) || [
    { id: 1, name: 'HR', description: 'Human Resources' },
    { id: 2, name: 'IT', description: 'Information Technology' },
    { id: 3, name: 'Finance', description: 'Finance Department' },
    { id: 4, name: 'Marketing', description: 'Marketing Department' }
];

// array in local storage for requests
const requestsKey = 'angular-requests';
let requests = JSON.parse(localStorage.getItem(requestsKey)) || [];

// array in local storage for workflows
const workflowsKey = 'angular-workflows';
let workflows = JSON.parse(localStorage.getItem(workflowsKey)) || [];

@Injectable()
export class FakeBackendInterceptor implements HttpInterceptor {
    constructor(private alertService: AlertService) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const { url, method, headers, body } = request;
        const alertService = this.alertService;

        return handleRoute();

        function handleRoute() {
            switch (true) {
                case url.endsWith('/accounts/authenticate') && method === 'POST':
                    return authenticate();
                case url.endsWith('/accounts/refresh-token') && method === 'POST':
                    return refreshToken();
                case url.endsWith('/accounts/revoke-token') && method === 'POST':
                    return revokeToken();
                case url.endsWith('/accounts/register') && method === 'POST':
                    return register();
                case url.endsWith('/accounts/verify-email') && method === 'POST':
                    return verifyEmail();
                case url.endsWith('/accounts/forgot-password') && method === 'POST':
                    return forgotPassword();
                case url.endsWith('/accounts/validate-reset-token') && method === 'POST':
                    return validateResetToken();
                case url.endsWith('/accounts/reset-password') && method === 'POST':
                    return resetPassword();
                case url.endsWith('/accounts') && method === 'GET':
                    return getAccounts();
                case url.match(/\/accounts\/\d+$/) && method === 'GET':
                    return getAccountById();
                case url.endsWith('/accounts') && method === 'POST':
                    return createAccount();
                case url.match(/\/accounts\/\d+$/) && method === 'PUT':
                    return updateAccount();
                case url.match(/\/accounts\/\d+$/) && method === 'DELETE':
                    return deleteAccount();
                    
                // employee routes
                case url.endsWith('/employees') && method === 'GET':
                    return getEmployees();
                case url.match(/\/employees\/\d+$/) && method === 'GET':
                    return getEmployeeById();
                case url.match(/\/employees\/account\/\d+$/) && method === 'GET':
                    return getEmployeeByAccountId();
                case url.endsWith('/employees') && method === 'POST':
                    return createEmployee();
                case url.match(/\/employees\/\d+$/) && method === 'PUT':
                    return updateEmployee();
                case url.match(/\/employees\/\d+$/) && method === 'DELETE':
                    return deleteEmployee();
                    
                // department routes
                case url.endsWith('/departments') && method === 'GET':
                    return getDepartments();
                case url.match(/\/departments\/\d+$/) && method === 'GET':
                    return getDepartmentById();
                case url.endsWith('/departments') && method === 'POST':
                    return createDepartment();
                case url.match(/\/departments\/\d+$/) && method === 'PUT':
                    return updateDepartment();
                case url.match(/\/departments\/\d+$/) && method === 'DELETE':
                    return deleteDepartment();
                    
                // request routes
                case url.endsWith('/requests') && method === 'GET':
                    return getRequests();
                case url.match(/\/requests\/\d+$/) && method === 'GET':
                    return getRequestById();
                case url.endsWith('/requests/my-requests') && method === 'GET':
                    return getMyRequests();
                case url.endsWith('/requests/assigned-to-me') && method === 'GET':
                    return getAssignedToMe();
                case url.endsWith('/requests') && method === 'POST':
                    return createRequest();
                case url.match(/\/requests\/\d+$/) && method === 'PUT':
                    return updateRequest();
                case url.match(/\/requests\/\d+\/status$/) && method === 'PUT':
                    return changeRequestStatus();
                case url.match(/\/requests\/\d+$/) && method === 'DELETE':
                    return deleteRequest();
                    
                default:
                    // pass through any requests not handled above
                    return next.handle(request);
            }
        }

        // route functions
        function authenticate() {
            const { email, password } = body;
            const account = accounts.find(x => x.email === email);
        
            if (!account) {
                return error('Email does not exist');
            }
        
            if (!account.isVerified) {
                // Display verification email alert
                setTimeout(() => {
                    const verifyUrl = `${location.origin}/account/verify-email?token=${account.verificationToken}`;
                    alertService.info(`
                        <h4>Verification Email</h4>
                        <p>Please click the below link to verify your email address:</p>
                        <p><a href="${verifyUrl}">${verifyUrl}</a></p>
                    `, { autoClose: false });
                }, 1000);
        
                return error('Email is not yet verified');
            }
        
            if (account.password !== password) {
                return error('Incorrect password');
            }
        
            if (account.status !== 'Active') {
                return error('Account is inactive. Please contact support.');
            }
        
            account.refreshTokens.push(generateRefreshToken());
            localStorage.setItem(accountsKey, JSON.stringify(accounts));
        
            return ok({
                ...basicDetails(account),
                jwtToken: generateJwtToken(account)
            });
        }
        
        

        function refreshToken() {
            const refreshToken = getRefreshToken();

            if (!refreshToken) return unauthorized();

            const account = accounts.find(x => x.refreshTokens.includes(refreshToken));

            if (!account) return unauthorized();

            // replace old refresh token with a new one and save
            account.refreshTokens = account.refreshTokens.filter(x => x !== refreshToken);
            account.refreshTokens.push(generateRefreshToken());
            localStorage.setItem(accountsKey, JSON.stringify(accounts));

            return ok({
                ...basicDetails(account),
                jwtToken: generateJwtToken(account)
            });
        }

        function revokeToken() {
            if (!isAuthenticated()) return unauthorized();

            const refreshToken = getRefreshToken();
            const account = accounts.find(x => x.refreshTokens.includes(refreshToken));

            // revoke token and save
            account.refreshTokens = account.refreshTokens.filter(x => x !== refreshToken);
            localStorage.setItem(accountsKey, JSON.stringify(accounts));

            return ok();
        }

        function register() {
            const account = body;

            if (accounts.find(x => x.email === account.email)) {
                // display email already registered message in alert
                setTimeout(() => {
                    alertService.info(`
                        <h4>Email Already Registered</h4>
                        <p>Your email ${account.email} is already registered.</p>
                        <p>If you don't know your password please visit the <a href="${location.origin}/account/forgot-password">forgot password</a> page.</p>
                        <div>
                        <strong>NOTE:</strong> The fake backend displayed this "email" so you can test without an API. A real backend would send a real email.
                        </div>
                    `, { autoclose: false });
                }, 1000);

                // always return ok() response to prevent email enumeration
                return ok();
            }

            // assign account id and a few other properties then save
            account.id = newAccountId();
            if (account.id === 1) {
                // first registered account is an admin
                account.role = Role.Admin;
                account.status = 'Active'; // Admin accounts get active status
            } else {
                account.role = Role.User;
                account.status = 'Inactive'; // User accounts get inacitve status upon creation
            }
            account.dateCreated = new Date().toISOString();
            account.verificationToken = new Date().getTime().toString();
            account.isVerified = false;
            account.refreshTokens = [];
            delete account.confirmPassword;
            accounts.push(account);
            localStorage.setItem(accountsKey, JSON.stringify(accounts));

            // display verification email in alert
            setTimeout(() => {
                const verifyUrl = `${location.origin}/account/verify-email?token=${account.verificationToken}`;
                alertService.info(`
                    <h4>Verification Email</h4>
                    <p>Thanks for registering!</p>
                    <p>Please click the below link to verify your email address:</p>
                    <p><a href="${verifyUrl}">${verifyUrl}</a></p>
                    <div><strong>NOTE:</strong> The fake backend displayed this "email" so you can test without an API. A real backend would send a real email.</div>
                `, { autoclose: false });
            }, 1000);

            return ok();
        }

        function verifyEmail() {
            const { token } = body;
            const account = accounts.find(x => !!x.verificationToken && x.verificationToken === token);

            if (!account) return error('Verification failed');

            // set is verified flag to true if token is valid
            account.isVerified = true;
            localStorage.setItem(accountsKey, JSON.stringify(accounts));

            return ok();
        }

        function forgotPassword() {
            const { email } = body;
            const account = accounts.find(x => x.email === email);

            // always return ok() response to prevent email enumeration
            if (!account) return ok();

            // create reset token that expires after 24 hours
            account.resetToken = new Date().getTime().toString();
            account.resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            localStorage.setItem(accountsKey, JSON.stringify(accounts));

            // display password reset email in alert
            setTimeout(() => {
                const resetUrl = `${location.origin}/account/reset-password?token=${account.resetToken}`;
                alertService.info(`
                    <h4>Reset Password Email</h4>
                    <p>Please click the below link to reset your password, the link will be valid for 1 day:</p>
                    <p><a href="${resetUrl}">${resetUrl}</a></p>
                    <div><strong>NOTE:</strong> The fake backend displayed this "email" so you can test without an API. A real backend would send a real email.</div>
                `, { autoClose: false });
            }, 1000);

            return ok();
        }

        function validateResetToken() {
            const { token } = body;
            const account = accounts.find(x =>
                !!x.resetToken &&
                x.resetToken === token &&
                new Date() < new Date(x.resetTokenExpires)
            );

            if (!account) return error("Invalid token");

            return ok();
        }

        function resetPassword() {
            const { token, password } = body;
            const account = accounts.find(x =>
                !!x.resetToken && x.resetToken === token &&
                new Date() < new Date(x.resetTokenExpires)
            );

            if (!account) return error('Invalid token');

            // update password and remove reset token
            account.password = password;
            account.isVerified = true;
            delete account.resetToken;
            delete account.resetTokenExpires;
            localStorage.setItem(accountsKey, JSON.stringify(accounts));

            return ok();
        }

        function getAccounts() {
            if (!isAuthenticated()) return unauthorized();
            return ok(accounts.map(x => basicDetails(x)));
        }

        function getAccountById() {
            if (!isAuthenticated()) return unauthorized();

            let account = accounts.find(x => x.id === idFromUrl());

            // user accounts can get own profile and admin accounts can get all profiles
            if (account.id !== currentAccount().id && !isAuthorized(Role.Admin)) {
                return unauthorized();
            }

            return ok(basicDetails(account));

        }

        function createAccount() {
            if (!isAuthorized(Role.Admin)) return unauthorized();

            const account = body;
            if (accounts.find(x => x.email === account.email)) {
                return error(`Email ${account.email} is already registered`);
            }

            // assign account id and a few other properties then save
            account.id = newAccountId();
            account.status = 'Inactive';
            account.dateCreated = new Date().toISOString();
            account.isVerified = true;
            account.refreshTokens = [];
            delete account.confirmPassword;
            accounts.push(account);
            localStorage.setItem(accountsKey, JSON.stringify(accounts));

            return ok();
        }

        function updateAccount() {
            if (!isAuthenticated()) return unauthorized();

            let params = body;
            let account = accounts.find(x => x.id == idFromUrl());

            // user accounts can update own profile and admin accounts can update all profiles
            if (account.id != currentAccount().id && !isAuthorized(Role.Admin)) {
                return unauthorized();
            }

            // only update password if included
            if (!params.password) {
                delete params.password;
            }
            // don't save confirm password
            delete params.confirmPassword;

            // update and save account
            Object.assign(account, params);
            localStorage.setItem(accountsKey, JSON.stringify(accounts));

            return ok(basicDetails(account));
        }

        function deleteAccount() {
            if (!isAuthenticated()) return unauthorized();

            let account = accounts.find(x => x.id === idFromUrl());

            // user accounts can delete own account and admin accounts can delete any account
            if (account.id !== currentAccount().id && !isAuthorized(Role.Admin)) {
                return unauthorized();
            }

            // delete account then save
            accounts = accounts.filter(x => x.id !== idFromUrl());
            localStorage.setItem(accountsKey, JSON.stringify(accounts));

            return ok();
        }

        // employee functions
        function getEmployees() {
            if (!isAuthenticated()) return unauthorized();
            if (!isAdmin() && !isModerator()) return unauthorized();
            
            return ok(employees.map(x => {
                const account = accounts.find(a => a.id === x.accountId);
                return {
                    ...x,
                    account: account ? basicDetails(account) : null
                };
            }));
        }
        
        function getEmployeeById() {
            if (!isAuthenticated()) return unauthorized();
            
            const employee = employees.find(x => x.id === idFromUrl());
            if (!employee) return notFound();
            
            // users can get their own employee record and admins/moderators can get any
            const account = accounts.find(a => a.id === employee.accountId);
            const accountId = account ? account.id : null;
            
            if (accountId !== currentAccount().id && !isAdmin() && !isModerator()) 
                return unauthorized();
                
            return ok({
                ...employee,
                account: account ? basicDetails(account) : null
            });
        }
        
        function getEmployeeByAccountId() {
            if (!isAuthenticated()) return unauthorized();
            
            const accountId = parseInt(url.split('/').pop());
            const employee = employees.find(x => x.accountId === accountId);
            if (!employee) return notFound();
            
            // users can get their own employee record and admins/moderators can get any
            if (accountId !== currentAccount().id && !isAdmin() && !isModerator()) 
                return unauthorized();
                
            const account = accounts.find(a => a.id === employee.accountId);
            return ok({
                ...employee,
                account: account ? basicDetails(account) : null
            });
        }
        
        function createEmployee() {
            if (!isAuthenticated()) return unauthorized();
            if (!isAdmin()) return unauthorized();
            
            const employee = body;
            
            if (employees.find(x => x.accountId === employee.accountId))
                return error('Employee already exists for this account');
                
            // assign employee id and other properties
            employee.id = newEmployeeId();
            employee.created = new Date().toISOString();
            employee.status = employee.status || 'Active';
            
            employees.push(employee);
            localStorage.setItem(employeesKey, JSON.stringify(employees));
            
            return ok(employee);
        }
        
        function updateEmployee() {
            if (!isAuthenticated()) return unauthorized();
            
            const employee = employees.find(x => x.id === idFromUrl());
            if (!employee) return notFound();
            
            const account = accounts.find(a => a.id === employee.accountId);
            const accountId = account ? account.id : null;
            
            // users can update their own employee record and admins can update any
            if (accountId !== currentAccount().id && !isAdmin()) 
                return unauthorized();
                
            // only allow admins to update accountId
            if (body.accountId !== employee.accountId && !isAdmin())
                return unauthorized();
                
            // copy body properties to employee
            Object.assign(employee, body);
            employee.updated = new Date().toISOString();
            
            localStorage.setItem(employeesKey, JSON.stringify(employees));
            
            return ok({
                ...employee,
                account: account ? basicDetails(account) : null
            });
        }
        
        function deleteEmployee() {
            if (!isAuthenticated()) return unauthorized();
            if (!isAdmin()) return unauthorized();
            
            employees = employees.filter(x => x.id !== idFromUrl());
            localStorage.setItem(employeesKey, JSON.stringify(employees));
            
            return ok();
        }
        
        // department functions
        function getDepartments() {
            if (!isAuthenticated()) return unauthorized();
            
            return ok(departments);
        }
        
        function getDepartmentById() {
            if (!isAuthenticated()) return unauthorized();
            
            const department = departments.find(x => x.id === idFromUrl());
            if (!department) return notFound();
            
            return ok(department);
        }
        
        function createDepartment() {
            if (!isAuthenticated()) return unauthorized();
            if (!isAdmin()) return unauthorized();
            
            const department = body;
            
            if (departments.find(x => x.name === department.name))
                return error('Department with this name already exists');
                
            // assign department id
            department.id = newDepartmentId();
            
            departments.push(department);
            localStorage.setItem(departmentsKey, JSON.stringify(departments));
            
            return ok(department);
        }
        
        function updateDepartment() {
            if (!isAuthenticated()) return unauthorized();
            if (!isAdmin()) return unauthorized();
            
            const department = departments.find(x => x.id === idFromUrl());
            if (!department) return notFound();
            
            // copy body properties to department
            Object.assign(department, body);
            
            localStorage.setItem(departmentsKey, JSON.stringify(departments));
            
            return ok(department);
        }
        
        function deleteDepartment() {
            if (!isAuthenticated()) return unauthorized();
            if (!isAdmin()) return unauthorized();
            
            departments = departments.filter(x => x.id !== idFromUrl());
            localStorage.setItem(departmentsKey, JSON.stringify(departments));
            
            return ok();
        }
        
        // request functions
        function getRequests() {
            if (!isAuthenticated()) return unauthorized();
            if (!isAdmin() && !isModerator()) return unauthorized();
            
            return ok(requests.map(x => {
                const requester = employees.find(e => e.id === x.requesterId);
                const requesterAccount = requester ? accounts.find(a => a.id === requester.accountId) : null;
                
                const assignee = x.assignedTo ? employees.find(e => e.id === x.assignedTo) : null;
                const assigneeAccount = assignee ? accounts.find(a => a.id === assignee.accountId) : null;
                
                return {
                    ...x,
                    requester: requester ? {
                        ...requester,
                        account: requesterAccount ? basicDetails(requesterAccount) : null
                    } : null,
                    assignee: assignee ? {
                        ...assignee,
                        account: assigneeAccount ? basicDetails(assigneeAccount) : null
                    } : null,
                    workflows: workflows.filter(w => w.requestId === x.id)
                };
            }));
        }
        
        function getRequestById() {
            if (!isAuthenticated()) return unauthorized();
            
            const request = requests.find(x => x.id === idFromUrl());
            if (!request) return notFound();
            
            const requester = employees.find(e => e.id === request.requesterId);
            const requesterAccount = requester ? accounts.find(a => a.id === requester.accountId) : null;
            const requesterAccountId = requesterAccount ? requesterAccount.id : null;
            
            const assignee = request.assignedTo ? employees.find(e => e.id === request.assignedTo) : null;
            const assigneeAccount = assignee ? accounts.find(a => a.id === assignee.accountId) : null;
            const assigneeAccountId = assigneeAccount ? assigneeAccount.id : null;
            
            // users can only view their own requests or requests assigned to them
            // admins and moderators can view all requests
            if (!isAdmin() && !isModerator() && 
                currentAccount().id !== requesterAccountId && 
                currentAccount().id !== assigneeAccountId) {
                return unauthorized();
            }
            
            return ok({
                ...request,
                requester: requester ? {
                    ...requester,
                    account: requesterAccount ? basicDetails(requesterAccount) : null
                } : null,
                assignee: assignee ? {
                    ...assignee,
                    account: assigneeAccount ? basicDetails(assigneeAccount) : null
                } : null,
                workflows: workflows.filter(w => w.requestId === request.id)
            });
        }
        
        function getMyRequests() {
            if (!isAuthenticated()) return unauthorized();
            
            // find employee for current account
            const employee = employees.find(x => {
                const account = accounts.find(a => a.id === x.accountId);
                return account && account.id === currentAccount().id;
            });
            
            if (!employee) return ok([]);
            
            const myRequests = requests.filter(x => x.requesterId === employee.id);
            
            return ok(myRequests.map(x => {
                const assignee = x.assignedTo ? employees.find(e => e.id === x.assignedTo) : null;
                const assigneeAccount = assignee ? accounts.find(a => a.id === assignee.accountId) : null;
                
                return {
                    ...x,
                    assignee: assignee ? {
                        ...assignee,
                        account: assigneeAccount ? basicDetails(assigneeAccount) : null
                    } : null
                };
            }));
        }
        
        function getAssignedToMe() {
            if (!isAuthenticated()) return unauthorized();
            
            // find employee for current account
            const employee = employees.find(x => {
                const account = accounts.find(a => a.id === x.accountId);
                return account && account.id === currentAccount().id;
            });
            
            if (!employee) return ok([]);
            
            const assignedRequests = requests.filter(x => x.assignedTo === employee.id);
            
            return ok(assignedRequests.map(x => {
                const requester = employees.find(e => e.id === x.requesterId);
                const requesterAccount = requester ? accounts.find(a => a.id === requester.accountId) : null;
                
                return {
                    ...x,
                    requester: requester ? {
                        ...requester,
                        account: requesterAccount ? basicDetails(requesterAccount) : null
                    } : null
                };
            }));
        }
        
        function createRequest() {
            if (!isAuthenticated()) return unauthorized();
            
            const request = body;
            
            // ensure requester is the current user or user is admin
            const employee = employees.find(x => {
                const account = accounts.find(a => a.id === x.accountId);
                return account && account.id === currentAccount().id;
            });
            
            if (!employee && !isAdmin())
                return unauthorized();
                
            if (request.requesterId !== employee.id && !isAdmin())
                return unauthorized();
                
            // assign request id and other properties
            request.id = newRequestId();
            request.status = 'Pending';
            request.created = new Date().toISOString();
            
            requests.push(request);
            localStorage.setItem(requestsKey, JSON.stringify(requests));
            
            // create initial workflow stage
            const initialWorkflow = {
                id: newWorkflowId(),
                requestId: request.id,
                stage: 'Submission',
                status: 'Completed',
                handledBy: currentAccount().id,
                comments: 'Request submitted',
                created: new Date().toISOString(),
                completedAt: new Date().toISOString()
            };
            workflows.push(initialWorkflow);
            
            // create next workflow stage
            const nextWorkflow = {
                id: newWorkflowId(),
                requestId: request.id,
                stage: 'Review',
                status: 'Pending',
                comments: 'Pending review',
                created: new Date().toISOString()
            };
            workflows.push(nextWorkflow);
            
            localStorage.setItem(workflowsKey, JSON.stringify(workflows));
            
            return ok(request);
        }
        
        function updateRequest() {
            if (!isAuthenticated()) return unauthorized();
            
            const request = requests.find(x => x.id === idFromUrl());
            if (!request) return notFound();
            
            const requester = employees.find(e => e.id === request.requesterId);
            const requesterAccount = requester ? accounts.find(a => a.id === requester.accountId) : null;
            const requesterAccountId = requesterAccount ? requesterAccount.id : null;
            
            // check if user is authorized to update this request
            if (!isAdmin() && !isModerator() && currentAccount().id !== requesterAccountId)
                return unauthorized();
                
            // regular users cannot assign requests
            if (body.assignedTo && body.assignedTo !== request.assignedTo && !isAdmin() && !isModerator())
                return unauthorized();
                
            // copy body properties to request
            Object.assign(request, body);
            request.updated = new Date().toISOString();
            
            localStorage.setItem(requestsKey, JSON.stringify(requests));
            
            return ok(request);
        }
        
        function changeRequestStatus() {
            if (!isAuthenticated()) return unauthorized();
            
            const request = requests.find(x => x.id === idFromUrl());
            if (!request) return notFound();
            
            const requester = employees.find(e => e.id === request.requesterId);
            const requesterAccount = requester ? accounts.find(a => a.id === requester.accountId) : null;
            const requesterAccountId = requesterAccount ? requesterAccount.id : null;
            
            const assignee = request.assignedTo ? employees.find(e => e.id === request.assignedTo) : null;
            const assigneeAccount = assignee ? accounts.find(a => a.id === assignee.accountId) : null;
            const assigneeAccountId = assigneeAccount ? assigneeAccount.id : null;
            
            // check if user is authorized to change status
            if (!isAdmin() && !isModerator() && 
                currentAccount().id !== requesterAccountId && 
                currentAccount().id !== assigneeAccountId)
                return unauthorized();
                
            // regular users can only cancel their own requests
            if (!isAdmin() && !isModerator() && 
                currentAccount().id === requesterAccountId && 
                body.status !== 'Cancelled')
                return unauthorized();
                
            // only assignees, moderators, and admins can change to statuses other than 'Cancelled'
            if (!isAdmin() && !isModerator() && 
                currentAccount().id !== assigneeAccountId && 
                body.status !== 'Cancelled')
                return unauthorized();
                
            const oldStatus = request.status;
            
            // update request status
            request.status = body.status;
            request.updated = new Date().toISOString();
            
            localStorage.setItem(requestsKey, JSON.stringify(requests));
            
            // find current workflow stage
            const currentWorkflow = workflows.find(x => 
                x.requestId === request.id && x.status === 'Pending');
                
            if (currentWorkflow) {
                // update current workflow stage
                currentWorkflow.status = 'Completed';
                currentWorkflow.handledBy = currentAccount().id;
                currentWorkflow.comments = body.comments;
                currentWorkflow.completedAt = new Date().toISOString();
                currentWorkflow.updated = new Date().toISOString();
                
                // create next workflow stage if needed
                if (body.status !== 'Completed' && body.status !== 'Rejected' && body.status !== 'Cancelled') {
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
                    
                    const nextWorkflow = {
                        id: newWorkflowId(),
                        requestId: request.id,
                        stage: nextStage,
                        status: 'Pending',
                        comments: `Pending ${nextStage.toLowerCase()}`,
                        created: new Date().toISOString()
                    };
                    workflows.push(nextWorkflow);
                }
                
                localStorage.setItem(workflowsKey, JSON.stringify(workflows));
            }
            
            return ok({
                request,
                statusChanged: oldStatus !== body.status
            });
        }
        
        function deleteRequest() {
            if (!isAuthenticated()) return unauthorized();
            if (!isAdmin() && !isModerator()) return unauthorized();
            
            requests = requests.filter(x => x.id !== idFromUrl());
            localStorage.setItem(requestsKey, JSON.stringify(requests));
            
            // delete associated workflows
            workflows = workflows.filter(x => x.requestId !== idFromUrl());
            localStorage.setItem(workflowsKey, JSON.stringify(workflows));
            
            return ok();
        }

        // helper functions
        function ok(body?) {
            return of(new HttpResponse({ status: 200, body }))
                .pipe(delay(500)); // delay observable to simulate server api call
        }

        function error(message) {
            return throwError({ error: { message } })
                .pipe(materialize(), delay(500), dematerialize()); // call materialize and dematerialize to ensure delay even if an error is thrown
        }

        function unauthorized() {
            return throwError({ status: 401, error: { message: 'Unauthorized' } })
                .pipe(materialize(), delay(500), dematerialize());
        }
        
        function notFound() {
            return throwError({ status: 404, error: { message: 'Not Found' } })
                .pipe(materialize(), delay(500), dematerialize());
        }

        function basicDetails(account) {
            const { id, title, firstName, lastName, email, role, created, updated, isVerified, status } = account;
            return { id, title, firstName, lastName, email, role, created, updated, isVerified, status };
        }

        function isAuthenticated() {
            return !!currentAccount();
        }

        function isAdmin() {
            const account = currentAccount();
            return account && account.role === Role.Admin;
        }
        
        function isModerator() {
            const account = currentAccount();
            return account && account.role === Role.Moderator;
        }
        
        function isAuthorized(role) {
            const account = currentAccount();
            return account && account.role === role;
        }

        function currentAccount() {
            // check if jwt token exists and is valid
            if (!headers.get('Authorization')) return;
            
            // check if jwt token is valid
            const jwtToken = JSON.parse(atob(headers.get('Authorization').split('.')[1]));
            const tokenExpired = Date.now() > (jwtToken.exp * 1000);
            if (tokenExpired) return;

            // check if user still exists
            const id = parseInt(jwtToken.id);
            return accounts.find(x => x.id === id);
        }

        function idFromUrl() {
            const urlParts = url.split('/');
            return parseInt(urlParts[urlParts.length - 1]);
        }

        function newAccountId() {
            return accounts.length ? Math.max(...accounts.map(x => x.id)) + 1 : 1;
        }
        
        function newEmployeeId() {
            return employees.length ? Math.max(...employees.map(x => x.id)) + 1 : 1;
        }
        
        function newDepartmentId() {
            return departments.length ? Math.max(...departments.map(x => x.id)) + 1 : 1;
        }
        
        function newRequestId() {
            return requests.length ? Math.max(...requests.map(x => x.id)) + 1 : 1;
        }
        
        function newWorkflowId() {
            return workflows.length ? Math.max(...workflows.map(x => x.id)) + 1 : 1;
        }

        function generateJwtToken(account) {
            // create token that expires in 15 minutes
            const tokenPayload = { 
                exp: Math.round(new Date(Date.now() + 15 * 60 * 1000).getTime() / 1000),
                id: account.id
            }
            return `fake-jwt-token.${btoa(JSON.stringify(tokenPayload))}`;
        }

        function generateRefreshToken() {
            const token = new Date().getTime().toString();

            // add token cookie that expires in 7 days
            const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
            document.cookie = `fakeRefreshToken=${token}; expires=${expires}; path=/`;

            return token;
        }

        function getRefreshToken() {
            // get refresh token from cookie
            return document.cookie.split(';').find(x => x.includes('fakeRefreshToken'))?.split('=')[1];
        }
    }
}

export const fakeBackendProvider = {
    // use fake backend in place of Http service for backend-less development
    provide: HTTP_INTERCEPTORS,
    useClass: FakeBackendInterceptor,
    multi: true
};
