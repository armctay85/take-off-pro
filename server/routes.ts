import { Router } from "express";
import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertTaskSchema, insertResourceSchema, insertResourceAssignmentSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { setupAuth, isAuthenticated } from "./replitAuth";

export async function registerRoutes(app: Express) {
  // Setup authentication first
  await setupAuth(app);

  const apiRouter = Router();

  // Auth routes
  apiRouter.get('/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Project routes (protected)
  apiRouter.get("/projects", isAuthenticated, async (_req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
      res.status(500).json({ 
        error: "Failed to fetch projects",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  apiRouter.get("/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(parseInt(req.params.id));
      if (!project) return res.status(404).json({ error: "Project not found" });
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  apiRouter.post("/projects", isAuthenticated, async (req, res) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ 
          error: "Invalid project data",
          details: fromZodError(error).message
        });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  // Task routes (protected)
  apiRouter.get("/projects/:projectId/tasks", isAuthenticated, async (req, res) => {
    try {
      const tasks = await storage.getTasks(parseInt(req.params.projectId));
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  apiRouter.post("/projects/:projectId/tasks", isAuthenticated, async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse({
        ...req.body,
        projectId: parseInt(req.params.projectId)
      });
      const task = await storage.createTask(taskData);
      res.status(201).json(task);
    } catch (error) {
      res.status(400).json({ error: "Invalid task data" });
    }
  });

  // Resource routes (protected)
  apiRouter.get("/resources", isAuthenticated, async (_req, res) => {
    try {
      const resources = await storage.getResources();
      res.json(resources);
    } catch (error) {
      console.error("Failed to fetch resources:", error);
      res.status(500).json({ 
        error: "Failed to fetch resources",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  apiRouter.post("/resources", isAuthenticated, async (req, res) => {
    try {
      const resourceData = insertResourceSchema.parse(req.body);
      const resource = await storage.createResource(resourceData);
      res.status(201).json(resource);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ 
          error: "Invalid resource data",
          details: fromZodError(error).message
        });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  // Resource assignment routes (protected)
  apiRouter.get("/tasks/:taskId/assignments", isAuthenticated, async (req, res) => {
    try {
      const assignments = await storage.getResourceAssignments(parseInt(req.params.taskId));
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch resource assignments" });
    }
  });

  apiRouter.post("/tasks/:taskId/assignments", isAuthenticated, async (req, res) => {
    try {
      const assignmentData = insertResourceAssignmentSchema.parse({
        ...req.body,
        taskId: parseInt(req.params.taskId)
      });
      const assignment = await storage.createResourceAssignment(assignmentData);
      res.status(201).json(assignment);
    } catch (error) {
      res.status(400).json({ error: "Invalid resource assignment data" });
    }
  });

  // Critical path routes (protected)
  apiRouter.get("/projects/:projectId/critical-path", isAuthenticated, async (req, res) => {
    try {
      const criticalPath = await storage.getCriticalPath(parseInt(req.params.projectId));
      res.json(criticalPath);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch critical path" });
    }
  });

  // Mount API routes
  app.use("/api", apiRouter);
  return createServer(app);
}