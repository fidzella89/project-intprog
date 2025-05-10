import { Injectable } from '@angular/core';
import { HttpRequest, HttpResponse, HttpHandler, HttpEvent, HttpInterceptor, HTTP_INTERCEPTORS, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay, materialize, dematerialize } from 'rxjs/operators';

import { AlertService } from '@app/_services';
import { Role } from '@app/_models';

// array in local storage for accounts
const accountsKey = 'request-management-accounts';
let accounts = JSON.parse(localStorage.getItem(accountsKey)) || [];

// array in local storage for employees
const employeesKey = 'request-management-employees';
let employees = JSON.parse(localStorage.getItem(employeesKey)) || [];

// array in local storage for departments
const departmentsKey = 'request-management-departments';
let departments = JSON.parse(localStorage.getItem(departmentsKey)) || [
    { id: 1, name: 'HR', description: 'Human Resources' },
    { id: 2, name: 'IT', description: 'Information Technology' },
    { id: 3, name: 'Finance', description: 'Finance Department' },
    { id: 4, name: 'Marketing', description: 'Marketing Department' }
];

// array in local storage for requests and their items
const requestsKey = 'request-management-requests';
let requests = JSON.parse(localStorage.getItem(requestsKey)) || [];

// array in local storage for request items
const requestItemsKey = 'request-management-items';
let requestItems = JSON.parse(localStorage.getItem(requestItemsKey)) || [];

// array in local storage for workflows
const workflowsKey = 'request-management-workflows';
let workflows = JSON.parse(localStorage.getItem(workflowsKey)) || [];

// array in local storage for employee positions
const positionsKey = 'request-management-positions';
let positions = JSON.parse(localStorage.getItem(positionsKey)) || [
    { id: 1, name: 'Manager', description: 'Department Manager' },
    { id: 2, name: 'Team Lead', description: 'Team Leader' },
    { id: 3, name: 'Senior Staff', description: 'Senior Level Staff' },
    { id: 4, name: 'Junior Staff', description: 'Junior Level Staff' }
];

// array in local storage for request types
const requestTypesKey = 'request-management-request-types';
let requestTypes = JSON.parse(localStorage.getItem(requestTypesKey)) || [
    { id: 1, name: 'Leave Request', description: 'Request for leave or time off' },
    { id: 2, name: 'Equipment Request', description: 'Request for office equipment' },
    { id: 3, name: 'Training Request', description: 'Request for training or workshops' },
    { id: 4, name: 'Other', description: 'Other types of requests' }
];

// Helper functions for generating IDs
function newAccountId(): number {
    return accounts.length ? Math.max(...accounts.map(x => x.id)) + 1 : 1;
}

function newRequestId(): number {
    return requests.length ? Math.max(...requests.map(x => x.id)) + 1 : 1;
}

function newRequestItemId(): number {
    return requestItems.length ? Math.max(...requestItems.map(x => x.id)) + 1 : 1;
}

function newEmployeeId(): number {
    return employees.length ? Math.max(...employees.map(x => x.id)) + 1 : 1;
}

function newWorkflowId(): number {
    return workflows.length ? Math.max(...workflows.map(x => x.id)) + 1 : 1;
}

function newDepartmentId(): number {
    return departments.length ? Math.max(...departments.map(x => x.id)) + 1 : 1;
}

function newPositionId(): number {
    return positions.length ? Math.max(...positions.map(x => x.id)) + 1 : 1;
}

function newRequestTypeId(): number {
    return requestTypes.length ? Math.max(...requestTypes.map(x => x.id)) + 1 : 1;
}

// Helper functions for JWT and refresh tokens
function generateJwtToken(account: any): string {
    try {
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const now = new Date().getTime();
        const payload = {
            id: account.id,
            role: account.role,
            email: account.email,
            iat: now,
            exp: now + (60 * 60 * 1000) // 1 hour expiry
        };
        const payloadBase64 = btoa(JSON.stringify(payload));
        const signature = btoa('fake-jwt-secret-key');
        return `${header}.${payloadBase64}.${signature}`;
    } catch (error) {
        console.error('Error generating JWT token:', error);
        throw error;
    }
}

function generateRefreshToken(): string {
    try {
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const now = new Date().getTime();
        const payload = {
            id: Math.random().toString(36).substr(2),
            iat: now,
            exp: now + (7 * 24 * 60 * 60 * 1000) // 7 days expiry
        };
        const payloadBase64 = btoa(JSON.stringify(payload));
        const signature = btoa('fake-refresh-secret-key');
        return `${header}.${payloadBase64}.${signature}`;
    } catch (error) {
        console.error('Error generating refresh token:', error);
        throw error;
    }
}

function isTokenExpired(token: string): boolean {
    if (!token) return true;
    
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return true;
        
        const payload = JSON.parse(atob(parts[1]));
        if (!payload || typeof payload.exp !== 'number') return true;
        
        // Add a 5-minute buffer to prevent edge cases
        return (payload.exp - 5 * 60 * 1000) < new Date().getTime();
    } catch (error) {
        console.error('Error checking token expiration:', error);
        return true;
    }
}

@Injectable()
export class FakeBackendInterceptor implements HttpInterceptor {
    constructor(private alertService: AlertService) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const { url, method, headers, body } = request;
        const alertService = this.alertService;

        // Helper functions
        function ok(body?: any) {
            return of(new HttpResponse({ status: 200, body }));
        }

        function error(message: string) {
            return throwError(() => ({ error: { message } }));
        }

        function unauthorized() {
            return throwError(() => ({ status: 401, error: { message: 'Unauthorized' } }));
        }

        function notFound() {
            return throwError(() => ({ status: 404, error: { message: 'Not Found' } }));
        }

        function basicDetails(account: any) {
            const { id, title, firstName, lastName, email, role, status, isVerified } = account;
            return { id, title, firstName, lastName, email, role, status, isVerified };
        }

        function isAuthenticated() {
            try {
                const authHeader = headers.get('Authorization');
                if (!authHeader?.startsWith('Bearer ')) return false;
                
                const token = authHeader.split(' ')[1];
                if (isTokenExpired(token)) {
                    console.log('JWT token has expired');
                    return false;
                }
                
                const parts = token.split('.');
                const payload = JSON.parse(atob(parts[1]));
                const account = accounts.find(x => x.id === payload.id);
                
                return !!account;
            } catch (error) {
                console.error('Authentication check error:', error);
                return false;
            }
        }

        function isAdmin() {
            return currentAccount()?.role === Role.Admin;
        }

        function currentAccount() {
            if (!isAuthenticated()) return null;
            
            try {
                const token = headers.get('Authorization').split(' ')[1];
                const parts = token.split('.');
                const payload = JSON.parse(atob(parts[1]));
                return accounts.find(x => x.id === payload.id);
            } catch {
                return null;
            }
        }

        function idFromUrl() {
            const urlParts = url.split('/');
            return parseInt(urlParts[urlParts.length - 1]);
        }

        function getRefreshToken(headers: any): string | null {
            try {
                const authHeader = headers.get('Authorization');
                if (!authHeader?.startsWith('Bearer ')) return null;
                return authHeader.split(' ')[1];
            } catch {
                return null;
            }
        }

        function getWorkflowsByEmployeeId() {
            if (!isAuthenticated()) return unauthorized();
            
            const internalId = parseInt(url.split('/').pop());
            console.log('Looking for requests with employeeId:', internalId);

            const employee = employees.find(e => e.id === internalId);
            if (!employee) {
                console.log('Employee not found with internal id:', internalId);
                return notFound();
            }
            
            const employeeRequests = requests.filter(x => x.employeeId === employee.id);
            console.log('Found requests:', employeeRequests.length);

            // Sort requests in descending order by creation date
            const sortedRequests = [...employeeRequests].sort((a, b) => {
                const dateA = new Date(a.createdDate);
                const dateB = new Date(b.createdDate);
                return dateB.getTime() - dateA.getTime();
            });

            return ok(sortedRequests.map(request => {
                const items = requestItems.filter(item => item.requestId === request.id);
                const requestType = requestTypes.find(t => t.id === request.typeId);
                const account = accounts.find(a => a.id === employee.accountId);
                
                // Format employee name with proper capitalization
                const firstName = account?.firstName ? account.firstName.charAt(0).toUpperCase() + account.firstName.slice(1).toLowerCase() : '';
                const lastName = account?.lastName ? account.lastName.charAt(0).toUpperCase() + account.lastName.slice(1).toLowerCase() : '';
                const fullName = `${firstName} ${lastName}`.trim();

                return {
                    id: request.id,
                    type: requestType?.name || request.type,
                    status: request.status,
                    createdDate: request.createdDate,
                    items: items,
                    employee: {
                        id: employee.id,
                        employeeId: employee.employeeId,
                        fullName: fullName
                    }
                };
            }));
        }

        return handleRoute().pipe(
            delay(500),
            materialize(),
            dematerialize()
        );

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
                    
                // request routes
                case url.endsWith('/requests') && method === 'GET':
                    return getRequests();
                case url.match(/\/requests\/\d+$/) && method === 'GET':
                    return getRequestById();
                case url.match(/\/requests\/employee\/\d+$/) && method === 'GET':
                    return getRequestsByEmployeeId();
                case url.endsWith('/requests/my-requests') && method === 'GET':
                    return getMyRequests();
                case url.endsWith('/requests') && method === 'POST':
                    return createRequest();
                case url.match(/\/requests\/\d+$/) && method === 'PUT':
                    return updateRequest();
                case url.match(/\/requests\/\d+\/status$/) && method === 'PUT':
                    return changeRequestStatus();
                case url.match(/\/requests\/\d+$/) && method === 'DELETE':
                    return deleteRequest();
                    
                // employee routes
                case url.endsWith('/employees') && method === 'GET':
                    return getEmployees();
                case url.match(/\/employees\/\d+$/) && method === 'GET':
                    return getEmployeeById();
                case url.endsWith('/employees') && method === 'POST':
                    return createEmployee();
                case url.match(/\/employees\/\d+$/) && method === 'PUT':
                    return updateEmployee();
                case url.match(/\/employees\/\d+$/) && method === 'DELETE':
                    return deleteEmployee();
                case url.match(/\/employees\/\d+\/transfer$/) && method === 'PUT':
                    return transferEmployee();

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
                    
                // position routes
                case url.endsWith('/positions') && method === 'GET':
                    return getPositions();
                case url.match(/\/positions\/\d+$/) && method === 'GET':
                    return getPositionById();
                case url.endsWith('/positions') && method === 'POST':
                    return createPosition();
                case url.match(/\/positions\/\d+$/) && method === 'PUT':
                    return updatePosition();
                case url.match(/\/positions\/\d+$/) && method === 'DELETE':
                    return deletePosition();

                // request type routes
                case url.endsWith('/request-types') && method === 'GET':
                    return getRequestTypes();
                case url.match(/\/request-types\/\d+$/) && method === 'GET':
                    return getRequestTypeById();
                case url.endsWith('/request-types') && method === 'POST':
                    return createRequestType();
                case url.match(/\/request-types\/\d+$/) && method === 'PUT':
                    return updateRequestType();
                case url.match(/\/request-types\/\d+$/) && method === 'DELETE':
                    return deleteRequestType();

                // workflow routes
                case url.endsWith('/workflows') && method === 'GET':
                    return getWorkflows();
                case url.match(/\/workflows\/\d+$/) && method === 'GET':
                    return getWorkflowById();
                case url.match(/\/workflows\/employee\/\d+$/) && method === 'GET':
                    return getWorkflowsByEmployeeId();
                case url.match(/\/workflows\/request\/\d+$/) && method === 'GET':
                    return getWorkflowsByRequestId();
                case url.endsWith('/workflows') && method === 'POST':
                    return createWorkflow();
                case url.match(/\/workflows\/\d+$/) && method === 'PUT':
                    return updateWorkflow();
                case url.match(/\/workflows\/\d+\/status$/) && method === 'PUT':
                    return updateWorkflowStatus();
                case url.match(/\/workflows\/\d+$/) && method === 'DELETE':
                    return deleteWorkflow();
                case url.match(/\/workflows\/items\/\d+$/) && method === 'DELETE':
                    return deleteWorkflowItem();
                    
                default:
                    return next.handle(request);
            }
        }

        // Authentication functions
        function authenticate() {
            const { email, password } = body;
            const account = accounts.find(x => x.email === email);
        
            if (!account) return error('Email or password is incorrect');
            if (password !== account.password) return error('Email or password is incorrect');
            if (!account.isVerified) return error('Please verify your email before logging in');

            try {
                // Generate refresh token that expires in 7 days
                const refreshToken = generateRefreshToken();
                account.refreshTokens = account.refreshTokens || [];
                
                // Remove any expired refresh tokens
                account.refreshTokens = account.refreshTokens.filter(rt => !isTokenExpired(rt));
                
                account.refreshTokens.push(refreshToken);
                localStorage.setItem(accountsKey, JSON.stringify(accounts));

                const jwtToken = generateJwtToken(account);
        
            return ok({
                ...basicDetails(account),
                    jwtToken,
                    refreshToken
            });
            } catch (error) {
                console.error('Authentication error:', error);
                return error('An error occurred during authentication');
            }
        }

        function refreshToken() {
            try {
                const refreshToken = getRefreshToken(headers);
                if (!refreshToken) {
                    console.log('No refresh token found');
                    return unauthorized();
                }

            const account = accounts.find(x => x.refreshTokens?.includes(refreshToken));
                if (!account) {
                    console.log('No account found for refresh token');
                    return unauthorized();
                }

                // Verify refresh token hasn't expired
                if (isTokenExpired(refreshToken)) {
                    console.log('Refresh token has expired');
                    // Remove expired refresh token
            account.refreshTokens = account.refreshTokens.filter(x => x !== refreshToken);
            localStorage.setItem(accountsKey, JSON.stringify(accounts));
                    return unauthorized();
                }

                // Generate new tokens
                const newRefreshToken = generateRefreshToken();
                const jwtToken = generateJwtToken(account);

                // Update refresh tokens
                account.refreshTokens = account.refreshTokens.filter(x => x !== refreshToken && !isTokenExpired(x));
                account.refreshTokens.push(newRefreshToken);
                localStorage.setItem(accountsKey, JSON.stringify(accounts));

                console.log('Token refresh successful');
            return ok({
                ...basicDetails(account),
                    jwtToken,
                    refreshToken: newRefreshToken
            });
            } catch (error) {
                console.error('Refresh token error:', error);
                return unauthorized();
            }
        }

        function revokeToken() {
            if (!isAuthenticated()) return unauthorized();

            const refreshToken = getRefreshToken(headers);
            const account = accounts.find(x => x.refreshTokens?.includes(refreshToken));

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

        function getAccounts() {
            if (!isAuthenticated()) return unauthorized();
            return ok(accounts.map(x => basicDetails(x)));
        }

        function getAccountById() {
            if (!isAuthenticated()) return unauthorized();

            let account = accounts.find(x => x.id === idFromUrl());

            // user accounts can get own profile and admin accounts can get all profiles
            if (account.id !== currentAccount().id && !isAdmin()) {
                return unauthorized();
            }

            return ok(basicDetails(account));
        }

        // Request functions
        function getRequests() {
            if (!isAuthenticated()) return unauthorized();

            // Return all requests for admins, or filtered for regular users
            let filteredRequests = [...requests];
            if (!isAdmin()) {
                const currentUserId = currentAccount().id;
                filteredRequests = requests.filter(x => x.employeeId === currentUserId);
            }

            return ok(filteredRequests.map(request => {
                const items = requestItems.filter(item => item.requestId === request.id);
                const requestEmployee = employees.find(e => e.id === request.employeeId);
                const requestAccount = accounts.find(a => a.id === requestEmployee?.accountId);
                const requestType = requestTypes.find(t => t.id === request.typeId);

                return {
                    id: request.id,
                    employeeId: requestEmployee?.employeeId || '',
                    type: requestType?.name || request.type || '',
                    status: request.status,
                    createdDate: request.createdDate,
                    items: items,
                    employee: {
                        id: requestEmployee?.id,
                        employeeId: requestEmployee?.employeeId,
                        fullName: requestAccount ? `${requestAccount.firstName} ${requestAccount.lastName}`.trim() : ''
                    }
                };
            }));
        }

        function getRequestById() {
            if (!isAuthenticated()) return unauthorized();

            const request = requests.find(x => x.id === idFromUrl());
            if (!request) return notFound();

            // Check authorization
            if (!isAdmin() && request.employeeId !== currentAccount().id) {
                return unauthorized();
            }

            // Add related data
            const items = requestItems.filter(item => item.requestId === request.id);
            const employee = employees.find(e => e.id === request.employeeId);
            const account = accounts.find(a => a.id === employee?.accountId);
            const requestType = requestTypes.find(t => t.id === request.typeId);

            // Format employee name with proper capitalization
            const firstName = account?.firstName ? account.firstName.charAt(0).toUpperCase() + account.firstName.slice(1).toLowerCase() : '';
            const lastName = account?.lastName ? account.lastName.charAt(0).toUpperCase() + account.lastName.slice(1).toLowerCase() : '';
            const fullName = `${firstName} ${lastName}`.trim();

            return ok({
                ...request,
                items: items.map(item => ({
                    id: item.id,
                    name: item.name,
                    quantity: item.quantity
                })),
                employee: employee ? {
                    ...employee,
                    fullName: fullName,
                    employeeId: employee.employeeId
                } : null,
                type: requestType?.name || request.type
            });
        }

        function getRequestsByEmployeeId() {
            if (!isAuthenticated()) return unauthorized();
            
            const internalId = parseInt(url.split('/').pop());
            console.log('Looking for requests with employeeId:', internalId);

            const employee = employees.find(e => e.id === internalId);
            if (!employee) {
                console.log('Employee not found with internal id:', internalId);
                return notFound();
            }
            
            const employeeRequests = requests.filter(x => x.employeeId === employee.id);
            console.log('Found requests:', employeeRequests.length);

            // Sort requests in descending order by creation date
            const sortedRequests = [...employeeRequests].sort((a, b) => {
                const dateA = new Date(a.createdDate);
                const dateB = new Date(b.createdDate);
                return dateB.getTime() - dateA.getTime();
            });

            return ok(sortedRequests.map(request => {
                const items = requestItems.filter(item => item.requestId === request.id);
                const requestType = requestTypes.find(t => t.id === request.typeId);
                const account = accounts.find(a => a.id === employee.accountId);
                
                // Format employee name with proper capitalization
                const firstName = account?.firstName ? account.firstName.charAt(0).toUpperCase() + account.firstName.slice(1).toLowerCase() : '';
                const lastName = account?.lastName ? account.lastName.charAt(0).toUpperCase() + account.lastName.slice(1).toLowerCase() : '';
                const fullName = `${firstName} ${lastName}`.trim();

                return {
                    id: request.id,
                    type: requestType?.name || request.type,
                    status: request.status,
                    createdDate: request.createdDate,
                    items: items,
                    employee: {
                        id: employee.id,
                        employeeId: employee.employeeId,
                        fullName: fullName
                    }
                };
            }));
        }

        function getMyRequests() {
            if (!isAuthenticated()) return unauthorized();

            const currentUserId = currentAccount().id;
            const myRequests = requests.filter(x => x.employeeId === currentUserId);

            return ok(myRequests.map(request => {
                const items = requestItems.filter(item => item.requestId === request.id);
                const employee = employees.find(e => e.id === request.employeeId);
                const account = accounts.find(a => a.id === employee?.accountId);
                const requestType = requestTypes.find(t => t.id === request.typeId);
                return {
                    ...request,
                    items,
                    employee: employee ? {
                        ...employee,
                        fullName: `${account?.firstName || ''} ${account?.lastName || ''}`.trim(),
                        employeeId: employee.employeeId
                    } : null,
                    type: requestType ? requestType.name : request.type
                };
            }));
        }

        function createRequest() {
            if (!isAuthenticated()) return unauthorized();

            console.log('Received request data:', body);

            // Find employee by employeeId
            let targetEmployee;
            if (body.employeeId) {
                // Try to find by internal ID first
                const employeeIdNum = Number(body.employeeId);
                targetEmployee = employees.find(e => e.id === employeeIdNum);
                
                if (!targetEmployee) {
                    // If not found by internal ID, try to find by employee ID string
                    targetEmployee = employees.find(e => e.employeeId === body.employeeId);
                }
                
                if (!targetEmployee) {
                    console.error('Employee not found for ID:', body.employeeId);
                    return error('Employee not found');
                }
            } else {
                // If no employeeId provided, use current user
                const currentUser = currentAccount();
                targetEmployee = employees.find(e => e.accountId === currentUser.id);
                if (!targetEmployee) {
                    console.error('No employee found for current user');
                    return error('Current user is not an employee');
                }
            }

            console.log('Target employee found:', targetEmployee);

            const request = {
                id: newRequestId(),
                employeeId: targetEmployee.id,
                typeId: body.typeId ? Number(body.typeId) : null,
                type: body.type,
                description: body.description || '',
                status: 'Pending',
                createdDate: new Date().toISOString(),
                lastModifiedDate: new Date().toISOString()
            };

            console.log('Creating request:', request);

            // Validate required fields
            if (!request.type && !request.typeId) {
                return error('Request type is required');
            }

            // Validate and process items if present
            let requestItemsList = [];
            if (body.items && Array.isArray(body.items)) {
                try {
                    requestItemsList = body.items.map(item => {
                        if (!item.name || !item.quantity) {
                            throw new Error('Invalid item data');
                        }
                        return {
                    id: newRequestItemId(),
                    requestId: request.id,
                    name: item.name,
                            quantity: Number(item.quantity)
                        };
                    });
                } catch (error) {
                    return error('Invalid item data provided');
                }
            }

            // Save request and items
            requests.push(request);
            if (requestItemsList.length > 0) {
                requestItems.push(...requestItemsList);
                localStorage.setItem(requestItemsKey, JSON.stringify(requestItems));
            }

            localStorage.setItem(requestsKey, JSON.stringify(requests));

            const account = accounts.find(a => a.id === targetEmployee.accountId);
            const firstName = account?.firstName ? account.firstName.charAt(0).toUpperCase() + account.firstName.slice(1).toLowerCase() : '';
            const lastName = account?.lastName ? account.lastName.charAt(0).toUpperCase() + account.lastName.slice(1).toLowerCase() : '';
            const fullName = `${firstName} ${lastName}`.trim();

            const response = {
                ...request,
                items: requestItemsList,
                employee: {
                    id: targetEmployee.id,
                    employeeId: targetEmployee.employeeId,
                    fullName: fullName
                }
            };

            console.log('Created request:', response);
            return ok(response);
        }

        function updateRequest() {
            if (!isAuthenticated()) return unauthorized();

            console.log('Received update data:', body);

            const requestId = idFromUrl();
            const request = requests.find(x => x.id === requestId);

            if (!request) return notFound();
            if (request.employeeId !== currentAccount().id && !isAdmin()) return unauthorized();

            // Update basic request fields
            Object.assign(request, {
                type: body.type,
                description: body.description || request.description,
                lastModifiedDate: new Date().toISOString()
            });

            // Handle item changes
            if (body.items) {
                // Remove all existing items for this request
                requestItems = requestItems.filter(item => item.requestId !== requestId);

                // Add new/updated items
                const newItems = body.items.map(item => ({
                    id: item.id || newRequestItemId(),
                        requestId: requestId,
                        name: item.name,
                    quantity: Number(item.quantity)
                    }));

                requestItems.push(...newItems);
                localStorage.setItem(requestItemsKey, JSON.stringify(requestItems));
            }

            localStorage.setItem(requestsKey, JSON.stringify(requests));

            // Get related data for response
            const employee = employees.find(e => e.id === request.employeeId);
            const account = accounts.find(a => a.id === employee?.accountId);
            const firstName = account?.firstName ? account.firstName.charAt(0).toUpperCase() + account.firstName.slice(1).toLowerCase() : '';
            const lastName = account?.lastName ? account.lastName.charAt(0).toUpperCase() + account.lastName.slice(1).toLowerCase() : '';
            const fullName = `${firstName} ${lastName}`.trim();

            return ok({
                ...request,
                items: requestItems.filter(item => item.requestId === requestId),
                employee: employee ? {
                    ...employee,
                    fullName: fullName,
                    employeeId: employee.employeeId
                } : null
            });
        }

        function changeRequestStatus() {
            if (!isAuthenticated() || !isAdmin()) return unauthorized();

            const requestId = idFromUrl();
            const request = requests.find(x => x.id === requestId);
            
            if (!request) return notFound();

            const newStatus = body.status;
            if (!newStatus) return error('Status is required');

            // Update request
            request.status = newStatus;
            request.lastModifiedDate = new Date().toISOString();

            // Update requests array
            const requestIndex = requests.findIndex(x => x.id === requestId);
            requests[requestIndex] = request;
            localStorage.setItem(requestsKey, JSON.stringify(requests));

            // Get related data for response
            const employee = employees.find(e => e.id === request.employeeId);
            const account = accounts.find(a => a.id === employee?.accountId);
            const requestType = requestTypes.find(t => t.id === request.typeId);
            const items = requestItems.filter(item => item.requestId === request.id);

            // Format employee name
            const firstName = account?.firstName ? account.firstName.charAt(0).toUpperCase() + account.firstName.slice(1).toLowerCase() : '';
            const lastName = account?.lastName ? account.lastName.charAt(0).toUpperCase() + account.lastName.slice(1).toLowerCase() : '';
            const fullName = `${firstName} ${lastName}`.trim();

            return ok({
                ...request,
                type: requestType?.name || request.type,
                items: items,
                employee: employee ? {
                    id: employee.id,
                    employeeId: employee.employeeId,
                    fullName: fullName
                } : null
            });
        }

        function deleteRequest() {
            if (!isAuthenticated()) return unauthorized();

            const requestId = idFromUrl();
            const request = requests.find(x => x.id === requestId);

            if (!request) return notFound();
            if (request.employeeId !== currentAccount().id && !isAdmin()) return unauthorized();

            // Delete request and its items
            requests = requests.filter(x => x.id !== requestId);
            requestItems = requestItems.filter(x => x.requestId !== requestId);

            localStorage.setItem(requestsKey, JSON.stringify(requests));
            localStorage.setItem(requestItemsKey, JSON.stringify(requestItems));

            return ok();
        }

        // Employee functions
        function getEmployees() {
            if (!isAuthenticated()) return unauthorized();
            
            return ok(employees.map(employee => {
                const department = departments.find(d => d.id === employee.departmentId);
                const account = accounts.find(a => a.id === employee.accountId);
                
                // Format names with proper capitalization
                const firstName = account?.firstName ? account.firstName.charAt(0).toUpperCase() + account.firstName.slice(1).toLowerCase() : '';
                const lastName = account?.lastName ? account.lastName.charAt(0).toUpperCase() + account.lastName.slice(1).toLowerCase() : '';
                
                return {
                    ...employee,
                    employeeId: employee.employeeId,
                    fullName: `${firstName} ${lastName}`.trim(),
                    departmentName: department?.name || '',
                    department: department ? {
                        id: department.id,
                        name: department.name,
                        description: department.description
                    } : null,
                    account: account ? basicDetails(account) : null
                };
            }));
        }

        function getEmployeeById() {
            if (!isAuthenticated()) return unauthorized();
            
            const employeeId = idFromUrl();
            const employee = employees.find(x => x.id === employeeId);
            
            if (!employee) return notFound();
            
            // Get fresh department data
            const department = departments.find(d => d.id === employee.departmentId);
            if (!department) return error('Department not found');
            
            const account = accounts.find(a => a.id === employee.accountId);
            const firstName = account?.firstName ? account.firstName.charAt(0).toUpperCase() + account.firstName.slice(1).toLowerCase() : '';
            const lastName = account?.lastName ? account.lastName.charAt(0).toUpperCase() + account.lastName.slice(1).toLowerCase() : '';
            
            // Return complete employee data with fresh relations
            return ok({
                ...employee,
                employeeId: employee.employeeId,
                fullName: `${firstName} ${lastName}`.trim(),
                departmentName: department.name,
                department: {
                    id: department.id,
                    name: department.name,
                    description: department.description
                },
                account: basicDetails(account)
            });
        }

        function createEmployee() {
            if (!isAuthenticated() || !isAdmin()) return unauthorized();
            
            // Log the received data for debugging
            console.log('Received employee data:', body);

            // Check if employee ID already exists
            if (employees.find(x => x.employeeId === body.employeeId)) {
                return error('Employee ID already exists');
            }

            // Validate department exists
            const department = departments.find(d => d.id === Number(body.departmentId));
            if (!department) return error('Department not found');

            // Validate account exists and isn't already assigned to an employee
            const account = accounts.find(a => a.id === Number(body.accountId));
            if (!account) return error('Account not found');
            if (employees.find(e => e.accountId === Number(body.accountId))) {
                return error('Account is already assigned to another employee');
            }

            const employee = {
                id: newEmployeeId(),
                accountId: Number(body.accountId),
                employeeId: body.employeeId,
                departmentId: Number(body.departmentId),
                position: body.position,
                hireDate: body.hireDate,
                salary: Number(body.salary),
                status: body.status || 'Active',
                createdDate: new Date().toISOString(),
                lastModifiedDate: new Date().toISOString()
            };
            
            // Check each required field individually and log the result
            const requiredFields = {
                accountId: !!employee.accountId,
                employeeId: !!employee.employeeId,
                departmentId: !!employee.departmentId,
                position: !!employee.position,
                hireDate: !!employee.hireDate,
                salary: !!employee.salary
            };
            
            console.log('Field validation results:', requiredFields);
            
            // Check if any required field is missing
            const missingFields = Object.entries(requiredFields)
                .filter(([_, isValid]) => !isValid)
                .map(([fieldName]) => fieldName);
            
            if (missingFields.length > 0) {
                return error(`Required fields are missing: ${missingFields.join(', ')}`);
            }

            // Format names
            const firstName = account.firstName ? account.firstName.charAt(0).toUpperCase() + account.firstName.slice(1).toLowerCase() : '';
            const lastName = account.lastName ? account.lastName.charAt(0).toUpperCase() + account.lastName.slice(1).toLowerCase() : '';
            
            // Create workflow entry for new employee
            const workflow = {
                id: newWorkflowId(),
                employeeId: employee.id,
                type: 'Added',
                details: {
                    task: `New employee ${employee.employeeId} was added`,
                    additionalInfo: `Added to ${department.name} department as ${employee.position}`
                },
                status: 'Completed',
                createdDate: new Date().toISOString(),
                lastModifiedDate: new Date().toISOString()
            };
            
            employees.push(employee);
            workflows.push(workflow);
            
            localStorage.setItem(employeesKey, JSON.stringify(employees));
            localStorage.setItem(workflowsKey, JSON.stringify(workflows));
            
            return ok({
                ...employee,
                fullName: `${firstName} ${lastName}`.trim(),
                departmentName: department.name,
                department: {
                    id: department.id,
                    name: department.name,
                    description: department.description
                }
            });
        }

        function updateEmployee() {
            if (!isAuthenticated() || !isAdmin()) return unauthorized();
            
            const employeeId = idFromUrl();
            const employeeIndex = employees.findIndex(x => x.id === employeeId);
            
            if (employeeIndex === -1) return notFound();
            
            const oldEmployee = employees[employeeIndex];
            const updatedEmployee = {
                ...oldEmployee,
                ...body,
                id: employeeId,
                accountId: body.accountId ? Number(body.accountId) : oldEmployee.accountId,
                departmentId: body.departmentId ? Number(body.departmentId) : oldEmployee.departmentId,
                position: body.position || oldEmployee.position,
                salary: body.salary ? Number(body.salary) : oldEmployee.salary,
                lastModifiedDate: new Date().toISOString()
            };
            
            // Validate department exists if changed
            if (body.departmentId) {
                const department = departments.find(d => d.id === updatedEmployee.departmentId);
                if (!department) return error('Department not found');
            }

            // Validate account exists if changed
            if (body.accountId) {
                const account = accounts.find(a => a.id === updatedEmployee.accountId);
                if (!account) return error('Account not found');
            }
            
            const department = departments.find(d => d.id === updatedEmployee.departmentId);
            const account = accounts.find(a => a.id === updatedEmployee.accountId);
            
            // Create workflow entry for updated employee
            const workflow = {
                id: newWorkflowId(),
                employeeId: employeeId,
                type: 'Updated',
                details: {
                    task: `Employee ${employeeId} was updated`,
                    additionalInfo: `Updated in ${department.name} department`
                },
                status: 'Completed',
                createdDate: new Date().toISOString(),
                lastModifiedDate: new Date().toISOString()
            };
            
            employees.push(updatedEmployee);
            workflows.push(workflow);
            
            localStorage.setItem(employeesKey, JSON.stringify(employees));
            localStorage.setItem(workflowsKey, JSON.stringify(workflows));
            
            return ok({
                ...updatedEmployee,
                departmentName: department.name,
                department: {
                    id: department.id,
                    name: department.name,
                    description: department.description
                },
                account: basicDetails(account)
            });
        }

        function deleteEmployee() {
            if (!isAuthenticated() || !isAdmin()) return unauthorized();

            const employeeId = idFromUrl();
            const employeeIndex = employees.findIndex(x => x.id === employeeId);
            
            if (employeeIndex === -1) return notFound();
            
            const employee = employees[employeeIndex];
            
            // Delete employee
            employees = employees.filter(x => x.id !== employeeId);
            localStorage.setItem(employeesKey, JSON.stringify(employees));
            
            return ok({
                ...employee,
                status: 'Deleted'
            });
        }

        function transferEmployee() {
            if (!isAuthenticated() || !isAdmin()) return unauthorized();

            const employeeId = idFromUrl();
            
            // Find the employee index
            const employeeIndex = employees.findIndex(x => x.id === employeeId);
            if (employeeIndex === -1) {
                console.error('Employee not found:', employeeId);
                return notFound();
            }
            
            // Get the current employee
            const employee = employees[employeeIndex];
            const oldDepartmentId = employee.departmentId;
            const newDepartmentId = Number(body.departmentId);
            
            // Validate departments exist
            const oldDepartment = departments.find(d => d.id === oldDepartmentId);
            const newDepartment = departments.find(d => d.id === newDepartmentId);
            if (!oldDepartment || !newDepartment) {
                console.error('Department not found. Old:', oldDepartmentId, 'New:', newDepartmentId);
                return error('Department not found');
            }

            // Don't do anything if the department hasn't changed
            if (oldDepartmentId === newDepartmentId) {
                console.log('Employee already in department:', newDepartmentId);
                return error('Employee is already in this department');
            }

            console.log('Transferring employee', employee.employeeId, 'from', oldDepartment.name, 'to', newDepartment.name);

            // Update the employee's department
            employees[employeeIndex] = {
                ...employee,
                departmentId: newDepartmentId,
                lastModifiedDate: new Date().toISOString()
            };
            
            // Get employee account for name
            const account = accounts.find(a => a.id === employee.accountId);
            const firstName = account?.firstName ? account.firstName.charAt(0).toUpperCase() + account.firstName.slice(1).toLowerCase() : '';
            const lastName = account?.lastName ? account.lastName.charAt(0).toUpperCase() + account.lastName.slice(1).toLowerCase() : '';
            
            // Create workflow entry for transfer
            const workflow = {
                id: newWorkflowId(),
                employeeId: employeeId,
                type: 'Transferred',
                details: {
                    task: `Employee ${employee.employeeId} was transferred`,
                    additionalInfo: `From ${oldDepartment.name} to ${newDepartment.name} department`
                },
                status: 'Completed',
                createdDate: new Date().toISOString(),
                lastModifiedDate: new Date().toISOString()
            };
            
            workflows.push(workflow);
            
            // Save changes
            localStorage.setItem(employeesKey, JSON.stringify(employees));
            localStorage.setItem(workflowsKey, JSON.stringify(workflows));

            console.log('Transfer completed successfully');
            
            return ok({
                ...employees[employeeIndex],
                fullName: `${firstName} ${lastName}`.trim(),
                departmentName: newDepartment.name,
                department: {
                    id: newDepartment.id,
                    name: newDepartment.name,
                    description: newDepartment.description
                }
            });
        }

        // Department functions
        function getDepartments() {
            if (!isAuthenticated()) return unauthorized();
            
            return ok(departments.map(department => {
                return {
                    ...department,
                    id: department.id.toString(),
                    name: department.name,
                    description: department.description
                };
            }));
        }

        function getDepartmentById() {
            if (!isAuthenticated()) return unauthorized();
            
            const departmentId = idFromUrl();
            const department = departments.find(x => x.id === departmentId);
            
            if (!department) return notFound();
            
            return ok({
                ...department,
                id: department.id.toString(),
                name: department.name,
                description: department.description
            });
        }

        function createDepartment() {
            if (!isAuthenticated() || !isAdmin()) return unauthorized();
            
            const department = body;
            
            // Validate department name is unique
            if (departments.find(x => x.name === department.name)) {
                return error('Department name already exists');
            }
            
            // Assign department id and save
            department.id = newDepartmentId();
            departments.push(department);
            localStorage.setItem(departmentsKey, JSON.stringify(departments));
            
            return ok({
                ...department,
                id: department.id.toString()
            });
        }

        function updateDepartment() {
            if (!isAuthenticated() || !isAdmin()) return unauthorized();
            
            const departmentId = idFromUrl();
            const departmentIndex = departments.findIndex(x => x.id === departmentId);
            
            if (departmentIndex === -1) return notFound();
            
            const oldDepartment = departments[departmentIndex];
            const updatedDepartment = {
                ...oldDepartment,
                ...body,
                id: departmentId,
                lastModifiedDate: new Date().toISOString()
            };
            
            // Validate department name is unique
            if (departments.find(x => x.name === updatedDepartment.name && x.id !== updatedDepartment.id)) {
                return error('Department name already exists');
            }

            departments.push(updatedDepartment);
            localStorage.setItem(departmentsKey, JSON.stringify(departments));
            
            return ok({
                ...updatedDepartment,
                id: updatedDepartment.id.toString()
            });
        }

        function deleteDepartment() {
            if (!isAuthenticated() || !isAdmin()) return unauthorized();

            const departmentId = idFromUrl();
            const departmentIndex = departments.findIndex(x => x.id === departmentId);
            
            if (departmentIndex === -1) return notFound();
            
            const department = departments[departmentIndex];
            
            // Delete department
            departments = departments.filter(x => x.id !== departmentId);
            localStorage.setItem(departmentsKey, JSON.stringify(departments));
            
            return ok({
                ...department,
                status: 'Deleted'
            });
        }

        // Position functions
        function getPositions() {
            if (!isAuthenticated()) return unauthorized();
            
            return ok(positions.map(position => {
                return {
                    ...position,
                    id: position.id.toString(),
                    name: position.name,
                    description: position.description
                };
            }));
        }

        function getPositionById() {
            if (!isAuthenticated()) return unauthorized();
            
            const positionId = idFromUrl();
            const position = positions.find(x => x.id === positionId);
            
            if (!position) return notFound();
            
            return ok({
                ...position,
                id: position.id.toString(),
                name: position.name,
                description: position.description
            });
        }

        function createPosition() {
            if (!isAuthenticated() || !isAdmin()) return unauthorized();
            
            const position = body;
            
            // Validate position name is unique
            if (positions.find(x => x.name === position.name)) {
                return error('Position name already exists');
            }
            
            // Assign position id and save
            position.id = newPositionId();
            positions.push(position);
            localStorage.setItem(positionsKey, JSON.stringify(positions));
            
            return ok({
                ...position,
                id: position.id.toString()
            });
        }

        function updatePosition() {
            if (!isAuthenticated() || !isAdmin()) return unauthorized();
            
            const positionId = idFromUrl();
            const positionIndex = positions.findIndex(x => x.id === positionId);
            
            if (positionIndex === -1) return notFound();
            
            const oldPosition = positions[positionIndex];
            const updatedPosition = {
                ...oldPosition,
                ...body,
                id: positionId,
                lastModifiedDate: new Date().toISOString()
            };
            
            // Validate position name is unique
            if (positions.find(x => x.name === updatedPosition.name && x.id !== updatedPosition.id)) {
                return error('Position name already exists');
            }

            positions.push(updatedPosition);
            localStorage.setItem(positionsKey, JSON.stringify(positions));
            
            return ok({
                ...updatedPosition,
                id: updatedPosition.id.toString()
            });
        }

        function deletePosition() {
            if (!isAuthenticated() || !isAdmin()) return unauthorized();

            const positionId = idFromUrl();
            const positionIndex = positions.findIndex(x => x.id === positionId);
            
            if (positionIndex === -1) return notFound();
            
            const position = positions[positionIndex];
            
            // Delete position
            positions = positions.filter(x => x.id !== positionId);
            localStorage.setItem(positionsKey, JSON.stringify(positions));
            
            return ok({
                ...position,
                status: 'Deleted'
            });
        }

        // Request type functions
        function getRequestTypes() {
            if (!isAuthenticated()) return unauthorized();
            
            return ok(requestTypes.map(type => {
                return {
                    ...type,
                    id: type.id.toString(),
                    name: type.name,
                    description: type.description
                };
            }));
        }

        function getRequestTypeById() {
            if (!isAuthenticated()) return unauthorized();
            
            const typeId = idFromUrl();
            const type = requestTypes.find(x => x.id === typeId);
            
            if (!type) return notFound();
            
            return ok({
                ...type,
                id: type.id.toString(),
                name: type.name,
                description: type.description
            });
        }

        function createRequestType() {
            if (!isAuthenticated() || !isAdmin()) return unauthorized();
            
            const type = body;
            
            // Validate request type name is unique
            if (requestTypes.find(x => x.name === type.name)) {
                return error('Request type name already exists');
            }
            
            // Assign request type id and save
            type.id = newRequestTypeId();
            requestTypes.push(type);
            localStorage.setItem(requestTypesKey, JSON.stringify(requestTypes));
            
            return ok({
                ...type,
                id: type.id.toString()
            });
        }

        function updateRequestType() {
            if (!isAuthenticated() || !isAdmin()) return unauthorized();
            
            const typeId = idFromUrl();
            const typeIndex = requestTypes.findIndex(x => x.id === typeId);
            
            if (typeIndex === -1) return notFound();
            
            const oldType = requestTypes[typeIndex];
            const updatedType = {
                ...oldType,
                ...body,
                id: typeId,
                lastModifiedDate: new Date().toISOString()
            };
            
            // Validate request type name is unique
            if (requestTypes.find(x => x.name === updatedType.name && x.id !== updatedType.id)) {
                return error('Request type name already exists');
            }

            requestTypes.push(updatedType);
            localStorage.setItem(requestTypesKey, JSON.stringify(requestTypes));
            
            return ok({
                ...updatedType,
                id: updatedType.id.toString()
            });
        }

        function deleteRequestType() {
            if (!isAuthenticated() || !isAdmin()) return unauthorized();

            const typeId = idFromUrl();
            const typeIndex = requestTypes.findIndex(x => x.id === typeId);
            
            if (typeIndex === -1) return notFound();
            
            const type = requestTypes[typeIndex];
            
            // Delete request type
            requestTypes = requestTypes.filter(x => x.id !== typeId);
            localStorage.setItem(requestTypesKey, JSON.stringify(requestTypes));
            
            return ok({
                ...type,
                status: 'Deleted'
            });
        }

        // Workflow functions
        function getWorkflows() {
            if (!isAuthenticated()) return unauthorized();
            
            // Sort workflows in descending order by creation date
            const sortedWorkflows = [...workflows].sort((a, b) => {
                const dateA = new Date(a.datetimecreated || a.createdDate);
                const dateB = new Date(b.datetimecreated || b.createdDate);
                return dateB.getTime() - dateA.getTime();
            });

            return ok(sortedWorkflows.map(workflow => {
                const details = typeof workflow.details === 'object' ? 
                    `${workflow.details.task}${workflow.details.additionalInfo ? ` - ${workflow.details.additionalInfo}` : ''}` :
                    workflow.details || '';

                return {
                    id: workflow.id.toString(),
                    type: workflow.type,
                    details: details,
                    status: workflow.status,
                    datetimecreated: workflow.datetimecreated || workflow.createdDate
                };
            }));
        }

        function getWorkflowById() {
            if (!isAuthenticated()) return unauthorized();
            const workflow = workflows.find(x => x.id === idFromUrl());
            if (!workflow) return notFound();
            
            const details = typeof workflow.details === 'object' ? 
                `${workflow.details.task}${workflow.details.additionalInfo ? ` - ${workflow.details.additionalInfo}` : ''}` :
                workflow.details || '';

            return ok({
                id: workflow.id.toString(),
                type: workflow.type,
                details: details,
                status: workflow.status,
                datetimecreated: workflow.datetimecreated || workflow.createdDate
            });
        }

        function getWorkflowsByRequestId() {
            if (!isAuthenticated()) return unauthorized();
            
            const requestId = idFromUrl();
            console.log('Looking for workflows with requestId:', requestId);

            const request = requests.find(x => x.id === requestId);
            if (!request) {
                console.log('Request not found with id:', requestId);
                return notFound();
            }
            
            const requestWorkflows = workflows.filter(x => x.requestId === requestId);
            console.log('Found workflows:', requestWorkflows.length);

            // Sort workflows in descending order
            const sortedWorkflows = [...requestWorkflows].sort((a, b) => {
                const dateA = new Date(a.datetimecreated || a.createdDate);
                const dateB = new Date(b.datetimecreated || b.createdDate);
                return dateB.getTime() - dateA.getTime();
            });

            return ok(sortedWorkflows.map(workflow => {
                const details = typeof workflow.details === 'object' ? 
                    `${workflow.details.task}${workflow.details.additionalInfo ? ` - ${workflow.details.additionalInfo}` : ''}` :
                    workflow.details || '';

                return {
                    id: workflow.id.toString(),
                    type: workflow.type,
                    details: details,
                    status: workflow.status,
                    datetimecreated: workflow.datetimecreated || workflow.createdDate
                };
            }));
        }

        function createWorkflow() {
            if (!isAuthenticated() || !isAdmin()) return unauthorized();
            
            console.log('Received workflow data:', body);

            const workflow = {
                id: newWorkflowId(),
                employeeId: body.employeeId,
                type: body.type,
                details: body.details,
                status: body.status,
                createdDate: new Date().toISOString(),
                lastModifiedDate: new Date().toISOString()
            };
            
            // Validate required fields
            const requiredFields = {
                employeeId: !!workflow.employeeId,
                type: !!workflow.type,
                details: !!workflow.details,
                status: !!workflow.status
            };
            
            console.log('Field validation results:', requiredFields);
            
            // Check if any required field is missing
            const missingFields = Object.entries(requiredFields)
                .filter(([_, isValid]) => !isValid)
                .map(([fieldName]) => fieldName);
            
            if (missingFields.length > 0) {
                return error(`Required fields are missing: ${missingFields.join(', ')}`);
            }

            // Validate employee exists
            const employee = employees.find(e => e.id === workflow.employeeId);
            if (!employee) return error('Employee not found');
            
            employees.push(workflow);
            localStorage.setItem(workflowsKey, JSON.stringify(workflows));
            
            return ok({
                ...workflow,
                employee: employee ? {
                    ...employee,
                    employeeId: employee.employeeId
                } : null
            });
        }

        function updateWorkflow() {
            if (!isAuthenticated() || !isAdmin()) return unauthorized();
            
            const workflowId = idFromUrl();
            const workflowIndex = workflows.findIndex(x => x.id === workflowId);
            
            if (workflowIndex === -1) return notFound();
            
            const oldWorkflow = workflows[workflowIndex];
            const updatedWorkflow = {
                ...oldWorkflow,
                ...body,
                id: workflowId,
                lastModifiedDate: new Date().toISOString()
            };
            
            // Validate employee exists
            const employee = employees.find(e => e.id === updatedWorkflow.employeeId);
            if (!employee) return error('Employee not found');
            
            employees.push(updatedWorkflow);
            localStorage.setItem(workflowsKey, JSON.stringify(workflows));
            
            return ok({
                ...updatedWorkflow,
                employee: employee ? {
                    ...employee,
                    employeeId: employee.employeeId
                } : null
            });
        }

        function updateWorkflowStatus() {
            if (!isAuthenticated() || !isAdmin()) return unauthorized();

            const workflowId = idFromUrl();
            const workflow = workflows.find(x => x.id === workflowId);
            
            if (!workflow) return notFound();
            
            const newStatus = body.status;

            Object.assign(workflow, {
                status: newStatus,
                lastModifiedDate: new Date().toISOString()
            });

            localStorage.setItem(workflowsKey, JSON.stringify(workflows));

            return ok({
                ...workflow,
                status: newStatus
            });
        }

        function deleteWorkflow() {
            if (!isAuthenticated() || !isAdmin()) return unauthorized();

            const workflowId = idFromUrl();
            const workflowIndex = workflows.findIndex(x => x.id === workflowId);
            
            if (workflowIndex === -1) return notFound();
            
            const workflow = workflows[workflowIndex];
            const employee = employees.find(e => e.id === workflow.employeeId);
            
            // Delete workflow
            workflows = workflows.filter(x => x.id !== workflowId);
            localStorage.setItem(workflowsKey, JSON.stringify(workflows));
            
            return ok({
                ...workflow,
                employee: employee ? {
                    ...employee,
                    employeeId: employee.employeeId
                } : null
            });
        }

        function deleteWorkflowItem() {
            if (!isAuthenticated() || !isAdmin()) return unauthorized();

            const workflowId = idFromUrl();
            const workflow = workflows.find(x => x.id === workflowId);
            
            if (!workflow) return notFound();
            
            // Delete workflow item
            workflows = workflows.filter(x => x.id !== workflowId);
            localStorage.setItem(workflowsKey, JSON.stringify(workflows));
            
            return ok({
                ...workflow,
                status: 'Deleted'
            });
        }

        function createAccount() {
            if (!isAuthenticated() || !isAdmin()) return unauthorized();
            
            const account = body;
            
            if (accounts.find(x => x.email === account.email)) {
                return error('Email already exists');
            }
            
            account.id = newAccountId();
            account.dateCreated = new Date().toISOString();
            account.isVerified = true;
            account.refreshTokens = [];
            
            accounts.push(account);
            localStorage.setItem(accountsKey, JSON.stringify(accounts));
            
            return ok(basicDetails(account));
        }

        function updateAccount() {
            if (!isAuthenticated()) return unauthorized();
            
            const accountId = idFromUrl();
            const account = accounts.find(x => x.id === accountId);
            
            if (!account) return notFound();
            if (account.id !== currentAccount().id && !isAdmin()) return unauthorized();
            
            // Only allow admins to update role
            if (!isAdmin()) {
                delete body.role;
            }
            
            // If email is being changed, make sure it's not already taken
            if (body.email && body.email !== account.email && accounts.find(x => x.email === body.email)) {
                return error('Email already exists');
            }
            
            Object.assign(account, body);
            localStorage.setItem(accountsKey, JSON.stringify(accounts));
            
            return ok(basicDetails(account));
        }

        function deleteAccount() {
            if (!isAuthenticated() || !isAdmin()) return unauthorized();
            
            const accountId = idFromUrl();
            const account = accounts.find(x => x.id === accountId);
            
            if (!account) return notFound();
            if (account.id === currentAccount().id) return error('You cannot delete your own account');
            
            accounts = accounts.filter(x => x.id !== accountId);
            localStorage.setItem(accountsKey, JSON.stringify(accounts));
            
            return ok();
        }
    }
}

export const fakeBackendProvider = {
    // use fake backend in place of Http service for backend-less development
    provide: HTTP_INTERCEPTORS,
    useClass: FakeBackendInterceptor,
    multi: true
};