import { storage } from "./storage";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { projects, tasks, resources } from "@shared/schema";

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  components: {
    [key: string]: {
      status: 'healthy' | 'unhealthy';
      error?: string;
      details?: any;
    };
  };
  timestamp: string;
}

export async function performHealthCheck(): Promise<HealthCheckResult> {
  const result: HealthCheckResult = {
    status: 'healthy',
    components: {},
    timestamp: new Date().toISOString()
  };

  // Check database connection
  try {
    await db.execute(sql`SELECT 1`);
    result.components.database = { 
      status: 'healthy',
      details: { connection: 'established' }
    };
  } catch (error) {
    result.components.database = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown database error',
      details: { connection: 'failed' }
    };
    result.status = 'unhealthy';
  }

  // Check critical tables
  try {
    const [projectsCount] = await db.select({ count: sql`count(*)` }).from(projects);
    const [tasksCount] = await db.select({ count: sql`count(*)` }).from(tasks);
    const [resourcesCount] = await db.select({ count: sql`count(*)` }).from(resources);

    result.components.tables = { 
      status: 'healthy',
      details: {
        projects: projectsCount,
        tasks: tasksCount,
        resources: resourcesCount
      }
    };
  } catch (error) {
    result.components.tables = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Table check failed',
      details: { lastChecked: new Date().toISOString() }
    };
    result.status = 'unhealthy';
  }

  // Check storage methods
  try {
    await storage.getProjects();
    result.components.storage = { status: 'healthy' };
  } catch (error) {
    result.components.storage = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Storage methods check failed'
    };
    result.status = 'unhealthy';
  }

  return result;
}
