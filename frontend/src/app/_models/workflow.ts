import { Employee } from './employee';
import { Request } from './request';

export interface Workflow {
    id?: string;
    requestId: number;
    request?: Request;
    step: number;
    status: 'Pending' | 'Approved' | 'Rejected';
    handledBy?: number;
    handler?: Employee;
    notes?: string;
    createdDate?: Date;
    lastModifiedDate?: Date;
} 