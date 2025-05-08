import { Account } from './account';

export class Workflow {
    id?: string;
    requestId?: number;
    stage?: string;
    status?: string;
    handledBy?: number;
    comments?: string;
    created?: Date;
    updated?: Date;
    completedAt?: Date;
    handler?: Account;
} 