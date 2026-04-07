import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';

// Mock modules before importing routes - factories must be self-contained
vi.mock('../../../server/db', () => ({
  db: {
    select: vi.fn(() => ({ 
      from: vi.fn(() => ({ 
        where: vi.fn(() => Promise.resolve([])),
        innerJoin: vi.fn(() => ({ where: vi.fn(() => ({ orderBy: vi.fn(() => Promise.resolve([])) })) })),
        orderBy: vi.fn(() => Promise.resolve([])),
        limit: vi.fn(() => ({ offset: vi.fn(() => Promise.resolve([])) })),
      })),
    })),
    insert: vi.fn(() => ({ 
      values: vi.fn(() => ({ 
        returning: vi.fn(() => Promise.resolve([{ id: 1 }])) 
      })) 
    })),
    update: vi.fn(() => ({ 
      set: vi.fn(() => ({ 
        where: vi.fn(() => ({ 
          returning: vi.fn(() => Promise.resolve([{ id: 1 }])) 
        })) 
      })) 
    })),
    delete: vi.fn(() => ({ where: vi.fn(() => Promise.resolve()) })),
    transaction: vi.fn((fn) => fn({
      delete: vi.fn(() => ({ where: vi.fn(() => Promise.resolve()) })),
      insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([{ id: 1 }])) })) })),
    })),
  },
}));

vi.mock('../../../server/services/critical-path', () => ({
  calculateAndStoreCriticalPath: vi.fn(() => Promise.resolve([])),
  getCriticalPathWithTasks: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../../../server/services/audit', () => ({
  AuditLogger: {
    logCreate: vi.fn(() => Promise.resolve()),
    logUpdate: vi.fn(() => Promise.resolve()),
    logDelete: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('connect-pg-simple', () => ({
  default: vi.fn(() => vi.fn()),
}));

vi.mock('express-session', () => ({
  default: vi.fn(() => (req: any, res: any, next: any) => {
    req.session = req.session || { destroy: vi.fn((cb: any) => cb?.()) };
    next();
  }),
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(() => Promise.resolve('hashed_password')),
    compare: vi.fn(() => Promise.resolve(true)),
  },
  hash: vi.fn(() => Promise.resolve('hashed_password')),
  compare: vi.fn(() => Promise.resolve(true)),
}));

import { registerRoutes } from '../../../server/routes';

describe('API Endpoints', () => {
  let app: Express;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    app = express();
    app.use(express.json());
    
    // Mock session middleware with authenticated user
    app.use((req, res, next) => {
      req.session = { 
        userId: 'test-user-123',
        destroy: vi.fn((cb: any) => {
          req.session = null;
          if (cb) cb();
        })
      } as any;
      next();
    });
    
    await registerRoutes(app);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Health Check', () => {
    it('GET /api/health should return status ok', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        service: 'develoop',
        version: '1.0.0',
      });
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Authentication Endpoints', () => {
    describe('POST /api/register', () => {
      it('should return 400 if email or password is missing', async () => {
        const response = await request(app)
          .post('/api/register')
          .send({ email: '', password: '' })
          .expect(400);

        expect(response.body.message).toBe('Email and password are required');
      });

      it('should return 400 if password is less than 8 characters', async () => {
        const response = await request(app)
          .post('/api/register')
          .send({ email: 'test@example.com', password: 'short' })
          .expect(400);

        expect(response.body.message).toBe('Password must be at least 8 characters');
      });
    });

    describe('POST /api/login', () => {
      it('should return 400 if email or password is missing', async () => {
        const response = await request(app)
          .post('/api/login')
          .send({ email: '' })
          .expect(400);

        expect(response.body.message).toBe('Email and password are required');
      });
    });

    describe('POST /api/logout', () => {
      it('should logout successfully', async () => {
        const response = await request(app)
          .post('/api/logout')
          .expect(200);

        expect(response.body.message).toBe('Logged out');
      });
    });
  });

  describe('Project Endpoints', () => {
    describe('GET /api/projects', () => {
      it('should require authentication', async () => {
        // Create new app without session
        const appNoAuth = express();
        appNoAuth.use(express.json());
        await registerRoutes(appNoAuth);

        const response = await request(appNoAuth)
          .get('/api/projects')
          .expect(401);

        expect(response.body.message).toBe('Unauthorized');
      });
    });

    describe('POST /api/projects', () => {
      it('should validate project data', async () => {
        const invalidProject = {
          name: '', // Empty name
          description: 'Test description',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          budget: 10000,
        };

        const response = await request(app)
          .post('/api/projects')
          .send(invalidProject)
          .expect(400);

        expect(response.body.error).toBe('Invalid project data');
      });

      it('should validate date range', async () => {
        const invalidProject = {
          name: 'Test Project',
          description: 'Test description',
          startDate: '2024-01-31',
          endDate: '2024-01-01', // End before start
          budget: 10000,
        };

        const response = await request(app)
          .post('/api/projects')
          .send(invalidProject)
          .expect(400);

        expect(response.body.error).toBe('Invalid date range');
      });
    });
  });

  describe('Task Endpoints', () => {
    describe('POST /api/projects/:projectId/tasks', () => {
      it('should return 404 when project does not exist', async () => {
        const task = {
          name: 'Test Task',
          duration: 5,
          startDate: '2024-01-01',
          endDate: '2024-01-06',
        };

        // Returns 404 because project doesn't exist in mock
        const response = await request(app)
          .post('/api/projects/999/tasks')
          .send(task)
          .expect(404);

        expect(response.body.message).toBe('Project not found');
      });
    });
  });

  describe('Resource Endpoints', () => {
    describe('POST /api/resources', () => {
      it('should validate resource data', async () => {
        const invalidResource = {
          name: '', // Empty name
          role: 'Developer',
          costPerHour: 50,
        };

        const response = await request(app)
          .post('/api/resources')
          .send(invalidResource)
          .expect(400);

        expect(response.body.error).toBe('Invalid resource data');
      });

      it('should validate cost per hour is non-negative', async () => {
        const invalidResource = {
          name: 'Test Resource',
          role: 'Developer',
          costPerHour: -10, // Negative cost
        };

        const response = await request(app)
          .post('/api/resources')
          .send(invalidResource)
          .expect(400);

        expect(response.body.error).toBe('Invalid resource data');
      });
    });
  });

  describe('Input Validation', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Content-Type', 'application/json')
        .send('{"invalid json')
        .expect(400);

      expect(response.body).toBeDefined();
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });
});
