import { Task, CriticalPath, InsertCriticalPath } from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { criticalPaths, tasks } from "@shared/schema";

interface TaskNode {
  id: number;
  name: string;
  duration: number;
  startDate: Date;
  endDate: Date;
  dependsOn: number | null;
  completed: boolean;
  projectId: number;
  // Calculated fields
  es: number; // Earliest Start (in days from project start)
  ef: number; // Earliest Finish
  ls: number; // Latest Start
  lf: number; // Latest Finish
  slack: number;
  predecessors: number[];
  successors: number[];
}

/**
 * Critical Path Method (CPM) Calculator
 * 
 * This implements the industry-standard CPM algorithm:
 * 1. Forward Pass: Calculate ES and EF for all tasks
 * 2. Backward Pass: Calculate LS and LF for all tasks
 * 3. Slack Calculation: LS - ES or LF - EF
 * 4. Critical Path: Tasks with zero slack
 */
export class CriticalPathCalculator {
  private taskMap: Map<number, TaskNode> = new Map();
  private projectStartDate: Date;

  constructor(
    private tasks: Task[],
    private projectId: number
  ) {
    this.projectStartDate = this.getProjectStartDate();
    this.buildTaskGraph();
  }

  private getProjectStartDate(): Date {
    if (this.tasks.length === 0) return new Date();
    return new Date(Math.min(...this.tasks.map(t => new Date(t.startDate).getTime())));
  }

  private buildTaskGraph(): void {
    // Initialize task nodes
    for (const task of this.tasks) {
      this.taskMap.set(task.id, {
        id: task.id,
        name: task.name,
        duration: task.duration,
        startDate: new Date(task.startDate),
        endDate: new Date(task.endDate),
        dependsOn: task.dependsOn,
        completed: task.completed,
        projectId: task.projectId,
        es: 0,
        ef: 0,
        ls: 0,
        lf: 0,
        slack: 0,
        predecessors: [],
        successors: []
      });
    }

    // Build predecessor/successor relationships
    for (const task of this.tasks) {
      const node = this.taskMap.get(task.id)!;
      
      if (task.dependsOn) {
        node.predecessors.push(task.dependsOn);
        const predecessor = this.taskMap.get(task.dependsOn);
        if (predecessor) {
          predecessor.successors.push(task.id);
        }
      }
    }
  }

  /**
   * Forward Pass: Calculate Earliest Start (ES) and Earliest Finish (EF)
   * 
   * ES = max(EF of all predecessors)
   * EF = ES + duration
   * 
   * For tasks with no predecessors, ES = 0
   */
  private forwardPass(): void {
    const visited = new Set<number>();
    const visiting = new Set<number>(); // For cycle detection

    const calculateES = (taskId: number): number => {
      if (visiting.has(taskId)) {
        throw new Error(`Circular dependency detected at task ${taskId}`);
      }
      
      if (visited.has(taskId)) {
        return this.taskMap.get(taskId)!.es;
      }

      visiting.add(taskId);
      const node = this.taskMap.get(taskId)!;

      if (node.predecessors.length === 0) {
        // No predecessors - start at day 0
        node.es = 0;
      } else {
        // ES = max(EF of all predecessors)
        let maxEF = 0;
        for (const predId of node.predecessors) {
          const predEF = calculateES(predId) + this.taskMap.get(predId)!.duration;
          maxEF = Math.max(maxEF, predEF);
        }
        node.es = maxEF;
      }

      node.ef = node.es + node.duration;
      
      visiting.delete(taskId);
      visited.add(taskId);
      
      return node.es;
    };

    // Calculate for all tasks
    for (const taskId of this.taskMap.keys()) {
      if (!visited.has(taskId)) {
        calculateES(taskId);
      }
    }
  }

  /**
   * Backward Pass: Calculate Latest Start (LS) and Latest Finish (LF)
   * 
   * LF = min(LS of all successors)
   * LS = LF - duration
   * 
   * For tasks with no successors, LF = project duration (max EF)
   */
  private backwardPass(): void {
    const projectDuration = Math.max(...Array.from(this.taskMap.values()).map(n => n.ef));
    
    const visited = new Set<number>();
    const visiting = new Set<number>();

    const calculateLF = (taskId: number): number => {
      if (visiting.has(taskId)) {
        throw new Error(`Circular dependency detected at task ${taskId}`);
      }
      
      if (visited.has(taskId)) {
        return this.taskMap.get(taskId)!.lf;
      }

      visiting.add(taskId);
      const node = this.taskMap.get(taskId)!;

      if (node.successors.length === 0) {
        // No successors - finish at project end
        node.lf = projectDuration;
      } else {
        // LF = min(LS of all successors)
        let minLS = Infinity;
        for (const succId of node.successors) {
          const succLS = calculateLF(succId) - this.taskMap.get(succId)!.duration;
          minLS = Math.min(minLS, succLS);
        }
        node.lf = minLS;
      }

      node.ls = node.lf - node.duration;
      
      visiting.delete(taskId);
      visited.add(taskId);
      
      return node.lf;
    };

    // Calculate for all tasks
    for (const taskId of this.taskMap.keys()) {
      if (!visited.has(taskId)) {
        calculateLF(taskId);
      }
    }
  }

  /**
   * Calculate Slack for all tasks
   * Slack = LS - ES = LF - EF
   * Tasks with zero slack are on the critical path
   */
  private calculateSlack(): void {
    for (const node of this.taskMap.values()) {
      node.slack = node.ls - node.es;
      // Verify: slack should also equal lf - ef
      const slackVerify = node.lf - node.ef;
      if (Math.abs(node.slack - slackVerify) > 0.01) {
        console.warn(`Slack calculation mismatch for task ${node.id}`);
      }
    }
  }

  /**
   * Execute the full CPM algorithm
   */
  calculate(): TaskNode[] {
    if (this.tasks.length === 0) {
      return [];
    }

    this.forwardPass();
    this.backwardPass();
    this.calculateSlack();

    return Array.from(this.taskMap.values());
  }

  /**
   * Get the critical path (tasks with zero slack)
   */
  getCriticalPath(): TaskNode[] {
    const allTasks = this.calculate();
    return allTasks.filter(t => t.slack === 0).sort((a, b) => a.es - b.es);
  }

  /**
   * Convert to database insert format
   */
  toInsertData(): InsertCriticalPath[] {
    const nodes = this.calculate();
    const baseDate = this.projectStartDate;
    
    return nodes.map(node => ({
      projectId: this.projectId,
      taskId: node.id,
      earliestStart: new Date(baseDate.getTime() + node.es * 24 * 60 * 60 * 1000),
      earliestFinish: new Date(baseDate.getTime() + node.ef * 24 * 60 * 60 * 1000),
      latestStart: new Date(baseDate.getTime() + node.ls * 24 * 60 * 60 * 1000),
      latestFinish: new Date(baseDate.getTime() + node.lf * 24 * 60 * 60 * 1000),
      slack: node.slack
    }));
  }
}

/**
 * Calculate and store critical path for a project
 */
export async function calculateAndStoreCriticalPath(projectId: number): Promise<CriticalPath[]> {
  // Get all tasks for the project
  const projectTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, projectId));

  if (projectTasks.length === 0) {
    // Clear existing critical path if no tasks
    await db.delete(criticalPaths).where(eq(criticalPaths.projectId, projectId));
    return [];
  }

  // Calculate critical path
  const calculator = new CriticalPathCalculator(projectTasks, projectId);
  const criticalPathData = calculator.toInsertData();

  // Store in database (within transaction)
  await db.transaction(async (tx) => {
    // Delete existing critical path
    await tx.delete(criticalPaths).where(eq(criticalPaths.projectId, projectId));
    
    // Insert new critical path
    if (criticalPathData.length > 0) {
      await tx.insert(criticalPaths).values(criticalPathData);
    }
  });

  return await db
    .select()
    .from(criticalPaths)
    .where(eq(criticalPaths.projectId, projectId));
}

/**
 * Get critical path with task details
 */
export async function getCriticalPathWithTasks(projectId: number) {
  const criticalPath = await db
    .select({
      criticalPath: criticalPaths,
      task: tasks
    })
    .from(criticalPaths)
    .innerJoin(tasks, eq(criticalPaths.taskId, tasks.id))
    .where(eq(criticalPaths.projectId, projectId))
    .orderBy(criticalPaths.earliestStart);

  return criticalPath.map(({ criticalPath: cp, task }) => ({
    ...cp,
    taskName: task.name,
    taskDescription: task.description,
    taskDuration: task.duration
  }));
}
