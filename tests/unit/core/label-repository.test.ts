/**
 * Unit tests for LabelRepository
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { LabelRepository } from '../../../src/core/services/label-repository.js';
import type { Label } from '../../../src/core/models/label.js';

describe('LabelRepository', () => {
  let db: Database.Database;
  let labelRepository: LabelRepository;

  const mockLabels: Label[] = [
    {
      id: 'LABEL_1',
      name: 'Important',
      type: 'user',
      color: { backgroundColor: '#ff0000', textColor: '#ffffff' },
      updatedAt: new Date('2024-01-01T00:00:00Z'),
    },
    {
      id: 'INBOX',
      name: 'Inbox',
      type: 'system',
      color: undefined,
      updatedAt: new Date('2024-01-01T00:00:00Z'),
    },
  ];

  beforeEach(() => {
    db = new Database(':memory:');
    labelRepository = new LabelRepository(db);
    labelRepository.initializeSchema();
  });

  afterEach(() => {
    db.close();
  });

  describe('cacheLabels', () => {
    it('should cache labels from Gmail', async () => {
      await labelRepository.cacheLabels(mockLabels);

      const retrieved = await labelRepository.getById('LABEL_1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Important');
    });
  });

  describe('getById', () => {
    it('should retrieve label by ID', async () => {
      await labelRepository.cacheLabels(mockLabels);

      const retrieved = await labelRepository.getById('INBOX');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Inbox');
      expect(retrieved?.type).toBe('system');
    });

    it('should handle label not found', async () => {
      const retrieved = await labelRepository.getById('NONEXISTENT');
      expect(retrieved).toBeNull();
    });
  });

  describe('listAll', () => {
    it('should list all labels', async () => {
      await labelRepository.cacheLabels(mockLabels);

      const labels = await labelRepository.listAll();
      expect(labels).toHaveLength(2);
    });
  });

  describe('syncLabels', () => {
    it('should sync labels with Gmail API', async () => {
      await labelRepository.syncLabels(mockLabels);

      const labels = await labelRepository.listAll();
      expect(labels).toHaveLength(2);
    });
  });
});
