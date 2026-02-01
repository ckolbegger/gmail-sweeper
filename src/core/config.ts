/**
 * T032-T033: Configuration loading and management.
 */

import { mkdir, writeFile, readFile, access } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { ConfigurationError } from './errors.js';
import { DEFAULT_CONFIG, type Config } from './models/index.js';

/** Configuration file name */
export const CONFIG_FILE = 'config.json';

/** Default config directory */
export const DEFAULT_CONFIG_DIR = join(homedir(), '.config', 'gmail-sweep');

/**
 * Gets the full path to the config file.
 * @param configDir - Configuration directory
 * @returns Full path to config file
 */
export function getConfigPath(configDir: string = DEFAULT_CONFIG_DIR): string {
  return join(configDir, CONFIG_FILE);
}

/**
 * T032: Loads configuration from the config directory.
 * @param configDir - Configuration directory (defaults to ~/.config/gmail-sweep)
 * @returns Configuration object merged with defaults
 * @throws ConfigurationError on malformed JSON
 */
export async function loadConfig(configDir: string = DEFAULT_CONFIG_DIR): Promise<Config> {
  const configPath = getConfigPath(configDir);

  try {
    await access(configPath);
    const content = await readFile(configPath, 'utf-8');

    let parsed: Partial<Config>;
    try {
      parsed = JSON.parse(content) as Partial<Config>;
    } catch {
      throw new ConfigurationError(`Malformed configuration file: ${configPath}`);
    }

    // Merge with defaults to ensure all fields exist
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
    };
  } catch (error) {
    if (error instanceof ConfigurationError) {
      throw error;
    }

    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === 'ENOENT') {
      // File doesn't exist, return defaults
      return DEFAULT_CONFIG;
    }

    throw new ConfigurationError(
      `Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * T033: Creates default configuration file if it doesn't exist.
 * @param configDir - Configuration directory
 */
export async function createDefaultConfig(configDir: string = DEFAULT_CONFIG_DIR): Promise<void> {
  const configPath = getConfigPath(configDir);

  // Ensure directory exists
  await mkdir(configDir, { recursive: true });

  // Check if config already exists
  try {
    await access(configPath);
    // File exists, don't overwrite
    return;
  } catch {
    // File doesn't exist, continue to create
  }

  // Write default config
  await writeFile(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8');
}

/**
 * Saves configuration to the config directory.
 * @param config - Configuration to save
 * @param configDir - Configuration directory
 */
export async function saveConfig(
  config: Config,
  configDir: string = DEFAULT_CONFIG_DIR
): Promise<void> {
  const configPath = getConfigPath(configDir);

  // Ensure directory exists
  await mkdir(configDir, { recursive: true });

  await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Validates a configuration object.
 * @param config - Configuration to validate
 * @throws ConfigurationError if invalid
 */
export function validateConfig(config: Config): void {
  if (config.initialLoadSize < 1 || config.initialLoadSize > 500) {
    throw new ConfigurationError('initialLoadSize must be between 1 and 500');
  }

  if (!['claude', 'gemini'].includes(config.llmProvider)) {
    throw new ConfigurationError('llmProvider must be "claude" or "gemini"');
  }

  if (!config.llmApiKeyEnv) {
    throw new ConfigurationError('llmApiKeyEnv is required');
  }
}
