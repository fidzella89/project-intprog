import { Employee } from './employee';

export interface Workflow {
    id?: string;
    employeeId: number;
    type: WorkflowType;
    details: WorkflowDetails;
    status: WorkflowStatus;
    employee?: Employee;
    createdDate?: Date;
    lastModifiedDate?: Date;
}

export enum WorkflowType {
    Onboarding = 'Onboarding',
    OffBoarding = 'OffBoarding',
    EquipmentSetup = 'EquipmentSetup',
    AccessRequest = 'AccessRequest',
    Other = 'Other'
}

export enum WorkflowStatus {
    Pending = 'Pending',
    InProgress = 'InProgress',
    Completed = 'Completed',
    Rejected = 'Rejected'
}

export interface WorkflowDetails {
    task: string;
    additionalInfo?: string;
}

export class WorkflowItem {
    id: string;
    name: string;
    quantity: number;
} 