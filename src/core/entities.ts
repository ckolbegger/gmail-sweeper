import { ValidationError } from '@/core/errors.js';

export interface Email {
  message_id: string;
  received_at: number;
  subject?: string;
  sender?: string;
  labels?: string[];
  category?: string;
  is_read: boolean;
}

export type EmailInput = Partial<Omit<Email, 'is_read'>> & {
  is_read?: boolean;
};

const isValidTimestamp = (value: number): boolean => Number.isFinite(value) && value > 0;

export function createEmail(input: EmailInput): Email {
  const messageId = input.message_id;
  const receivedAt = input.received_at;

  if (!messageId) {
    throw new ValidationError('message_id is required', { field: 'message_id' });
  }
  if (receivedAt === undefined || !isValidTimestamp(receivedAt)) {
    throw new ValidationError('received_at must be a valid timestamp', { field: 'received_at' });
  }

  return {
    message_id: messageId,
    received_at: receivedAt,
    subject: input.subject,
    sender: input.sender,
    labels: input.labels ?? [],
    category: input.category,
    is_read: input.is_read ?? false
  };
}
