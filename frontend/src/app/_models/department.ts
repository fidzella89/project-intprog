export class Department {
    id?: string;
    name: string = '';
    description?: string;
    created?: Date;
    updated?: Date;
    employeeCount?: number;
    
    constructor(init?: Partial<Department>) {
        Object.assign(this, init);
    }
} 