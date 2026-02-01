import { describe, expect, it } from 'vitest';

import { createEmail } from '@/core/entities.js';
import { ValidationError } from '@/core/errors.js';

describe('Email entity', () => {
  it('should require message_id and received_at', () => {
    expect(() => createEmail({ received_at: Date.now() })).toThrow(ValidationError);
    expect(() => createEmail({ message_id: 'msg-1' })).toThrow(ValidationError);
  });

  it('should default is_read to false when missing', () => {
    const email = createEmail({
      message_id: 'msg-1',
      received_at: Date.now()
    });

    expect(email.is_read).toBe(false);
  });

  it('should reject invalid timestamps', () => {
    expect(() => createEmail({ message_id: 'msg-1', received_at: Number.NaN })).toThrow(
      ValidationError
    );
    expect(() => createEmail({ message_id: 'msg-1', received_at: -1 })).toThrow(ValidationError);
  });
});
