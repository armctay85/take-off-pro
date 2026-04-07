# Testing Guide - Develoop Take-off Pro

## Quick Start

```bash
# Install dependencies (already done)
npm install

# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Run all tests (unit + E2E)
npm run test:all
```

## Test Structure

```
tests/
├── setup.ts                    # Global test configuration
├── unit/
│   ├── services/
│   │   └── critical-path.test.ts   # 23 tests - CPM algorithm
│   ├── auth/
│   │   └── auth.test.ts            # 17 tests - Authentication
│   └── api/
│       └── api.test.ts             # 13 tests - API endpoints
└── e2e/
    ├── auth.spec.ts                # Auth E2E tests
    ├── landing.spec.ts             # Landing page tests
    └── critical-flow.spec.ts       # Critical user flow
```

## Test Results Summary

| Test Suite | Tests | Status |
|------------|-------|--------|
| CPM Algorithm | 23 | ✅ Passing |
| Auth Flows | 17 | ✅ Passing |
| API Endpoints | 13 | ✅ Passing |
| **Total Unit** | **53** | **✅ 100%** |

## CPM Test Coverage

The CPM (Critical Path Method) tests cover:

1. **Forward Pass Calculation**
   - Tasks with no predecessors (ES = 0)
   - ES = max(EF of predecessors)
   - Multiple predecessors handling
   - Complex dependency chains

2. **Backward Pass Calculation**
   - Tasks with no successors (LF = project duration)
   - LF = min(LS of successors)
   - Multiple successors handling

3. **Slack Calculation**
   - Slack = LS - ES = LF - EF
   - Parallel path slack calculation

4. **Critical Path Identification**
   - Single task paths
   - Linear chains
   - Multiple path selection (zero slack only)
   - Sorting by ES

5. **Circular Dependency Detection**
   - Self-dependency
   - Simple cycles (A → B → A)
   - Complex cycles (A → B → C → A)

6. **Edge Cases**
   - Empty task lists
   - Zero duration tasks
   - Disconnected tasks
   - Diamond-shaped graphs

## NPM Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `test` | `vitest run` | Run all unit tests once |
| `test:watch` | `vitest` | Run tests in watch mode |
| `test:ui` | `vitest --ui` | Run tests with UI |
| `test:coverage` | `vitest run --coverage` | Run with coverage report |
| `test:e2e` | `playwright test` | Run E2E tests |
| `test:e2e:ui` | `playwright test --ui` | Run E2E with UI |
| `test:all` | `npm test && npm run test:e2e` | Run all tests |

## Configuration

- **Vitest Config**: `vitest.config.ts`
- **Playwright Config**: `playwright.config.ts`
- **Test Setup**: `tests/setup.ts`

## Notes

- E2E tests require the dev server running (configured to auto-start)
- Unit tests use mocked dependencies (no database required)
- All tests are written in TypeScript
