/**
 * T031-T033: Unit tests for config loading.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { tmpdir } from 'os';
import { rm, mkdir, writeFile, access } from 'fs/promises';
import {
  loadConfig,
  createDefaultConfig,
  getConfigPath,
  CONFIG_FILE,
} from '../../src/core/config.js';
import { DEFAULT_CONFIG, type Config } from '../../src/core/models/index.js';
import { ConfigurationError } from '../../src/core/errors.js';

describe('Config Loading', () => {
  let testConfigDir: string;

  beforeEach(async () => {
    testConfigDir = join(tmpdir(), `gmail-sweep-config-test-${Date.now()}`);
    await mkdir(testConfigDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testConfigDir, { recursive: true, force: true });
  });

  describe('T031: loadConfig', () => {
    it('should load config from config directory', async () => {
      const config: Config = {
        ...DEFAULT_CONFIG,
        gmailAccount: 'test@gmail.com',
        initialLoadSize: 100,
      };

      await writeFile(join(testConfigDir, CONFIG_FILE), JSON.stringify(config, null, 2));

      const loaded = await loadConfig(testConfigDir);

      expect(loaded.gmailAccount).toBe('test@gmail.com');
      expect(loaded.initialLoadSize).toBe(100);
    });

    it('should return default config if file not exists', async () => {
      const emptyDir = join(testConfigDir, 'empty');
      await mkdir(emptyDir, { recursive: true });

      const loaded = await loadConfig(emptyDir);

      expect(loaded).toEqual(DEFAULT_CONFIG);
    });

    it('should throw on malformed JSON', async () => {
      await writeFile(join(testConfigDir, CONFIG_FILE), 'not valid json {{{');

      await expect(loadConfig(testConfigDir)).rejects.toThrow(ConfigurationError);
    });

    it('should merge partial config with defaults', async () => {
      const partialConfig = {
        gmailAccount: 'partial@gmail.com',
        // Missing other fields
      };

      await writeFile(join(testConfigDir, CONFIG_FILE), JSON.stringify(partialConfig, null, 2));

      const loaded = await loadConfig(testConfigDir);

      expect(loaded.gmailAccount).toBe('partial@gmail.com');
      expect(loaded.initialLoadSize).toBe(DEFAULT_CONFIG.initialLoadSize);
      expect(loaded.llmProvider).toBe(DEFAULT_CONFIG.llmProvider);
      expect(loaded.confirmDestructive).toBe(DEFAULT_CONFIG.confirmDestructive);
    });
  });

  describe('T033: createDefaultConfig', () => {
    it('should create config directory if not exists', async () => {
      const newDir = join(testConfigDir, 'nested', 'config');

      await createDefaultConfig(newDir);

      await expect(access(newDir)).resolves.toBeUndefined();
    });

    it('should write default config with all required fields', async () => {
      await createDefaultConfig(testConfigDir);

      const loaded = await loadConfig(testConfigDir);

      expect(loaded).toHaveProperty('gmailAccount');
      expect(loaded).toHaveProperty('initialLoadSize');
      expect(loaded).toHaveProperty('llmProvider');
      expect(loaded).toHaveProperty('llmApiKeyEnv');
      expect(loaded).toHaveProperty('theme');
      expect(loaded).toHaveProperty('confirmDestructive');
    });

    it('should not overwrite existing config', async () => {
      const existingConfig: Config = {
        ...DEFAULT_CONFIG,
        gmailAccount: 'existing@gmail.com',
      };

      await writeFile(join(testConfigDir, CONFIG_FILE), JSON.stringify(existingConfig, null, 2));

      await createDefaultConfig(testConfigDir);

      const loaded = await loadConfig(testConfigDir);
      expect(loaded.gmailAccount).toBe('existing@gmail.com');
    });
  });

  describe('getConfigPath', () => {
    it('should return path in config directory', () => {
      const path = getConfigPath(testConfigDir);
      expect(path).toBe(join(testConfigDir, CONFIG_FILE));
    });
  });
});
