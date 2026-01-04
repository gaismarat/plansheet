import { pgTable, text, serial, integer, real, timestamp, varchar, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === USER & PERMISSIONS TABLES ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdById: integer("created_by_id"), // null for first admin
  createdAt: timestamp("created_at").defaultNow(),
});

export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  permissionType: text("permission_type").notNull(), // "page_access" | "edit_data" | "view_field"
  resource: text("resource").notNull(), // page name or field name
  allowed: boolean("allowed").default(true).notNull(),
});

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
  manualValue: numeric("manual_value", { precision: 18, scale: 2 }).default("0"), // Ручное значение в рублях
  pdcValue: numeric("pdc_value", { precision: 18, scale: 2 }).default("0"), // Значение из ПДЦ в рублях
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

// === USER & PERMISSIONS RELATIONS ===

export const usersRelations = relations(users, ({ many, one }) => ({
  permissions: many(permissions),
  createdBy: one(users, {
    fields: [users.createdById],
    references: [users.id],
  }),
}));

export const permissionsRelations = relations(permissions, ({ one }) => ({
  user: one(users, {
    fields: [permissions.userId],
    references: [users.id],
  }),
}));

// === USER & PERMISSIONS SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, passwordHash: true }).extend({
  password: z.string().min(4),
});
export const insertPermissionSchema = createInsertSchema(permissions).omit({ id: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;

// User without password hash for client
export type SafeUser = Omit<User, "passwordHash">;
export type UserWithPermissions = SafeUser & { permissions: Permission[] };

// === PDC (Protocol of Cost Agreement) TABLES ===

export const pdcDocuments = pgTable("pdc_documents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  headerText: text("header_text"),
  vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).default("20"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pdcBlocks = pgTable("pdc_blocks", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => pdcDocuments.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  order: integer("order").default(0).notNull(),
});

export const pdcSections = pgTable("pdc_sections", {
  id: serial("id").primaryKey(),
  blockId: integer("block_id").notNull().references(() => pdcBlocks.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  order: integer("order").default(0).notNull(),
});

export const pdcGroups = pgTable("pdc_groups", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id").notNull().references(() => pdcSections.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  unit: text("unit").default("шт."),
  quantity: numeric("quantity", { precision: 18, scale: 4 }).default("0"),
  smrPnrPrice: numeric("smr_pnr_price", { precision: 18, scale: 2 }).default("0"),
  order: integer("order").default(0).notNull(),
});

export const pdcElements = pgTable("pdc_elements", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => pdcGroups.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  note: text("note"),
  unit: text("unit").default("шт."),
  consumptionCoef: numeric("consumption_coef", { precision: 10, scale: 4 }).default("1"),
  quantity: numeric("quantity", { precision: 18, scale: 4 }).default("0"),
  materialPrice: numeric("material_price", { precision: 18, scale: 2 }).default("0"),
  order: integer("order").default(0).notNull(),
});

// === PDC RELATIONS ===

export const pdcDocumentsRelations = relations(pdcDocuments, ({ many }) => ({
  blocks: many(pdcBlocks),
}));

export const pdcBlocksRelations = relations(pdcBlocks, ({ one, many }) => ({
  document: one(pdcDocuments, {
    fields: [pdcBlocks.documentId],
    references: [pdcDocuments.id],
  }),
  sections: many(pdcSections),
}));

export const pdcSectionsRelations = relations(pdcSections, ({ one, many }) => ({
  block: one(pdcBlocks, {
    fields: [pdcSections.blockId],
    references: [pdcBlocks.id],
  }),
  groups: many(pdcGroups),
}));

export const pdcGroupsRelations = relations(pdcGroups, ({ one, many }) => ({
  section: one(pdcSections, {
    fields: [pdcGroups.sectionId],
    references: [pdcSections.id],
  }),
  elements: many(pdcElements),
}));

export const pdcElementsRelations = relations(pdcElements, ({ one }) => ({
  group: one(pdcGroups, {
    fields: [pdcElements.groupId],
    references: [pdcGroups.id],
  }),
}));

// === PDC SCHEMAS ===

export const insertPdcDocumentSchema = createInsertSchema(pdcDocuments).omit({ id: true, createdAt: true });
export const insertPdcBlockSchema = createInsertSchema(pdcBlocks).omit({ id: true });
export const insertPdcSectionSchema = createInsertSchema(pdcSections).omit({ id: true });
export const insertPdcGroupSchema = createInsertSchema(pdcGroups).omit({ id: true });
export const insertPdcElementSchema = createInsertSchema(pdcElements).omit({ id: true });

// === PDC TYPES ===

export type PdcDocument = typeof pdcDocuments.$inferSelect;
export type InsertPdcDocument = z.infer<typeof insertPdcDocumentSchema>;

export type PdcBlock = typeof pdcBlocks.$inferSelect;
export type InsertPdcBlock = z.infer<typeof insertPdcBlockSchema>;

export type PdcSection = typeof pdcSections.$inferSelect;
export type InsertPdcSection = z.infer<typeof insertPdcSectionSchema>;

export type PdcGroup = typeof pdcGroups.$inferSelect;
export type InsertPdcGroup = z.infer<typeof insertPdcGroupSchema>;

export type PdcElement = typeof pdcElements.$inferSelect;
export type InsertPdcElement = z.infer<typeof insertPdcElementSchema>;

// PDC nested types for API responses
export type PdcElementWithData = PdcElement;
export type PdcGroupWithElements = PdcGroup & { elements?: PdcElementWithData[] };
export type PdcSectionWithGroups = PdcSection & { groups?: PdcGroupWithElements[] };
export type PdcBlockWithSections = PdcBlock & { sections?: PdcSectionWithGroups[] };
export type PdcDocumentWithData = PdcDocument & { blocks?: PdcBlockWithSections[] };
