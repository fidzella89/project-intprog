import { Employee } from './employee';

export enum RequestType {
    Equipment = 'Equipment',
    Leave = 'Leave',
    Resources = 'Resources'
}

export enum RequestStatus {
    Draft = 'Draft',
    Submitted = 'Submitted',
    InProgress = 'In Progress',
    Approved = 'Approved',
    Rejected = 'Rejected',
    Completed = 'Completed',
    Cancelled = 'Cancelled'
}

export interface RequestItem {
    id?: string;
    name: string;
    type: string;
    quantity?: number;
    startDate?: Date;
    endDate?: Date;
    notes?: string;
    status: RequestStatus;
}

export interface Request {
    id?: string;
    requestNumber: string;
    employeeId: number;
    employee?: Employee;
    description: string;
    type: string;
    status: string;
    items: any[];
    createdDate?: Date;
    lastModifiedDate?: Date;
} 