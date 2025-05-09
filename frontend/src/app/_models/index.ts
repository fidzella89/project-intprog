export * from './account';
export * from './alert';
export * from './role';
export * from './employee';
export * from './request';
export * from './workflow';
export * from './department';

export interface RegistrationResponse {
    message?: string;
    verificationToken?: string;
    verificationUrl?: string;
    verificationApiUrl?: string;
}