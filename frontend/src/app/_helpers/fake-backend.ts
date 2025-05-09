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

@Injectable()
export class FakeBackendInterceptor implements HttpInterceptor {
    constructor(private alertService: AlertService) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const { url, method, headers, body } = request;
        const alertService = this.alertService;

        return handleRoute().pipe(
            delay(500), // Simulate server delay
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
                    
                // request routes
                case url.endsWith('/requests') && method === 'GET':
                    return getRequests();
                case url.match(/\/requests\/\d+$/) && method === 'GET':
                    return getRequestById();
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
        
            return ok({
                ...basicDetails(account),
                jwtToken: generateJwtToken(account)
            });
        }

        function refreshToken() {
            const refreshToken = getRefreshToken();
            if (!refreshToken) return unauthorized();

            const account = accounts.find(x => x.refreshTokens?.includes(refreshToken));
            if (!account) return unauthorized();

            // replace old refresh token with a new one
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

            return ok(filteredRequests.map(x => {
                const items = requestItems.filter(item => item.requestId === x.id);
                return { ...x, items };
            }));
        }

        function getRequestById() {
            if (!isAuthenticated()) return unauthorized();

            const request = requests.find(x => x.id === idFromUrl());
            if (!request) return notFound();

            // Add items to the request
            const items = requestItems.filter(item => item.requestId === request.id);
            return ok({ ...request, items });
        }

        function getMyRequests() {
            if (!isAuthenticated()) return unauthorized();

            const currentUserId = currentAccount().id;
            const myRequests = requests.filter(x => x.employeeId === currentUserId);

            return ok(myRequests.map(x => {
                const items = requestItems.filter(item => item.requestId === x.id);
                return { ...x, items };
            }));
        }

        function createRequest() {
            if (!isAuthenticated()) return unauthorized();

            const request = {
                id: newRequestId(),
                employeeId: currentAccount().id,
                ...body,
                status: 'Pending',
                createdDate: new Date().toISOString(),
                lastModifiedDate: new Date().toISOString()
            };

            // Handle items
            if (body.items) {
                const items = body.items.map(item => ({
                    id: newRequestItemId(),
                    requestId: request.id,
                    name: item.name,
                    quantity: item.quantity
                }));
                requestItems.push(...items);
                localStorage.setItem(requestItemsKey, JSON.stringify(requestItems));
            }

            delete request.items; // Remove items from main request object
            requests.push(request);
            localStorage.setItem(requestsKey, JSON.stringify(requests));

            return ok();
        }

        function updateRequest() {
            if (!isAuthenticated()) return unauthorized();

            const requestId = idFromUrl();
            const params = body;
            const request = requests.find(x => x.id === requestId);

            if (!request) return notFound();
            if (request.employeeId !== currentAccount().id && !isAdmin()) return unauthorized();

            // Update request
            Object.assign(request, {
                ...params,
                lastModifiedDate: new Date().toISOString()
            });

            // Handle item changes
            if (params.itemChanges) {
                // Delete items
                if (params.itemChanges.delete) {
                    requestItems = requestItems.filter(item => 
                        item.requestId !== requestId || 
                        !params.itemChanges.delete.includes(item.id)
                    );
                }

                // Update items
                if (params.itemChanges.update) {
                    params.itemChanges.update.forEach(updatedItem => {
                        const item = requestItems.find(x => x.id === updatedItem.id);
                        if (item) Object.assign(item, updatedItem);
                    });
                }

                // Add new items
                if (params.itemChanges.add) {
                    const newItems = params.itemChanges.add.map(item => ({
                        id: newRequestItemId(),
                        requestId: requestId,
                        name: item.name,
                        quantity: item.quantity
                    }));
                    requestItems.push(...newItems);
                }

                localStorage.setItem(requestItemsKey, JSON.stringify(requestItems));
            }

            localStorage.setItem(requestsKey, JSON.stringify(requests));
            return ok();
        }

        function changeRequestStatus() {
            if (!isAuthenticated()) return unauthorized();

            const request = requests.find(x => x.id === idFromUrl());
            if (!request) return notFound();

            Object.assign(request, {
                status: body.status,
                lastModifiedDate: new Date().toISOString()
            });

            localStorage.setItem(requestsKey, JSON.stringify(requests));
            return ok();
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
            const { id, title, firstName, lastName, email, role, created, updated, isVerified } = account;
            return { id, title, firstName, lastName, email, role, created, updated, isVerified };
        }

        function isAuthenticated() {
            return !!currentAccount();
        }

        function isAdmin() {
            return currentAccount()?.role === Role.Admin;
        }

        function currentAccount() {
            // Check if the authorization header exists and has a JWT token
            if (!headers.get('Authorization')?.startsWith('Bearer ')) return null;

            // Get the account from the JWT token (in a real app this would validate the token)
            const jwtToken = JSON.parse(atob(headers.get('Authorization').split('.')[1]));
            const account = accounts.find(x => x.id === jwtToken.id);
            return account;
        }

        function idFromUrl() {
            const urlParts = url.split('/');
            return parseInt(urlParts[urlParts.length - 1]);
        }

        function newRequestId() {
            return requests.length ? Math.max(...requests.map(x => x.id)) + 1 : 1;
        }

        function newRequestItemId() {
            return requestItems.length ? Math.max(...requestItems.map(x => x.id)) + 1 : 1;
        }

        function newAccountId() {
            return accounts.length ? Math.max(...accounts.map(x => x.id)) + 1 : 1;
        }

        function generateJwtToken(account: any) {
            // In a real app this would be generated on the server
            const token = {
                id: account.id,
                role: account.role,
                email: account.email
            };
            return `fake-jwt-token.${btoa(JSON.stringify(token))}`;
        }

        function generateRefreshToken() {
            return `fake-refresh-token-${Math.floor(Math.random() * 1000000000)}`;
        }

        function getRefreshToken() {
            return headers.get('Authorization')?.split(' ')[1];
        }
    }
}

export const fakeBackendProvider = {
    provide: HTTP_INTERCEPTORS,
    useClass: FakeBackendInterceptor,
    multi: true
};
