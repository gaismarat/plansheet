import { pgTable, text, serial, integer, real, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === TABLE DEFINITIONS ===

export const workGroups = pgTable("work_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // Название группы работ (e.g., "Earthworks", "Foundation")
  createdAt: timestamp("created_at").defaultNow(),
});

export const works = pgTable("works", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => workGroups.id),
  name: text("name").notNull(), // Название работы
  daysEstimated: integer("days_estimated").notNull(), // Количество дней
  volumeAmount: real("volume_amount").notNull(), // Объём работ
  volumeUnit: text("volume_unit").notNull(), // Единица измерения (шт, м3, м2, п.м, компл)
  progressPercentage: integer("progress_percentage").default(0).notNull(), // Шкала выполнения 0-100%
  responsiblePerson: text("responsible_person").notNull(), // Ответственный
  order: integer("order").default(0).notNull(), // Порядок в группе
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===

export const workGroupsRelations = relations(workGroups, ({ many }) => ({
  works: many(works),
}));

export const worksRelations = relations(works, ({ one }) => ({
  group: one(workGroups, {
    fields: [works.groupId],
    references: [workGroups.id],
  }),
}));

// === BASE SCHEMAS ===

export const insertWorkGroupSchema = createInsertSchema(workGroups).omit({ id: true, createdAt: true });
export const insertWorkSchema = createInsertSchema(works).omit({ id: true, createdAt: true }).extend({
  progressPercentage: z.coerce.number().min(0).max(100).default(0),
  daysEstimated: z.coerce.number().min(0),
  volumeAmount: z.coerce.number().min(0),
});

// === EXPLICIT API CONTRACT TYPES ===

export type WorkGroup = typeof workGroups.$inferSelect;
export type InsertWorkGroup = z.infer<typeof insertWorkGroupSchema>;

export type Work = typeof works.$inferSelect;
export type InsertWork = z.infer<typeof insertWorkSchema>;

// Request types
export type CreateWorkGroupRequest = InsertWorkGroup;
export type CreateWorkRequest = InsertWork;
export type UpdateWorkRequest = Partial<InsertWork>;

// Response types
export type WorkResponse = Work;
export type WorkGroupResponse = WorkGroup & { works?: WorkResponse[] }; // Optional nested works for list view
