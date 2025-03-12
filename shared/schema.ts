import { pgTable, text, serial, integer, decimal, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from 'drizzle-orm';

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
  projectId: integer("project_id").notNull().references(() => projects.id),
  name: text("name").notNull(),
  description: text("description"),
  duration: integer("duration").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  dependsOn: integer("depends_on"),
  completed: boolean("completed").notNull().default(false)
});

// Define relations including self-referential
export const tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  dependentTask: one(tasks, {
    fields: [tasks.dependsOn],
    references: [tasks.id],
  }),
}));

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
  taskId: integer("task_id").notNull().references(() => tasks.id),
  resourceId: integer("resource_id").notNull().references(() => resources.id),
  hours: integer("hours").notNull()
});

// Critical path table
export const criticalPaths = pgTable("critical_paths", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  taskId: integer("task_id").notNull().references(() => tasks.id),
  earliestStart: timestamp("earliest_start").notNull(),
  earliestFinish: timestamp("earliest_finish").notNull(),
  latestStart: timestamp("latest_start").notNull(),
  latestFinish: timestamp("latest_finish").notNull(),
  slack: integer("slack").notNull()
});

// Create insert schemas with proper validation
export const insertProjectSchema = createInsertSchema(projects, {
  name: z.string().min(1, "Project name is required"),
  description: z.string().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  budget: z.string().transform(val => parseFloat(val)),
  status: z.string().default('active')
});

export const insertTaskSchema = createInsertSchema(tasks, {
  projectId: z.coerce.number(),
  name: z.string().min(1, "Task name is required"),
  description: z.string().nullable(),
  duration: z.coerce.number().min(1, "Duration must be at least 1 day"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  dependsOn: z.coerce.number().nullable(),
  completed: z.boolean().default(false)
});

export const insertResourceSchema = createInsertSchema(resources, {
  name: z.string().min(1, "Resource name is required"),
  role: z.string().min(1, "Role is required"),
  costPerHour: z.string().transform(val => parseFloat(val))
});

export const insertResourceAssignmentSchema = createInsertSchema(resourceAssignments, {
  taskId: z.coerce.number(),
  resourceId: z.coerce.number(),
  hours: z.coerce.number().min(0, "Hours must be non-negative")
});

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