import { pgTable, text, serial, integer, decimal, timestamp, boolean, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations, sql } from 'drizzle-orm';

// Session storage table (Required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (Required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  passwordHash: varchar("password_hash"),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

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

// Define relations
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

// Insert schemas with proper validation and type coercion
export const insertProjectSchema = createInsertSchema(projects, {
  name: z.string().min(1, "Project name is required"),
  description: z.string().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  budget: z.coerce.number().min(0, "Budget must be non-negative"),
  status: z.enum(['active', 'completed', 'on-hold']).default('active')
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
  costPerHour: z.coerce.number().min(0, "Cost per hour must be non-negative")
});

export const insertResourceAssignmentSchema = createInsertSchema(resourceAssignments, {
  taskId: z.coerce.number(),
  resourceId: z.coerce.number(),
  hours: z.coerce.number().min(0, "Hours must be non-negative")
});

export const insertCriticalPathSchema = createInsertSchema(criticalPaths, {
  projectId: z.coerce.number(),
  taskId: z.coerce.number(),
  earliestStart: z.coerce.date(),
  earliestFinish: z.coerce.date(),
  latestStart: z.coerce.date(),
  latestFinish: z.coerce.date(),
  slack: z.coerce.number()
});

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