import { beforeAll, afterAll } from 'vitest';

// Global test setup
beforeAll(async () => {
  // Use in-memory database for tests
  process.env.DATABASE_PATH = ':memory:';
});

afterAll(async () => {
  // Cleanup database connections after all tests
  // Database will be initialized in src/core/persistence/database.ts
});
