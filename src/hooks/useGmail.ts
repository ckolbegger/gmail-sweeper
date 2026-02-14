import { useState, useEffect, useCallback } from 'react';
import { Email, EmailFilter } from '../types';
import { IEmailService } from '../types/interfaces';

export function useGmail(service: IEmailService, filter: EmailFilter = {}) {
    const [emails, setEmails] = useState<Email[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchEmails = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const authenticated = await service.isAuthenticated();
            if (!authenticated) {
                await service.authenticate();
            }
            const response = await service.listEmails(filter);
            setEmails(response.items);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch emails');
        } finally {
            setLoading(false);
        }
    }, [service, JSON.stringify(filter)]);

    useEffect(() => {
        fetchEmails();
    }, [fetchEmails]);

    return {
        emails,
        loading,
        error,
        refetch: fetchEmails
    };
}
