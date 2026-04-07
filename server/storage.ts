import {
  Project, InsertProject,
  Task, InsertTask,
  Resource, InsertResource,
  ResourceAssignment, InsertResourceAssignment,
  CriticalPath, InsertCriticalPath,
  User, UpsertUser,
  projects,
  tasks,
  resources,
  resourceAssignments,
  criticalPaths,
  users,
  auditLogs
} from "@shared/schema";
import { db } from './db';
import { eq, and, isNull, desc } from 'drizzle-orm';

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Project operations
  getProjects(userId: string): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<Project>): Promise<Project>;
  deleteProject(id: number): Promise<void>;
  restoreProject(id: number): Promise<Project>;

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

  // Audit log operations
  getAuditLogs(userId: string, limit?: number): Promise<any[]>;
}

export class PostgresStorage implements IStorage {
  // ============================================================================
  // USER OPERATIONS
  // ============================================================================

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // ============================================================================
  // PROJECT OPERATIONS
  // ============================================================================

  async getProjects(userId: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.userId, userId),
          isNull(projects.deletedAt)
        )
      )
      .orderBy(desc(projects.createdAt));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, id),
          isNull(projects.deletedAt)
        )
      );
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db
      .insert(projects)
      .values({
        userId: project.userId,
        name: project.name,
        description: project.description,
        startDate: project.startDate,
        endDate: project.endDate,
        budget: project.budget.toString(),
        status: project.status,
      })
      .returning();
    return newProject;
  }

  async updateProject(id: number, project: Partial<Project>): Promise<Project> {
    const [updated] = await db
      .update(projects)
      .set({
        ...project,
        updatedAt: new Date()
      })
      .where(eq(projects.id, id))
      .returning();
    return updated;
  }

  async deleteProject(id: number): Promise<void> {
    // Soft delete
    await db
      .update(projects)
      .set({ deletedAt: new Date() })
      .where(eq(projects.id, id));
  }

  async restoreProject(id: number): Promise<Project> {
    const [restored] = await db
      .update(projects)
      .set({ deletedAt: null })
      .where(eq(projects.id, id))
      .returning();
    return restored;
  }

  // ============================================================================
  // TASK OPERATIONS
  // ============================================================================

  async getTasks(projectId: number): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId))
      .orderBy(tasks.startDate);
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id));
    return task;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db
      .insert(tasks)
      .values(task)
      .returning();
    return newTask;
  }

  async updateTask(id: number, task: Partial<Task>): Promise<Task> {
    const [updated] = await db
      .update(tasks)
      .set(task)
      .where(eq(tasks.id, id))
      .returning();
    return updated;
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  // ============================================================================
  // RESOURCE OPERATIONS
  // ============================================================================

  async getResources(): Promise<Resource[]> {
    return await db
      .select()
      .from(resources)
      .orderBy(resources.name);
  }

  async getResource(id: number): Promise<Resource | undefined> {
    const [resource] = await db
      .select()
      .from(resources)
      .where(eq(resources.id, id));
    return resource;
  }

  async createResource(resource: InsertResource): Promise<Resource> {
    const [newResource] = await db
      .insert(resources)
      .values({
        ...resource,
        costPerHour: resource.costPerHour.toString()
      })
      .returning();
    return newResource;
  }

  async updateResource(id: number, resource: Partial<Resource>): Promise<Resource> {
    const [updated] = await db
      .update(resources)
      .set(resource)
      .where(eq(resources.id, id))
      .returning();
    return updated;
  }

  async deleteResource(id: number): Promise<void> {
    await db.delete(resources).where(eq(resources.id, id));
  }

  // ============================================================================
  // RESOURCE ASSIGNMENT OPERATIONS
  // ============================================================================

  async getResourceAssignments(taskId: number): Promise<ResourceAssignment[]> {
    return await db
      .select()
      .from(resourceAssignments)
      .where(eq(resourceAssignments.taskId, taskId));
  }

  async createResourceAssignment(assignment: InsertResourceAssignment): Promise<ResourceAssignment> {
    const [newAssignment] = await db
      .insert(resourceAssignments)
      .values(assignment)
      .returning();
    return newAssignment;
  }

  async deleteResourceAssignment(id: number): Promise<void> {
    await db.delete(resourceAssignments).where(eq(resourceAssignments.id, id));
  }

  // ============================================================================
  // CRITICAL PATH OPERATIONS
  // ============================================================================

  async getCriticalPath(projectId: number): Promise<CriticalPath[]> {
    return await db
      .select()
      .from(criticalPaths)
      .where(eq(criticalPaths.projectId, projectId))
      .orderBy(criticalPaths.earliestStart);
  }

  async updateCriticalPath(projectId: number, paths: InsertCriticalPath[]): Promise<CriticalPath[]> {
    return await db.transaction(async (tx) => {
      // Delete existing paths
      await tx
        .delete(criticalPaths)
        .where(eq(criticalPaths.projectId, projectId));

      // Insert new paths
      if (paths.length > 0) {
        return await tx
          .insert(criticalPaths)
          .values(paths)
          .returning();
      }
      return [];
    });
  }

  // ============================================================================
  // AUDIT LOG OPERATIONS
  // ============================================================================

  async getAuditLogs(userId: string, limit: number = 50): Promise<any[]> {
    return await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(Math.min(limit, 100));
  }
}

export const storage = new PostgresStorage();
