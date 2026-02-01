import { Email, EmailFilter, PaginatedResponse } from './index';

export interface IEmailService {
    /**
     * List emails based on filter criteria
     */
    listEmails(filter: EmailFilter): Promise<PaginatedResponse<Email>>;

    /**
     * Get full details for a specific email
     */
    getEmail(id: string): Promise<Email | null>;

    /**
     * Check if service is authenticated/ready
     */
    isAuthenticated(): Promise<boolean>;

    /**
     * trigger authentication flow
     */
    authenticate(): Promise<void>;
}
