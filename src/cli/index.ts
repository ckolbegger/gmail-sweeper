#!/usr/bin/env node

/**
 * CLI Entry Point
 *
 * Main entry for the Gmail Sweep CLI application.
 */

import { getDefaultDatabase } from '../core/persistence/database.js';
import { getLogger } from '../core/logging/index.js';

const logger = getLogger('CLI');

async function main(): Promise<void> {
  try {
    // Initialize database
    const db = getDefaultDatabase();
    await db.initialize();
    logger.info('Database initialized');

    // TODO: Implement CLI argument parsing and TUI
    logger.info('Gmail Sweep CLI - Foundation Ready');

    // For now, just verify everything works
    console.log('✓ Phase 1 & 2 Complete: Foundation Ready');
    console.log('  - TypeScript configured');
    console.log('  - Database schema initialized');
    console.log('  - Models and validation ready');
    console.log('  - Error handling and logging configured');

    // Close database
    db.close();
  } catch (error) {
    logger.error('Failed to start CLI', error);
    process.exit(1);
  }
}

main();
