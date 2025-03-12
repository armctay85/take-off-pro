import { pgTable, text, serial, integer, decimal, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Project table
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  budget: decimal("budget", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default('active')
});

// Tasks table
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  duration: integer("duration").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  dependsOn: integer("depends_on").references(() => tasks.id),
  completed: boolean("completed").notNull().default(false)
});

// Resources table
export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  costPerHour: decimal("cost_per_hour", { precision: 10, scale: 2 }).notNull()
});

// Resource assignments table
export const resourceAssignments = pgTable("resource_assignments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id).notNull(),
  resourceId: integer("resource_id").references(() => resources.id).notNull(),
  hours: integer("hours").notNull()
});

// Critical path table
export const criticalPaths = pgTable("critical_paths", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  taskId: integer("task_id").references(() => tasks.id).notNull(),
  earliestStart: timestamp("earliest_start").notNull(),
  earliestFinish: timestamp("earliest_finish").notNull(),
  latestStart: timestamp("latest_start").notNull(),
  latestFinish: timestamp("latest_finish").notNull(),
  slack: integer("slack").notNull()
});

// Create insert schemas
export const insertProjectSchema = createInsertSchema(projects);
export const insertTaskSchema = createInsertSchema(tasks);
export const insertResourceSchema = createInsertSchema(resources);
export const insertResourceAssignmentSchema = createInsertSchema(resourceAssignments);
export const insertCriticalPathSchema = createInsertSchema(criticalPaths);

// Export types
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type Resource = typeof resources.$inferSelect;
export type InsertResource = z.infer<typeof insertResourceSchema>;

export type ResourceAssignment = typeof resourceAssignments.$inferSelect;
export type InsertResourceAssignment = z.infer<typeof insertResourceAssignmentSchema>;

export type CriticalPath = typeof criticalPaths.$inferSelect;
export type InsertCriticalPath = z.infer<typeof insertCriticalPathSchema>;
