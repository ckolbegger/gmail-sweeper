import { useState, useCallback, useEffect } from 'react';
import { AiProvider } from '../services/ai/provider';
import { ISummaryStorage } from '../services/storage/summaryStore';
import { Email, EmailSummary } from '../types';

export function useSummary(
    aiProvider: AiProvider | null,
    summaryStorage: ISummaryStorage | null,
    email: Email | null
) {
    const [summary, setSummary] = useState<EmailSummary | null>(null);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSummaryActive, setIsSummaryActive] = useState(false);

    // Reset view and state when email changes
    useEffect(() => {
        setIsSummaryActive(false);
        setSummary(prev => prev ? null : prev);
        setError(prev => prev ? null : prev);
    }, [email?.id]);

    const toggleSummaryView = useCallback(() => {
        setIsSummaryActive(prev => !prev);
    }, []);

    const generateSummary = useCallback(async (force: boolean = false) => {
        if (!email || !aiProvider || !summaryStorage || isSummarizing) {
            return;
        }

        setIsSummarizing(true);
        setError(null);

        try {
            if (!force) {
                // T017: Check cache first
                const cachedSummary = await summaryStorage.getSummary(email.id);
                if (cachedSummary) {
                    setSummary(cachedSummary);
                    return; // Do not call LLM
                }
            }

            const response = await aiProvider.summarizeEmail({
                emailId: email.id,
                content: email.body
            });

            const newSummary = response.summary;
            setSummary(newSummary);

            // T018: Persist to storage
            await summaryStorage.saveSummary(newSummary);
        } catch (err: any) {
            setError(err.message || 'An error occurred while summarizing the email.');
        } finally {
            setIsSummarizing(false);
        }
    }, [email, aiProvider, summaryStorage]);

    return {
        summary,
        isSummarizing,
        error,
        isSummaryActive,
        toggleSummaryView,
        generateSummary
    };
}
