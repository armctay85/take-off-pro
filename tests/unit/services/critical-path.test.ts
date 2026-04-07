import { describe, it, expect, beforeEach } from 'vitest';
import { CriticalPathCalculator } from '../../../server/services/critical-path';
import type { Task } from '../../../shared/schema';

describe('CriticalPathCalculator', () => {
  let baseDate: Date;

  beforeEach(() => {
    baseDate = new Date('2024-01-01');
  });

  // Helper to create a task
  const createTask = (overrides: Partial<Task> = {}): Task => ({
    id: 1,
    projectId: 1,
    name: 'Test Task',
    description: null,
    duration: 5,
    startDate: baseDate,
    endDate: new Date(baseDate.getTime() + 5 * 24 * 60 * 60 * 1000),
    dependsOn: null,
    completed: false,
    ...overrides,
  });

  describe('Forward Pass Calculation', () => {
    it('should set ES=0 for tasks with no predecessors', () => {
      const tasks: Task[] = [
        createTask({ id: 1, duration: 5, dependsOn: null }),
      ];

      const calculator = new CriticalPathCalculator(tasks, 1);
      const result = calculator.calculate();

      expect(result).toHaveLength(1);
      expect(result[0].es).toBe(0);
      expect(result[0].ef).toBe(5);
    });

    it('should calculate ES as max(EF of all predecessors)', () => {
      const tasks: Task[] = [
        createTask({ id: 1, duration: 3, dependsOn: null }),
        createTask({ id: 2, duration: 4, dependsOn: 1 }),
      ];

      const calculator = new CriticalPathCalculator(tasks, 1);
      const result = calculator.calculate();

      const task2 = result.find(t => t.id === 2);
      expect(task2?.es).toBe(3); // EF of task 1
      expect(task2?.ef).toBe(7); // ES + duration
    });

    it('should handle multiple predecessors correctly', () => {
      const tasks: Task[] = [
        createTask({ id: 1, duration: 3, dependsOn: null }),
        createTask({ id: 2, duration: 5, dependsOn: null }),
        createTask({ id: 3, duration: 4, dependsOn: 1 }), // Will depend on both 1 and 2
      ];

      // Task 3 depends on task 1 (EF=3)
      // Task 2 has no dependents
      const calculator = new CriticalPathCalculator(tasks, 1);
      const result = calculator.calculate();

      const task3 = result.find(t => t.id === 3);
      expect(task3?.es).toBe(3); // max EF of predecessors
    });

    it('should handle complex dependency chains', () => {
      const tasks: Task[] = [
        createTask({ id: 1, duration: 2, dependsOn: null }), // ES=0, EF=2
        createTask({ id: 2, duration: 3, dependsOn: 1 }),    // ES=2, EF=5
        createTask({ id: 3, duration: 4, dependsOn: 2 }),    // ES=5, EF=9
      ];

      const calculator = new CriticalPathCalculator(tasks, 1);
      const result = calculator.calculate();

      expect(result.find(t => t.id === 1)?.ef).toBe(2);
      expect(result.find(t => t.id === 2)?.es).toBe(2);
      expect(result.find(t => t.id === 2)?.ef).toBe(5);
      expect(result.find(t => t.id === 3)?.es).toBe(5);
      expect(result.find(t => t.id === 3)?.ef).toBe(9);
    });
  });

  describe('Backward Pass Calculation', () => {
    it('should set LF=projectDuration for tasks with no successors', () => {
      const tasks: Task[] = [
        createTask({ id: 1, duration: 5, dependsOn: null }),
      ];

      const calculator = new CriticalPathCalculator(tasks, 1);
      const result = calculator.calculate();

      expect(result[0].lf).toBe(5); // Project duration
      expect(result[0].ls).toBe(0); // LF - duration
    });

    it('should calculate LF as min(LS of all successors)', () => {
      const tasks: Task[] = [
        createTask({ id: 1, duration: 3, dependsOn: null }),
        createTask({ id: 2, duration: 4, dependsOn: 1 }),
      ];

      const calculator = new CriticalPathCalculator(tasks, 1);
      const result = calculator.calculate();

      const task1 = result.find(t => t.id === 1);
      expect(task1?.lf).toBe(3); // LS of task 2
      expect(task1?.ls).toBe(0); // LF - duration
    });

    it('should handle tasks with multiple successors', () => {
      const tasks: Task[] = [
        createTask({ id: 1, duration: 3, dependsOn: null }),
        createTask({ id: 2, duration: 2, dependsOn: 1 }), // LS = 3
        createTask({ id: 3, duration: 4, dependsOn: 1 }), // LS = 3
      ];

      const calculator = new CriticalPathCalculator(tasks, 1);
      const result = calculator.calculate();

      const task1 = result.find(t => t.id === 1);
      expect(task1?.lf).toBe(3); // min(LS of successors)
    });
  });

  describe('Slack Calculation', () => {
    it('should calculate slack as LS - ES', () => {
      const tasks: Task[] = [
        createTask({ id: 1, duration: 5, dependsOn: null }),
      ];

      const calculator = new CriticalPathCalculator(tasks, 1);
      const result = calculator.calculate();

      expect(result[0].slack).toBe(0);
    });

    it('should calculate slack correctly for parallel paths', () => {
      // Path 1: Task 1 (3 days) -> Task 3 (4 days) = 7 days
      // Path 2: Task 2 (2 days) -> Task 3 (4 days) = 6 days
      // Task 2 has 1 day slack
      const tasks: Task[] = [
        createTask({ id: 1, duration: 3, dependsOn: null }),
        createTask({ id: 2, duration: 2, dependsOn: null }),
        createTask({ id: 3, duration: 4, dependsOn: 1 }), // Depends on longer path
      ];

      const calculator = new CriticalPathCalculator(tasks, 1);
      const result = calculator.calculate();

      const task2 = result.find(t => t.id === 2);
      expect(task2?.slack).toBeGreaterThanOrEqual(0);
    });

    it('should have consistent slack (LS - ES = LF - EF)', () => {
      const tasks: Task[] = [
        createTask({ id: 1, duration: 3, dependsOn: null }),
        createTask({ id: 2, duration: 5, dependsOn: 1 }),
        createTask({ id: 3, duration: 2, dependsOn: 1 }),
      ];

      const calculator = new CriticalPathCalculator(tasks, 1);
      const result = calculator.calculate();

      for (const task of result) {
        const slack1 = task.ls - task.es;
        const slack2 = task.lf - task.ef;
        expect(slack1).toBe(slack2);
        expect(task.slack).toBe(slack1);
      }
    });
  });

  describe('Critical Path Identification', () => {
    it('should identify single task as critical path', () => {
      const tasks: Task[] = [
        createTask({ id: 1, duration: 5, dependsOn: null }),
      ];

      const calculator = new CriticalPathCalculator(tasks, 1);
      const criticalPath = calculator.getCriticalPath();

      expect(criticalPath).toHaveLength(1);
      expect(criticalPath[0].id).toBe(1);
      expect(criticalPath[0].slack).toBe(0);
    });

    it('should identify critical path in linear chain', () => {
      const tasks: Task[] = [
        createTask({ id: 1, duration: 2, dependsOn: null }),
        createTask({ id: 2, duration: 3, dependsOn: 1 }),
        createTask({ id: 3, duration: 4, dependsOn: 2 }),
      ];

      const calculator = new CriticalPathCalculator(tasks, 1);
      const criticalPath = calculator.getCriticalPath();

      expect(criticalPath).toHaveLength(3);
      expect(criticalPath.map(t => t.id)).toEqual([1, 2, 3]);
      expect(criticalPath.every(t => t.slack === 0)).toBe(true);
    });

    it('should identify critical path when multiple paths exist', () => {
      // Critical path: 1 -> 3 (5 days)
      // Non-critical: 1 -> 2 (3 days), slack = 2
      const tasks: Task[] = [
        createTask({ id: 1, duration: 2, dependsOn: null }),   // ES=0, EF=2
        createTask({ id: 2, duration: 1, dependsOn: 1 }),      // ES=2, EF=3
        createTask({ id: 3, duration: 3, dependsOn: 1 }),      // ES=2, EF=5
      ];

      const calculator = new CriticalPathCalculator(tasks, 1);
      const criticalPath = calculator.getCriticalPath();

      expect(criticalPath.map(t => t.id)).toContain(1);
      expect(criticalPath.map(t => t.id)).toContain(3);
      expect(criticalPath.every(t => t.slack === 0)).toBe(true);
    });

    it('should sort critical path by ES', () => {
      const tasks: Task[] = [
        createTask({ id: 3, duration: 2, dependsOn: 2 }),
        createTask({ id: 1, duration: 2, dependsOn: null }),
        createTask({ id: 2, duration: 3, dependsOn: 1 }),
      ];

      const calculator = new CriticalPathCalculator(tasks, 1);
      const criticalPath = calculator.getCriticalPath();

      expect(criticalPath.map(t => t.id)).toEqual([1, 2, 3]);
    });
  });

  describe('Circular Dependency Detection', () => {
    it('should throw error for self-dependency', () => {
      const tasks: Task[] = [
        createTask({ id: 1, duration: 5, dependsOn: 1 }), // Self-dependency
      ];

      const calculator = new CriticalPathCalculator(tasks, 1);
      expect(() => calculator.calculate()).toThrow(/Circular dependency/);
    });

    it('should throw error for simple circular dependency', () => {
      const tasks: Task[] = [
        createTask({ id: 1, duration: 2, dependsOn: 2 }),
        createTask({ id: 2, duration: 3, dependsOn: 1 }),
      ];

      const calculator = new CriticalPathCalculator(tasks, 1);
      expect(() => calculator.calculate()).toThrow(/Circular dependency/);
    });

    it('should throw error for complex circular dependency', () => {
      const tasks: Task[] = [
        createTask({ id: 1, duration: 2, dependsOn: null }),
        createTask({ id: 2, duration: 3, dependsOn: 1 }),
        createTask({ id: 3, duration: 2, dependsOn: 2 }),
        createTask({ id: 4, duration: 1, dependsOn: 3 }), // Creates cycle back to 1
      ];

      // Make task 1 depend on task 4 to create cycle: 1 -> 2 -> 3 -> 4 -> 1
      tasks[0].dependsOn = 4;

      const calculator = new CriticalPathCalculator(tasks, 1);
      expect(() => calculator.calculate()).toThrow(/Circular dependency/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty task list', () => {
      const calculator = new CriticalPathCalculator([], 1);
      const result = calculator.calculate();

      expect(result).toHaveLength(0);
    });

    it('should handle tasks with zero duration', () => {
      const tasks: Task[] = [
        createTask({ id: 1, duration: 0, dependsOn: null }),
        createTask({ id: 2, duration: 5, dependsOn: 1 }),
      ];

      const calculator = new CriticalPathCalculator(tasks, 1);
      const result = calculator.calculate();

      expect(result.find(t => t.id === 1)?.ef).toBe(0);
      expect(result.find(t => t.id === 2)?.es).toBe(0);
    });

    it('should handle disconnected tasks', () => {
      const tasks: Task[] = [
        createTask({ id: 1, duration: 3, dependsOn: null }),
        createTask({ id: 2, duration: 5, dependsOn: null }),
      ];

      const calculator = new CriticalPathCalculator(tasks, 1);
      const result = calculator.calculate();

      expect(result).toHaveLength(2);
      expect(result.every(t => t.es === 0)).toBe(true);
    });

    it('should handle diamond-shaped dependency graph', () => {
      //     1
      //    / \
      //   2   3
      //    \ /
      //     4
      const tasks: Task[] = [
        createTask({ id: 1, duration: 2, dependsOn: null }),
        createTask({ id: 2, duration: 3, dependsOn: 1 }),
        createTask({ id: 3, duration: 2, dependsOn: 1 }),
        createTask({ id: 4, duration: 2, dependsOn: 2 }), // Depends on 2
      ];

      const calculator = new CriticalPathCalculator(tasks, 1);
      const result = calculator.calculate();

      expect(result.find(t => t.id === 4)?.es).toBeGreaterThanOrEqual(5); // Max EF of predecessors
    });
  });

  describe('toInsertData Conversion', () => {
    it('should convert results to database format', () => {
      const tasks: Task[] = [
        createTask({ id: 1, duration: 5, dependsOn: null }),
      ];

      const calculator = new CriticalPathCalculator(tasks, 1);
      const insertData = calculator.toInsertData();

      expect(insertData).toHaveLength(1);
      expect(insertData[0]).toMatchObject({
        projectId: 1,
        taskId: 1,
        slack: 0,
      });
      expect(insertData[0].earliestStart).toBeInstanceOf(Date);
      expect(insertData[0].earliestFinish).toBeInstanceOf(Date);
      expect(insertData[0].latestStart).toBeInstanceOf(Date);
      expect(insertData[0].latestFinish).toBeInstanceOf(Date);
    });

    it('should calculate dates based on project start', () => {
      const projectStart = new Date('2024-03-15');
      const tasks: Task[] = [
        {
          ...createTask({ id: 1, duration: 5, dependsOn: null }),
          startDate: projectStart,
          endDate: new Date(projectStart.getTime() + 5 * 24 * 60 * 60 * 1000),
        },
      ];

      const calculator = new CriticalPathCalculator(tasks, 1);
      const insertData = calculator.toInsertData();

      // ES=0, so earliestStart should equal project start
      expect(insertData[0].earliestStart.getTime()).toBe(projectStart.getTime());
      // EF=5, so earliestFinish should be 5 days after project start
      expect(insertData[0].earliestFinish.getTime()).toBe(
        projectStart.getTime() + 5 * 24 * 60 * 60 * 1000
      );
    });
  });
});
