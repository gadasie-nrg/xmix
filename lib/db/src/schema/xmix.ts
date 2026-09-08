import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const schoolsTable = pgTable("xmix_schools", {
  id: text("id").primaryKey(),
  joinCode: text("join_code").notNull().unique(),
  name: text("name").notNull(),
  adminName: text("admin_name").notNull(),
  adminEmail: text("admin_email").notNull(),
  licenseSeats: integer("license_seats").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const teachersTable = pgTable("xmix_teachers", {
  id: text("id").primaryKey(),
  schoolId: text("school_id").notNull().references(() => schoolsTable.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull().default(""),
  deviceId: text("device_id").notNull(),
  status: text("status").notNull().default("active"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activitiesTable = pgTable("xmix_activities", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSchoolSchema = createInsertSchema(schoolsTable).omit({ createdAt: true });
export const insertTeacherSchema = createInsertSchema(teachersTable).omit({ joinedAt: true, lastActiveAt: true });
export const insertActivitySchema = createInsertSchema(activitiesTable).omit({ createdAt: true });

export type InsertSchool = typeof schoolsTable.$inferInsert;
export type School = typeof schoolsTable.$inferSelect;
export type InsertTeacher = typeof teachersTable.$inferInsert;
export type Teacher = typeof teachersTable.$inferSelect;
export type InsertActivity = typeof activitiesTable.$inferInsert;
export type Activity = typeof activitiesTable.$inferSelect;