export interface Email {
    id: string;
    threadId: string;
    labelIds: string[];
    snippet: string;
    internalDate: string; // stored as string timestamp
    subject: string;
    from: string;
    to: string;
    date: string; // Display date
    body: string; // HTML or Text content
    isUnread: boolean;
}

export type EmailFilter = {
    maxResults?: number;
    pageToken?: string;
    q?: string;
    labelIds?: string[];
};

export type PaginatedResponse<T> = {
    items: T[];
    nextPageToken?: string;
    resultSizeEstimate?: number;
};
