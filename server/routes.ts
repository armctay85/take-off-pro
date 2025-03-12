import { Router } from "express";
import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertTaskSchema, insertResourceSchema, insertResourceAssignmentSchema } from "@shared/schema";

export async function registerRoutes(app: Express) {
  const apiRouter = Router();

  // Project routes
  apiRouter.get("/projects", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  apiRouter.get("/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(parseInt(req.params.id));
      if (!project) return res.status(404).json({ error: "Project not found" });
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  apiRouter.post("/projects", async (req, res) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      res.status(400).json({ error: "Invalid project data" });
    }
  });

  // Task routes
  apiRouter.get("/projects/:projectId/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTasks(parseInt(req.params.projectId));
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  apiRouter.post("/projects/:projectId/tasks", async (req, res) => {
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

  // Resource routes
  apiRouter.get("/resources", async (req, res) => {
    try {
      const resources = await storage.getResources();
      res.json(resources);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch resources" });
    }
  });

  apiRouter.post("/resources", async (req, res) => {
    try {
      const resourceData = insertResourceSchema.parse(req.body);
      const resource = await storage.createResource(resourceData);
      res.status(201).json(resource);
    } catch (error) {
      res.status(400).json({ error: "Invalid resource data" });
    }
  });

  // Resource assignment routes
  apiRouter.get("/tasks/:taskId/assignments", async (req, res) => {
    try {
      const assignments = await storage.getResourceAssignments(parseInt(req.params.taskId));
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch resource assignments" });
    }
  });

  apiRouter.post("/tasks/:taskId/assignments", async (req, res) => {
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

  // Critical path routes
  apiRouter.get("/projects/:projectId/critical-path", async (req, res) => {
    try {
      const criticalPath = await storage.getCriticalPath(parseInt(req.params.projectId));
      res.json(criticalPath);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch critical path" });
    }
  });

  app.use("/api", apiRouter);
  return createServer(app);
}
