import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { projects, tasks, resources } from "@shared/schema";
import { eq, and, isNull } from "drizzle-orm";

/**
 * Check if user owns the project
 */
export async function requireProjectOwnership(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const userId = (req.session as any)?.userId;
  const projectId = parseInt(req.params.projectId || req.params.id);

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (isNaN(projectId)) {
    return res.status(400).json({ message: "Invalid project ID" });
  }

  try {
    const [project] = await db
      .select({ id: projects.id, userId: projects.userId })
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          isNull(projects.deletedAt)
        )
      );

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.userId !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    next();
  } catch (error) {
    console.error("Error checking project ownership:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Check if user owns the task (via project ownership)
 */
export async function requireTaskOwnership(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const userId = (req.session as any)?.userId;
  const taskId = parseInt(req.params.taskId || req.params.id);

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (isNaN(taskId)) {
    return res.status(400).json({ message: "Invalid task ID" });
  }

  try {
    // Get task with its project
    const [task] = await db
      .select({
        taskId: tasks.id,
        projectId: tasks.projectId
      })
      .from(tasks)
      .where(eq(tasks.id, taskId));

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check project ownership
    const [project] = await db
      .select({ userId: projects.userId })
      .from(projects)
      .where(
        and(
          eq(projects.id, task.projectId),
          isNull(projects.deletedAt)
        )
      );

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.userId !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    next();
  } catch (error) {
    console.error("Error checking task ownership:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Middleware factory to validate project exists and user has access
 */
export function validateProjectAccess() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.session as any)?.userId;
    const projectId = parseInt(req.params.projectId || req.params.id || req.body.projectId);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (isNaN(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    try {
      const [project] = await db
        .select({ id: projects.id, userId: projects.userId })
        .from(projects)
        .where(
          and(
            eq(projects.id, projectId),
            isNull(projects.deletedAt)
          )
        );

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (project.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Attach project to request for later use
      (req as any).project = project;
      next();
    } catch (error) {
      console.error("Error validating project access:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
}
