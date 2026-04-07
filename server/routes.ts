import { Router } from "express";
import type { Express, Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { db } from "./db";
import { 
  projects, tasks, resources, resourceAssignments, criticalPaths, auditLogs,
  insertProjectSchema, insertTaskSchema, insertResourceSchema, insertResourceAssignmentSchema,
  type Project, type Task, type Resource
} from "@shared/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { fromZodError } from "zod-validation-error";
import { setupAuth, isAuthenticated } from "./auth";
import { requireProjectOwnership, requireTaskOwnership, validateProjectAccess } from "./middleware/authorization";
import { AuditLogger } from "./services/audit";
import { calculateAndStoreCriticalPath, getCriticalPathWithTasks } from "./services/critical-path";

// Async handler wrapper for proper error handling
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export async function registerRoutes(app: Express) {
  // Setup authentication first
  await setupAuth(app);

  // Health check — Railway uses this
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      service: 'develoop', 
      version: '1.0.0',
      timestamp: new Date().toISOString() 
    });
  });

  const apiRouter = Router();

  // ============================================================================
  // PROJECT ROUTES
  // ============================================================================

  // Get all projects for current user
  apiRouter.get("/projects", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    
    const userProjects = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.userId, userId),
          isNull(projects.deletedAt)
        )
      )
      .orderBy(desc(projects.createdAt));

    res.json(userProjects);
  }));

  // Get single project
  apiRouter.get("/projects/:id", isAuthenticated, requireProjectOwnership, asyncHandler(async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.id);
    
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json(project);
  }));

  // Create project
  apiRouter.post("/projects", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    
    const parseResult = insertProjectSchema.safeParse({
      ...req.body,
      userId
    });

    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid project data",
        details: fromZodError(parseResult.error).message
      });
    }

    // Validate date range
    if (parseResult.data.endDate <= parseResult.data.startDate) {
      return res.status(400).json({
        error: "Invalid date range",
        details: "End date must be after start date"
      });
    }

    const projectData = {
      ...parseResult.data,
      budget: parseResult.data.budget.toString()
    };

    const [project] = await db
      .insert(projects)
      .values(projectData)
      .returning();

    // Audit log
    await AuditLogger.logCreate(req, "project", project.id, parseResult.data);

    res.status(201).json(project);
  }));

  // Update project
  apiRouter.patch("/projects/:id", isAuthenticated, requireProjectOwnership, asyncHandler(async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.id);
    
    // Get existing project for audit
    const [existingProject] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!existingProject) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Update project
    const [updatedProject] = await db
      .update(projects)
      .set({
        ...req.body,
        updatedAt: new Date()
      })
      .where(eq(projects.id, projectId))
      .returning();

    // Audit log
    await AuditLogger.logUpdate(req, "project", projectId, existingProject, updatedProject);

    res.json(updatedProject);
  }));

  // Soft delete project
  apiRouter.delete("/projects/:id", isAuthenticated, requireProjectOwnership, asyncHandler(async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.id);
    
    // Get existing project for audit
    const [existingProject] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!existingProject) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Soft delete
    await db
      .update(projects)
      .set({ deletedAt: new Date() })
      .where(eq(projects.id, projectId));

    // Audit log
    await AuditLogger.logDelete(req, "project", projectId, existingProject);

    res.json({ message: "Project deleted successfully" });
  }));

  // ============================================================================
  // TASK ROUTES
  // ============================================================================

  // Get tasks for project
  apiRouter.get("/projects/:projectId/tasks", isAuthenticated, validateProjectAccess(), asyncHandler(async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.projectId);
    
    const projectTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId))
      .orderBy(tasks.startDate);

    res.json(projectTasks);
  }));

  // Create task
  apiRouter.post("/projects/:projectId/tasks", isAuthenticated, validateProjectAccess(), asyncHandler(async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.projectId);
    
    const parseResult = insertTaskSchema.safeParse({
      ...req.body,
      projectId
    });

    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid task data",
        details: fromZodError(parseResult.error).message
      });
    }

    const data = parseResult.data;

    // Validate dependency if provided
    if (data.dependsOn) {
      const [dependency] = await db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.id, data.dependsOn),
            eq(tasks.projectId, projectId)
          )
        );

      if (!dependency) {
        return res.status(400).json({
          error: "Invalid dependency",
          details: "Dependency task not found in this project"
        });
      }

      // Check for circular dependency (task depending on itself)
      if (data.dependsOn === data.id) {
        return res.status(400).json({
          error: "Invalid dependency",
          details: "Task cannot depend on itself"
        });
      }
    }

    // Create task and recalculate critical path in transaction
    const [task] = await db.transaction(async (tx) => {
      const [newTask] = await tx
        .insert(tasks)
        .values(data)
        .returning();

      return [newTask];
    });

    // Recalculate critical path asynchronously (don't block response)
    calculateAndStoreCriticalPath(projectId).catch(err => {
      console.error("Failed to recalculate critical path:", err);
    });

    // Audit log
    await AuditLogger.logCreate(req, "task", task.id, data);

    res.status(201).json(task);
  }));

  // Update task
  apiRouter.patch("/tasks/:id", isAuthenticated, requireTaskOwnership, asyncHandler(async (req: Request, res: Response) => {
    const taskId = parseInt(req.params.id);
    
    // Get existing task for audit
    const [existingTask] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId));

    if (!existingTask) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Update task
    const [updatedTask] = await db
      .update(tasks)
      .set(req.body)
      .where(eq(tasks.id, taskId))
      .returning();

    // Recalculate critical path asynchronously
    calculateAndStoreCriticalPath(existingTask.projectId).catch(err => {
      console.error("Failed to recalculate critical path:", err);
    });

    // Audit log
    await AuditLogger.logUpdate(req, "task", taskId, existingTask, updatedTask);

    res.json(updatedTask);
  }));

  // Delete task
  apiRouter.delete("/tasks/:id", isAuthenticated, requireTaskOwnership, asyncHandler(async (req: Request, res: Response) => {
    const taskId = parseInt(req.params.id);
    
    // Get existing task for audit
    const [existingTask] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId));

    if (!existingTask) {
      return res.status(404).json({ error: "Task not found" });
    }

    const projectId = existingTask.projectId;

    // Delete in transaction
    await db.transaction(async (tx) => {
      // Delete resource assignments first
      await tx
        .delete(resourceAssignments)
        .where(eq(resourceAssignments.taskId, taskId));

      // Delete task
      await tx
        .delete(tasks)
        .where(eq(tasks.id, taskId));
    });

    // Recalculate critical path asynchronously
    calculateAndStoreCriticalPath(projectId).catch(err => {
      console.error("Failed to recalculate critical path:", err);
    });

    // Audit log
    await AuditLogger.logDelete(req, "task", taskId, existingTask);

    res.json({ message: "Task deleted successfully" });
  }));

  // ============================================================================
  // RESOURCE ROUTES
  // ============================================================================

  // Get all resources for current user
  apiRouter.get("/resources", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    
    // For now, return all resources (can be scoped to user later)
    const allResources = await db
      .select()
      .from(resources)
      .orderBy(resources.name);

    res.json(allResources);
  }));

  // Create resource
  apiRouter.post("/resources", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const parseResult = insertResourceSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid resource data",
        details: fromZodError(parseResult.error).message
      });
    }

    const resourceData = {
      ...parseResult.data,
      costPerHour: parseResult.data.costPerHour.toString()
    };

    const [resource] = await db
      .insert(resources)
      .values(resourceData)
      .returning();

    // Audit log
    await AuditLogger.logCreate(req, "resource", resource.id, parseResult.data);

    res.status(201).json(resource);
  }));

  // Update resource
  apiRouter.patch("/resources/:id", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const resourceId = parseInt(req.params.id);
    
    const [existingResource] = await db
      .select()
      .from(resources)
      .where(eq(resources.id, resourceId));

    if (!existingResource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    const [updatedResource] = await db
      .update(resources)
      .set(req.body)
      .where(eq(resources.id, resourceId))
      .returning();

    // Audit log
    await AuditLogger.logUpdate(req, "resource", resourceId, existingResource, updatedResource);

    res.json(updatedResource);
  }));

  // Delete resource
  apiRouter.delete("/resources/:id", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const resourceId = parseInt(req.params.id);
    
    const [existingResource] = await db
      .select()
      .from(resources)
      .where(eq(resources.id, resourceId));

    if (!existingResource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    // Check if resource is assigned to any tasks
    const assignments = await db
      .select()
      .from(resourceAssignments)
      .where(eq(resourceAssignments.resourceId, resourceId));

    if (assignments.length > 0) {
      return res.status(400).json({
        error: "Cannot delete resource",
        details: "Resource is assigned to one or more tasks"
      });
    }

    await db
      .delete(resources)
      .where(eq(resources.id, resourceId));

    // Audit log
    await AuditLogger.logDelete(req, "resource", resourceId, existingResource);

    res.json({ message: "Resource deleted successfully" });
  }));

  // ============================================================================
  // RESOURCE ASSIGNMENT ROUTES
  // ============================================================================

  // Get assignments for task
  apiRouter.get("/tasks/:taskId/assignments", isAuthenticated, requireTaskOwnership, asyncHandler(async (req: Request, res: Response) => {
    const taskId = parseInt(req.params.taskId);
    
    const assignments = await db
      .select({
        assignment: resourceAssignments,
        resource: resources
      })
      .from(resourceAssignments)
      .innerJoin(resources, eq(resourceAssignments.resourceId, resources.id))
      .where(eq(resourceAssignments.taskId, taskId));

    res.json(assignments);
  }));

  // Create assignment
  apiRouter.post("/tasks/:taskId/assignments", isAuthenticated, requireTaskOwnership, asyncHandler(async (req: Request, res: Response) => {
    const taskId = parseInt(req.params.taskId);
    
    const parseResult = insertResourceAssignmentSchema.safeParse({
      ...req.body,
      taskId
    });

    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid assignment data",
        details: fromZodError(parseResult.error).message
      });
    }

    // Verify resource exists
    const [resource] = await db
      .select()
      .from(resources)
      .where(eq(resources.id, parseResult.data.resourceId));

    if (!resource) {
      return res.status(400).json({
        error: "Invalid resource",
        details: "Resource not found"
      });
    }

    const [assignment] = await db
      .insert(resourceAssignments)
      .values(parseResult.data)
      .returning();

    // Audit log
    await AuditLogger.logCreate(req, "resource_assignment", assignment.id, parseResult.data);

    res.status(201).json(assignment);
  }));

  // Delete assignment
  apiRouter.delete("/assignments/:id", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const assignmentId = parseInt(req.params.id);
    
    const [existingAssignment] = await db
      .select()
      .from(resourceAssignments)
      .where(eq(resourceAssignments.id, assignmentId));

    if (!existingAssignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    // Check task ownership
    const [task] = await db
      .select({ projectId: tasks.projectId })
      .from(tasks)
      .where(eq(tasks.id, existingAssignment.taskId));

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const [project] = await db
      .select({ userId: projects.userId })
      .from(projects)
      .where(eq(projects.id, task.projectId));

    const userId = (req.session as any).userId;
    if (!project || project.userId !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    await db
      .delete(resourceAssignments)
      .where(eq(resourceAssignments.id, assignmentId));

    // Audit log
    await AuditLogger.logDelete(req, "resource_assignment", assignmentId, existingAssignment);

    res.json({ message: "Assignment deleted successfully" });
  }));

  // ============================================================================
  // CRITICAL PATH ROUTES
  // ============================================================================

  // Get critical path for project
  apiRouter.get("/projects/:projectId/critical-path", isAuthenticated, validateProjectAccess(), asyncHandler(async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.projectId);
    
    // Recalculate critical path (ensures it's always fresh)
    await calculateAndStoreCriticalPath(projectId);
    
    // Get with task details
    const criticalPath = await getCriticalPathWithTasks(projectId);

    res.json(criticalPath);
  }));

  // Force recalculate critical path
  apiRouter.post("/projects/:projectId/critical-path/recalculate", isAuthenticated, validateProjectAccess(), asyncHandler(async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.projectId);
    
    const criticalPath = await calculateAndStoreCriticalPath(projectId);
    
    // Audit log
    await AuditLogger.logCreate(req, "critical_path_recalculation", projectId, { projectId });

    res.json({
      message: "Critical path recalculated",
      taskCount: criticalPath.length
    });
  }));

  // ============================================================================
  // AUDIT LOG ROUTES
  // ============================================================================

  // Get audit logs for current user (admin feature, scoped to own projects)
  apiRouter.get("/audit-logs", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(logs);
  }));

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  // Global error handler
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err);
    
    // Don't leak error details in production
    const isDev = process.env.NODE_ENV !== "production";
    
    res.status(err.status || 500).json({
      error: err.message || "Internal Server Error",
      ...(isDev && { stack: err.stack })
    });
  });

  // Mount API routes
  app.use("/api", apiRouter);

  return createServer(app);
}
