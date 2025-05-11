import { Role } from './role';

export class Account {
    id?: string;
    title?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: Role;
    status?: string;
    token?: string;
    refreshToken?: string;
    isVerified?: boolean;
    created?: Date;
    updated?: Date | null;
    password?: string;
    confirmPassword?: string;
    oldPassword?: string;
    resetToken?: string;
    verificationToken?: string;

    constructor(init?: Partial<Account>) {
        Object.assign(this, init);
    }
}   