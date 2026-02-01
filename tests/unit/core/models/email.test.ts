import { describe, it, expect } from 'vitest';
import {
  EmailSchema,
  EmailAddressSchema,
  validateEmail,
  safeValidateEmail,
  validateEmailAddress,
} from '../../../../src/core/models/email.js';

describe('Email Model', () => {
  const validEmailData = {
    id: 'msg123',
    threadId: 'thread456',
    subject: 'Test Email',
    sender: { name: 'John Doe', email: 'john@example.com' },
    recipients: [{ email: 'recipient@example.com' }],
    cc: [],
    bcc: [],
    dateReceived: new Date(),
    body: { text: 'Hello world' },
    labels: ['INBOX'],
    isRead: false,
    snippet: 'Hello...',
    historyId: 'history789',
    syncedAt: new Date(),
  };

  describe('EmailAddressSchema', () => {
    it('should validate valid email address', () => {
      const result = EmailAddressSchema.parse({ name: 'John', email: 'john@example.com' });
      expect(result.email).toBe('john@example.com');
    });

    it('should reject invalid email format', () => {
      expect(() => EmailAddressSchema.parse({ email: 'not-an-email' })).toThrow();
    });

    it('should allow email without name', () => {
      const result = EmailAddressSchema.parse({ email: 'john@example.com' });
      expect(result.name).toBeUndefined();
    });
  });

  describe('EmailSchema', () => {
    it('should validate valid Email objects', () => {
      const result = EmailSchema.parse(validEmailData);
      expect(result.id).toBe('msg123');
      expect(result.subject).toBe('Test Email');
    });

    it('should reject missing required fields', () => {
      const invalidData = { ...validEmailData, id: undefined };
      expect(() => EmailSchema.parse(invalidData)).toThrow();
    });

    it('should reject empty id', () => {
      const invalidData = { ...validEmailData, id: '' };
      expect(() => EmailSchema.parse(invalidData)).toThrow();
    });

    it('should handle optional fields correctly', () => {
      const dataWithoutOptional = {
        ...validEmailData,
        category: undefined,
      };
      const result = EmailSchema.parse(dataWithoutOptional);
      expect(result.category).toBeUndefined();
    });

    it('should validate category enum values', () => {
      const dataWithCategory = { ...validEmailData, category: 'promotions' };
      const result = EmailSchema.parse(dataWithCategory);
      expect(result.category).toBe('promotions');
    });

    it('should reject invalid category values', () => {
      const dataWithInvalidCategory = { ...validEmailData, category: 'invalid' };
      expect(() => EmailSchema.parse(dataWithInvalidCategory)).toThrow();
    });
  });

  describe('validateEmail', () => {
    it('should return validated email for valid data', () => {
      const result = validateEmail(validEmailData);
      expect(result.id).toBe('msg123');
    });

    it('should throw for invalid data', () => {
      expect(() => validateEmail({ invalid: true })).toThrow();
    });
  });

  describe('safeValidateEmail', () => {
    it('should return success true for valid data', () => {
      const result = safeValidateEmail(validEmailData);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should return success false for invalid data', () => {
      const result = safeValidateEmail({ invalid: true });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('validateEmailAddress', () => {
    it('should validate email address', () => {
      const result = validateEmailAddress({ email: 'test@example.com' });
      expect(result.email).toBe('test@example.com');
    });

    it('should throw for invalid email', () => {
      expect(() => validateEmailAddress({ email: 'invalid' })).toThrow();
    });
  });
});
