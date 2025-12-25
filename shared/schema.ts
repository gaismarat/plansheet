import { pgTable, text, serial, integer, real, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === TABLE DEFINITIONS ===

export const blocks = pgTable("blocks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // Название блока
  order: integer("order").default(0).notNull(), // Порядок блока
  createdAt: timestamp("created_at").defaultNow(),
});

export const workGroups = pgTable("work_groups", {
  id: serial("id").primaryKey(),
  blockId: integer("block_id").references(() => blocks.id), // Ссылка на блок (опционально)
  name: text("name").notNull(), // Название группы работ (e.g., "Earthworks", "Foundation")
  order: integer("order").default(0).notNull(), // Порядок группы
  createdAt: timestamp("created_at").defaultNow(),
});

export const works = pgTable("works", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => workGroups.id),
  name: text("name").notNull(), // Название работы
  daysEstimated: integer("days_estimated").notNull(), // Количество дней (план)
  volumeAmount: real("volume_amount").notNull(), // Объём работ (план)
  volumeUnit: text("volume_unit").notNull(), // Единица измерения (шт, м3, м2, п.м, компл)
  daysActual: integer("days_actual").default(0).notNull(), // Фактические дни
  volumeActual: real("volume_actual").default(0).notNull(), // Фактический объём
  costPlan: real("cost_plan").default(0).notNull(), // Плановая стоимость (руб.)
  costActual: real("cost_actual").default(0).notNull(), // Фактическая стоимость (руб.)
  planStartDate: varchar("plan_start_date"), // Плановая дата начала
  actualStartDate: varchar("actual_start_date"), // Фактическая дата начала
  planEndDate: varchar("plan_end_date"), // Плановая дата окончания
  actualEndDate: varchar("actual_end_date"), // Фактическая дата окончания
  progressPercentage: integer("progress_percentage").default(0).notNull(), // Шкала выполнения 0-100%
  responsiblePerson: text("responsible_person").notNull(), // Ответственный
  order: integer("order").default(0).notNull(), // Порядок в группе
  createdAt: timestamp("created_at").defaultNow(),
});

export const holidays = pgTable("holidays", {
  id: serial("id").primaryKey(),
  date: varchar("date").notNull().unique(), // Дата праздника в формате YYYY-MM-DD (уникальная)
  name: text("name"), // Название праздника (опционально)
});

// === RELATIONS ===

export const blocksRelations = relations(blocks, ({ many }) => ({
  groups: many(workGroups),
}));

export const workGroupsRelations = relations(workGroups, ({ one, many }) => ({
  block: one(blocks, {
    fields: [workGroups.blockId],
    references: [blocks.id],
  }),
  works: many(works),
}));

export const worksRelations = relations(works, ({ one }) => ({
  group: one(workGroups, {
    fields: [works.groupId],
    references: [workGroups.id],
  }),
}));

// === BASE SCHEMAS ===

export const insertBlockSchema = createInsertSchema(blocks).omit({ id: true, createdAt: true });
export const insertWorkGroupSchema = createInsertSchema(workGroups).omit({ id: true, createdAt: true });
export const insertWorkSchema = createInsertSchema(works).omit({ id: true, createdAt: true }).extend({
  progressPercentage: z.coerce.number().min(0).max(100).default(0),
  daysEstimated: z.coerce.number().min(0),
  volumeAmount: z.coerce.number().min(0),
  daysActual: z.coerce.number().min(0).default(0),
  volumeActual: z.coerce.number().min(0).default(0),
  costPlan: z.coerce.number().min(0).default(0),
  costActual: z.coerce.number().min(0).default(0),
  planStartDate: z.string().optional(),
  actualStartDate: z.string().optional(),
  planEndDate: z.string().optional(),
  actualEndDate: z.string().optional(),
});

// === EXPLICIT API CONTRACT TYPES ===

export type Block = typeof blocks.$inferSelect;
export type InsertBlock = z.infer<typeof insertBlockSchema>;

export type WorkGroup = typeof workGroups.$inferSelect;
export type InsertWorkGroup = z.infer<typeof insertWorkGroupSchema>;

export type Work = typeof works.$inferSelect;
export type InsertWork = z.infer<typeof insertWorkSchema>;

// Request types
export type CreateBlockRequest = InsertBlock;
export type UpdateBlockRequest = Partial<InsertBlock>;
export type CreateWorkGroupRequest = InsertWorkGroup;
export type UpdateWorkGroupRequest = Partial<InsertWorkGroup>;
export type CreateWorkRequest = InsertWork;
export type UpdateWorkRequest = Partial<InsertWork>;

// Response types
export type WorkResponse = Work;
export type WorkGroupResponse = WorkGroup & { works?: WorkResponse[] };
export type BlockResponse = Block & { groups?: WorkGroupResponse[] };

// === HOLIDAYS ===
export const insertHolidaySchema = createInsertSchema(holidays).omit({ id: true });
export type Holiday = typeof holidays.$inferSelect;
export type InsertHoliday = z.infer<typeof insertHolidaySchema>;
