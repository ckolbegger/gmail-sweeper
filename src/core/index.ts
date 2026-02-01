/**
 * Core Module Barrel Export
 *
 * Re-exports all core functionality.
 */

// Contracts - shared type definitions
export * from './contracts/index.js';

// Models - runtime types and validation (exports different from contracts)
export * from './models/index.js';

// Errors
export * from './errors/index.js';

// Logging
export * from './logging/index.js';

// Persistence
export { AppDatabase, getDefaultDatabase, resetDefaultDatabase } from './persistence/database.js';
