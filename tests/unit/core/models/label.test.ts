import { describe, it, expect } from 'vitest';
import {
  LabelSchema,
  validateLabel,
  safeValidateLabel,
  isSystemLabel,
  SYSTEM_LABELS,
} from '../../../../src/core/models/label.js';

describe('Label Model', () => {
  const validLabelData = {
    id: 'Label_123',
    name: 'Custom Label',
    type: 'user' as const,
    updatedAt: new Date(),
  };

  describe('LabelSchema', () => {
    it('should validate valid Label objects', () => {
      const result = LabelSchema.parse(validLabelData);
      expect(result.id).toBe('Label_123');
      expect(result.name).toBe('Custom Label');
    });

    it('should reject missing required fields', () => {
      const invalidData = { id: 'Label_123' };
      expect(() => LabelSchema.parse(invalidData)).toThrow();
    });

    it('should reject empty name', () => {
      const invalidData = { ...validLabelData, name: '' };
      expect(() => LabelSchema.parse(invalidData)).toThrow();
    });

    it('should distinguish system vs user labels', () => {
      const systemLabel = { ...validLabelData, type: 'system' as const };
      const result = LabelSchema.parse(systemLabel);
      expect(result.type).toBe('system');
    });

    it('should reject invalid label types', () => {
      const invalidData = { ...validLabelData, type: 'invalid' };
      expect(() => LabelSchema.parse(invalidData)).toThrow();
    });

    it('should handle optional color fields', () => {
      const withColor = {
        ...validLabelData,
        color: { backgroundColor: '#ffffff', textColor: '#000000' },
      };
      const result = LabelSchema.parse(withColor);
      expect(result.color).toBeDefined();
      expect(result.color?.backgroundColor).toBe('#ffffff');
    });
  });

  describe('validateLabel', () => {
    it('should return validated label for valid data', () => {
      const result = validateLabel(validLabelData);
      expect(result.id).toBe('Label_123');
    });

    it('should throw for invalid data', () => {
      expect(() => validateLabel({ invalid: true })).toThrow();
    });
  });

  describe('safeValidateLabel', () => {
    it('should return success true for valid data', () => {
      const result = safeValidateLabel(validLabelData);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should return success false for invalid data', () => {
      const result = safeValidateLabel({ invalid: true });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('isSystemLabel', () => {
    it('should return true for system labels', () => {
      expect(isSystemLabel('INBOX')).toBe(true);
      expect(isSystemLabel('SENT')).toBe(true);
      expect(isSystemLabel('TRASH')).toBe(true);
    });

    it('should return false for user labels', () => {
      expect(isSystemLabel('Label_123')).toBe(false);
      expect(isSystemLabel('CustomLabel')).toBe(false);
    });
  });

  describe('SYSTEM_LABELS', () => {
    it('should include all Gmail system labels', () => {
      expect(SYSTEM_LABELS).toContain('INBOX');
      expect(SYSTEM_LABELS).toContain('SENT');
      expect(SYSTEM_LABELS).toContain('DRAFT');
      expect(SYSTEM_LABELS).toContain('TRASH');
      expect(SYSTEM_LABELS).toContain('SPAM');
      expect(SYSTEM_LABELS).toContain('STARRED');
      expect(SYSTEM_LABELS).toContain('UNREAD');
      expect(SYSTEM_LABELS).toContain('IMPORTANT');
    });
  });
});
