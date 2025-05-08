import { Employee } from './employee';
import { Workflow } from './workflow';

export class Request {
    id?: string;
    employeeId: number;
    type: string;
    items: RequestItem[];
}

export interface RequestItem {
    name: string;
    quantity: number;
} 