import {
  Project, InsertProject,
  Task, InsertTask,
  Resource, InsertResource,
  ResourceAssignment, InsertResourceAssignment,
  CriticalPath, InsertCriticalPath
} from "@shared/schema";

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

export class MemStorage implements IStorage {
  private projects: Map<number, Project>;
  private tasks: Map<number, Task>;
  private resources: Map<number, Resource>;
  private resourceAssignments: Map<number, ResourceAssignment>;
  private criticalPaths: Map<number, CriticalPath>;
  private currentIds: { [key: string]: number };

  constructor() {
    this.projects = new Map();
    this.tasks = new Map();
    this.resources = new Map();
    this.resourceAssignments = new Map();
    this.criticalPaths = new Map();
    this.currentIds = {
      projects: 1,
      tasks: 1,
      resources: 1,
      resourceAssignments: 1,
      criticalPaths: 1
    };
  }

  // Project operations
  async getProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(project: InsertProject): Promise<Project> {
    const id = this.currentIds.projects++;
    const newProject = { ...project, id } as Project;
    this.projects.set(id, newProject);
    return newProject;
  }

  async updateProject(id: number, project: Partial<Project>): Promise<Project> {
    const existing = this.projects.get(id);
    if (!existing) throw new Error('Project not found');
    const updated = { ...existing, ...project };
    this.projects.set(id, updated);
    return updated;
  }

  async deleteProject(id: number): Promise<void> {
    this.projects.delete(id);
  }

  // Task operations
  async getTasks(projectId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.projectId === projectId);
  }

  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async createTask(task: InsertTask): Promise<Task> {
    const id = this.currentIds.tasks++;
    const newTask = { ...task, id } as Task;
    this.tasks.set(id, newTask);
    return newTask;
  }

  async updateTask(id: number, task: Partial<Task>): Promise<Task> {
    const existing = this.tasks.get(id);
    if (!existing) throw new Error('Task not found');
    const updated = { ...existing, ...task };
    this.tasks.set(id, updated);
    return updated;
  }

  async deleteTask(id: number): Promise<void> {
    this.tasks.delete(id);
  }

  // Resource operations
  async getResources(): Promise<Resource[]> {
    return Array.from(this.resources.values());
  }

  async getResource(id: number): Promise<Resource | undefined> {
    return this.resources.get(id);
  }

  async createResource(resource: InsertResource): Promise<Resource> {
    const id = this.currentIds.resources++;
    const newResource = { ...resource, id } as Resource;
    this.resources.set(id, newResource);
    return newResource;
  }

  async updateResource(id: number, resource: Partial<Resource>): Promise<Resource> {
    const existing = this.resources.get(id);
    if (!existing) throw new Error('Resource not found');
    const updated = { ...existing, ...resource };
    this.resources.set(id, updated);
    return updated;
  }

  async deleteResource(id: number): Promise<void> {
    this.resources.delete(id);
  }

  // Resource assignment operations
  async getResourceAssignments(taskId: number): Promise<ResourceAssignment[]> {
    return Array.from(this.resourceAssignments.values())
      .filter(assignment => assignment.taskId === taskId);
  }

  async createResourceAssignment(assignment: InsertResourceAssignment): Promise<ResourceAssignment> {
    const id = this.currentIds.resourceAssignments++;
    const newAssignment = { ...assignment, id } as ResourceAssignment;
    this.resourceAssignments.set(id, newAssignment);
    return newAssignment;
  }

  async deleteResourceAssignment(id: number): Promise<void> {
    this.resourceAssignments.delete(id);
  }

  // Critical path operations
  async getCriticalPath(projectId: number): Promise<CriticalPath[]> {
    return Array.from(this.criticalPaths.values())
      .filter(path => path.projectId === projectId);
  }

  async updateCriticalPath(projectId: number, paths: InsertCriticalPath[]): Promise<CriticalPath[]> {
    // Remove existing critical paths for this project
    for (const [id, path] of this.criticalPaths) {
      if (path.projectId === projectId) {
        this.criticalPaths.delete(id);
      }
    }

    // Add new critical paths
    const newPaths: CriticalPath[] = [];
    for (const path of paths) {
      const id = this.currentIds.criticalPaths++;
      const newPath = { ...path, id } as CriticalPath;
      this.criticalPaths.set(id, newPath);
      newPaths.push(newPath);
    }

    return newPaths;
  }
}

export const storage = new MemStorage();
