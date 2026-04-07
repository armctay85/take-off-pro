/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />

import '@testing-library/jest-dom';

// Mock environment variables
process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
process.env.SESSION_SECRET = 'test-secret-key-for-testing-only';
process.env.NODE_ENV = 'test';

// Global test setup
beforeAll(() => {
  // Any global setup before all tests
});

afterAll(() => {
  // Any global cleanup after all tests
});
