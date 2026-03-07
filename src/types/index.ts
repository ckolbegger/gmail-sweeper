export interface Email {
    id: string;           // Gmail Message ID
    threadId: string;     // Gmail Thread ID
    internalDate: string; // Timestamp from Gmail
    labelIds: string[];   // ["INBOX", "UNREAD", ...]
    snippet: string;      // Short preview

    // Computed/extracted fields for UI convenience
    from: string;
    to: string;
    subject: string;
    date: string;         // Human readable date header
    isUnread: boolean;
    body: string;         // Sanitized or plain text body
}

export interface EmailHeader {
    name: string;
    value: string;
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

export interface EmailSummary {
  emailId: string;
  description: string;
  actionItems: string[];
  createdAt: string;
}
