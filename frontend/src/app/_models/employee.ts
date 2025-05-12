import { Account } from './account';
import { Department } from './department';

export class Employee {
    id?: string;
    employeeId: string = '';
    accountId: number = 0;
    departmentId: string = '';
    departmentName?: string;
    position: string = '';
    hireDate: Date = new Date();
    salary?: number;
    status: string = 'Active';
    created?: Date;
    updated?: Date;
    account?: Account;
    Department?: Department;
    
    constructor(init?: Partial<Employee>) {
        Object.assign(this, init);
    }
} 