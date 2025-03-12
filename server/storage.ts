import {
  Project, InsertProject,
  Task, InsertTask,
  Resource, InsertResource,
  ResourceAssignment, InsertResourceAssignment,
  CriticalPath, InsertCriticalPath,
  projects,
  tasks,
  resources,
  resourceAssignments,
  criticalPaths
} from "@shared/schema";
import { db } from './db';
import { eq } from 'drizzle-orm';

export interface IStorage {
  // Project operations
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<Project>): Promise<Project>;
  deleteProject(id: number): Promise<void>;

  // Task operations
  getTasks(projectId: number): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<Task>): Promise<Task>;
  deleteTask(id: number): Promise<void>;

  // Resource operations
  getResources(): Promise<Resource[]>;
  getResource(id: number): Promise<Resource | undefined>;
  createResource(resource: InsertResource): Promise<Resource>;
  updateResource(id: number, resource: Partial<Resource>): Promise<Resource>;
  deleteResource(id: number): Promise<void>;

  // Resource assignment operations
  getResourceAssignments(taskId: number): Promise<ResourceAssignment[]>;
  createResourceAssignment(assignment: InsertResourceAssignment): Promise<ResourceAssignment>;
  deleteResourceAssignment(id: number): Promise<void>;

  // Critical path operations
  getCriticalPath(projectId: number): Promise<CriticalPath[]>;
  updateCriticalPath(projectId: number, paths: InsertCriticalPath[]): Promise<CriticalPath[]>;
}

export class PostgresStorage implements IStorage {
  // Project operations
  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects);
  }

  async getProject(id: number): Promise<Project | undefined> {
    const result = await db.select().from(projects).where(eq(projects.id, id));
    return result[0];
  }

  async createProject(project: InsertProject): Promise<Project> {
    const result = await db.insert(projects).values(project).returning();
    return result[0];
  }

  async updateProject(id: number, project: Partial<Project>): Promise<Project> {
    const result = await db
      .update(projects)
      .set(project)
      .where(eq(projects.id, id))
      .returning();
    return result[0];
  }

  async deleteProject(id: number): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Task operations
  async getTasks(projectId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.projectId, projectId));
  }

  async getTask(id: number): Promise<Task | undefined> {
    const result = await db.select().from(tasks).where(eq(tasks.id, id));
    return result[0];
  }

  async createTask(task: InsertTask): Promise<Task> {
    const result = await db.insert(tasks).values(task).returning();
    return result[0];
  }

  async updateTask(id: number, task: Partial<Task>): Promise<Task> {
    const result = await db
      .update(tasks)
      .set(task)
      .where(eq(tasks.id, id))
      .returning();
    return result[0];
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  // Resource operations
  async getResources(): Promise<Resource[]> {
    return await db.select().from(resources);
  }

  async getResource(id: number): Promise<Resource | undefined> {
    const result = await db.select().from(resources).where(eq(resources.id, id));
    return result[0];
  }

  async createResource(resource: InsertResource): Promise<Resource> {
    const result = await db.insert(resources).values(resource).returning();
    return result[0];
  }

  async updateResource(id: number, resource: Partial<Resource>): Promise<Resource> {
    const result = await db
      .update(resources)
      .set(resource)
      .where(eq(resources.id, id))
      .returning();
    return result[0];
  }

  async deleteResource(id: number): Promise<void> {
    await db.delete(resources).where(eq(resources.id, id));
  }

  // Resource assignment operations
  async getResourceAssignments(taskId: number): Promise<ResourceAssignment[]> {
    return await db
      .select()
      .from(resourceAssignments)
      .where(eq(resourceAssignments.taskId, taskId));
  }

  async createResourceAssignment(assignment: InsertResourceAssignment): Promise<ResourceAssignment> {
    const result = await db.insert(resourceAssignments).values(assignment).returning();
    return result[0];
  }

  async deleteResourceAssignment(id: number): Promise<void> {
    await db.delete(resourceAssignments).where(eq(resourceAssignments.id, id));
  }

  // Critical path operations
  async getCriticalPath(projectId: number): Promise<CriticalPath[]> {
    return await db
      .select()
      .from(criticalPaths)
      .where(eq(criticalPaths.projectId, projectId));
  }

  async updateCriticalPath(projectId: number, paths: InsertCriticalPath[]): Promise<CriticalPath[]> {
    // First delete existing paths
    await db.delete(criticalPaths).where(eq(criticalPaths.projectId, projectId));

    // Then insert new paths
    if (paths.length > 0) {
      return await db.insert(criticalPaths).values(paths).returning();
    }
    return [];
  }
}

export const storage = new PostgresStorage();