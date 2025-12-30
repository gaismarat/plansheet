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

// === BUDGET TABLES ===

export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // Название бюджета
  headerText: text("header_text"), // Текст в шапке справа
  createdAt: timestamp("created_at").defaultNow(),
});

export const budgetColumns = pgTable("budget_columns", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull().references(() => contracts.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // Название столбца (Этап 1, Этап 2...)
  order: integer("order").default(0).notNull(), // Порядок столбца
  isTotal: integer("is_total").default(0).notNull(), // 1 = суммирующий столбец "ВСЕГО"
});

export const budgetRows = pgTable("budget_rows", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull().references(() => contracts.id, { onDelete: "cascade" }),
  parentId: integer("parent_id"), // Ссылка на родительскую строку (для иерархии)
  name: text("name").notNull(), // Название строки
  level: text("level").notNull(), // "chapter" | "section" | "group" | "item"
  chapterType: text("chapter_type"), // "income" | "expense" (только для chapter)
  rowType: text("row_type").default("manual").notNull(), // "manual" | "linked"
  pdcItemId: integer("pdc_item_id"), // Связь с ПДЦ (для linked строк)
  order: integer("order").default(0).notNull(), // Порядок строки
});

export const budgetValues = pgTable("budget_values", {
  id: serial("id").primaryKey(),
  rowId: integer("row_id").notNull().references(() => budgetRows.id, { onDelete: "cascade" }),
  columnId: integer("column_id").notNull().references(() => budgetColumns.id, { onDelete: "cascade" }),
  manualValue: real("manual_value").default(0), // Ручное значение
  pdcValue: real("pdc_value").default(0), // Значение из ПДЦ (mock для сейчас)
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

// === BUDGET RELATIONS ===

export const contractsRelations = relations(contracts, ({ many }) => ({
  columns: many(budgetColumns),
  rows: many(budgetRows),
}));

export const budgetColumnsRelations = relations(budgetColumns, ({ one, many }) => ({
  contract: one(contracts, {
    fields: [budgetColumns.contractId],
    references: [contracts.id],
  }),
  values: many(budgetValues),
}));

export const budgetRowsRelations = relations(budgetRows, ({ one, many }) => ({
  contract: one(contracts, {
    fields: [budgetRows.contractId],
    references: [contracts.id],
  }),
  parent: one(budgetRows, {
    fields: [budgetRows.parentId],
    references: [budgetRows.id],
  }),
  values: many(budgetValues),
}));

export const budgetValuesRelations = relations(budgetValues, ({ one }) => ({
  row: one(budgetRows, {
    fields: [budgetValues.rowId],
    references: [budgetRows.id],
  }),
  column: one(budgetColumns, {
    fields: [budgetValues.columnId],
    references: [budgetColumns.id],
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

// === BUDGET SCHEMAS ===
export const insertContractSchema = createInsertSchema(contracts).omit({ id: true, createdAt: true });
export const insertBudgetColumnSchema = createInsertSchema(budgetColumns).omit({ id: true });
export const insertBudgetRowSchema = createInsertSchema(budgetRows).omit({ id: true }).extend({
  level: z.enum(["chapter", "section", "group", "item"]),
  chapterType: z.enum(["income", "expense"]).optional(),
  rowType: z.enum(["manual", "linked"]).default("manual"),
});
export const insertBudgetValueSchema = createInsertSchema(budgetValues).omit({ id: true });

// === BUDGET TYPES ===
export type Contract = typeof contracts.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;

export type BudgetColumn = typeof budgetColumns.$inferSelect;
export type InsertBudgetColumn = z.infer<typeof insertBudgetColumnSchema>;

export type BudgetRow = typeof budgetRows.$inferSelect;
export type InsertBudgetRow = z.infer<typeof insertBudgetRowSchema>;

export type BudgetValue = typeof budgetValues.$inferSelect;
export type InsertBudgetValue = z.infer<typeof insertBudgetValueSchema>;

// Budget response types with nested data
export type BudgetValueWithColumn = BudgetValue & { column?: BudgetColumn };
export type BudgetRowWithChildren = BudgetRow & { 
  children?: BudgetRowWithChildren[];
  values?: BudgetValue[];
};
export type ContractWithData = Contract & {
  columns?: BudgetColumn[];
  rows?: BudgetRowWithChildren[];
};
