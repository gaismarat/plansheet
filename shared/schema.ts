import { pgTable, text, serial, integer, real, timestamp, varchar, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === PROJECTS TABLE ===

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at"), // Soft delete, удаляется через 30 дней
});

// === PROJECT PERMISSIONS TABLE ===
// Детальные права доступа пользователя к проекту

export const projectPermissions = pgTable("project_permissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  projectId: integer("project_id").notNull(),
  
  // Роли
  isOwner: boolean("is_owner").default(false).notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  ownerExpiresAt: timestamp("owner_expires_at"), // Для 15-дневного переходного периода
  
  // Права по страницам: view = просмотр, edit = редактирование
  // Работы
  worksView: boolean("works_view").default(true).notNull(),
  worksEdit: boolean("works_edit").default(false).notNull(),
  worksEditProgress: boolean("works_edit_progress").default(true).notNull(), // Редактировать прогресс и отправлять на согласование
  worksSeeAmounts: boolean("works_see_amounts").default(false).notNull(), // Видеть суммы
  
  // ПДС
  pdcView: boolean("pdc_view").default(false).notNull(),
  pdcEdit: boolean("pdc_edit").default(false).notNull(),
  
  // Бюджет
  budgetView: boolean("budget_view").default(false).notNull(),
  budgetEdit: boolean("budget_edit").default(false).notNull(),
  
  // КСП (Гантт)
  kspView: boolean("ksp_view").default(true).notNull(),
  kspEdit: boolean("ksp_edit").default(false).notNull(),
  
  // Люди
  peopleView: boolean("people_view").default(true).notNull(),
  peopleEdit: boolean("people_edit").default(false).notNull(),
  
  // Аналитика
  analyticsView: boolean("analytics_view").default(false).notNull(),
  
  // Календарь праздников
  calendarView: boolean("calendar_view").default(true).notNull(),
  calendarEdit: boolean("calendar_edit").default(false).notNull(),
  
  // Коды классификатора
  codesView: boolean("codes_view").default(false).notNull(),
  codesEdit: boolean("codes_edit").default(false).notNull(),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// === NOTIFICATIONS TABLE ===

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  projectId: integer("project_id"),
  type: text("type").notNull(), // "added_to_project" | "removed_from_project" | "permissions_changed" | "made_admin" | "made_owner"
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

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
  groupId: integer("group_id").references(() => workGroups.id), // Legacy, теперь используем pdcGroupId
  pdcGroupId: integer("pdc_group_id"), // Связь с PDC группой (FK добавляется в relations)
  name: text("name").notNull(), // Название работы (из PDC или ручное)
  daysEstimated: integer("days_estimated").default(0).notNull(), // Количество дней (план) - ручное
  volumeAmount: real("volume_amount").default(0).notNull(), // Объём работ (план) - из PDC
  volumeUnit: text("volume_unit").default("шт.").notNull(), // Единица измерения - из PDC
  daysActual: integer("days_actual").default(0).notNull(), // Фактические дни - ручное
  volumeActual: real("volume_actual").default(0).notNull(), // Фактический объём - ручное
  costPlan: real("cost_plan").default(0).notNull(), // Плановая стоимость (руб.) - из PDC
  costActual: real("cost_actual").default(0).notNull(), // Фактическая стоимость (руб.) - ручное
  planStartDate: varchar("plan_start_date"), // Плановая дата начала - ручное
  actualStartDate: varchar("actual_start_date"), // Фактическая дата начала - ручное
  planEndDate: varchar("plan_end_date"), // Плановая дата окончания - ручное
  actualEndDate: varchar("actual_end_date"), // Фактическая дата окончания - ручное
  progressPercentage: integer("progress_percentage").default(0).notNull(), // Шкала выполнения 0-100% - ручное
  plannedPeople: integer("planned_people").default(0).notNull(), // Плановое количество людей - ручное
  responsiblePerson: text("responsible_person").default("").notNull(), // Ответственный - ручное
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
  pdcGroup: one(pdcGroups, {
    fields: [works.pdcGroupId],
    references: [pdcGroups.id],
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
  daysEstimated: z.coerce.number().min(0).default(0),
  volumeAmount: z.coerce.number().min(0).default(0),
  daysActual: z.coerce.number().min(0).default(0),
  volumeActual: z.coerce.number().min(0).default(0),
  costPlan: z.coerce.number().min(0).default(0),
  costActual: z.coerce.number().min(0).default(0),
  plannedPeople: z.coerce.number().min(0).max(9999).default(0),
  planStartDate: z.string().optional(),
  actualStartDate: z.string().optional(),
  planEndDate: z.string().optional(),
  actualEndDate: z.string().optional(),
  pdcGroupId: z.number().optional(),
  groupId: z.number().optional(),
  responsiblePerson: z.string().default(""),
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

// === STAGES (Этапы проекта) TABLE ===

export const stages = pgTable("stages", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// === PDC (Protocol of Cost Agreement) TABLES ===

export const pdcDocuments = pgTable("pdc_documents", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  stageId: integer("stage_id").references(() => stages.id, { onDelete: "set null" }), // Этап проекта
  name: text("name").notNull(),
  headerText: text("header_text"),
  vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).default("20"),
  order: integer("order").notNull().default(0),
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
  classifierCodeId: integer("classifier_code_id").references(() => classifierCodes.id, { onDelete: "set null" }), // Код классификатора
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

// === STAGES RELATIONS ===

export const stagesRelations = relations(stages, ({ one, many }) => ({
  project: one(projects, {
    fields: [stages.projectId],
    references: [projects.id],
  }),
  pdcDocuments: many(pdcDocuments),
}));

// === PDC RELATIONS ===

export const pdcDocumentsRelations = relations(pdcDocuments, ({ one, many }) => ({
  blocks: many(pdcBlocks),
  stage: one(stages, {
    fields: [pdcDocuments.stageId],
    references: [stages.id],
  }),
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
  classifierCode: one(classifierCodes, {
    fields: [pdcGroups.classifierCodeId],
    references: [classifierCodes.id],
  }),
}));

export const pdcElementsRelations = relations(pdcElements, ({ one }) => ({
  group: one(pdcGroups, {
    fields: [pdcElements.groupId],
    references: [pdcGroups.id],
  }),
}));

// === STAGES SCHEMAS ===

export const insertStageSchema = createInsertSchema(stages).omit({ id: true, createdAt: true });
export type Stage = typeof stages.$inferSelect;
export type InsertStage = z.infer<typeof insertStageSchema>;

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

// === CLASSIFIER CODES TABLE ===
// Глобальный классификатор кодов (иерархия: Статья > Зона > Элемент > Деталь)

export const classifierCodes = pgTable("classifier_codes", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // "article" | "zone" | "element" | "detail"
  name: text("name").notNull(),
  cipher: text("cipher").notNull(), // Шифр (короткий код)
  parentId: integer("parent_id"), // Ссылка на родителя
  orderIndex: integer("order_index").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// === CLASSIFIER CODES RELATIONS ===

export const classifierCodesRelations = relations(classifierCodes, ({ one, many }) => ({
  parent: one(classifierCodes, {
    fields: [classifierCodes.parentId],
    references: [classifierCodes.id],
  }),
  children: many(classifierCodes),
}));

// === CLASSIFIER CODES SCHEMAS ===

export const insertClassifierCodeSchema = createInsertSchema(classifierCodes).omit({ id: true, createdAt: true }).extend({
  type: z.enum(["article", "zone", "element", "detail"]),
});

export type ClassifierCode = typeof classifierCodes.$inferSelect;
export type InsertClassifierCode = z.infer<typeof insertClassifierCodeSchema>;

// Nested type for tree structure
export type ClassifierCodeWithChildren = ClassifierCode & {
  children?: ClassifierCodeWithChildren[];
  fullCode?: string; // Computed from parent ciphers
};

// === PROGRESS SUBMISSIONS (Согласование прогресса) TABLE ===

export const progressSubmissions = pgTable("progress_submissions", {
  id: serial("id").primaryKey(),
  workId: integer("work_id").notNull().references(() => works.id, { onDelete: "cascade" }),
  percent: integer("percent").notNull(), // Процент прогресса 0-100
  submitterId: integer("submitter_id").notNull().references(() => users.id), // Кто отправил
  approverId: integer("approver_id").references(() => users.id), // Кто согласовал/отклонил
  status: text("status").notNull().default("submitted"), // submitted | approved | rejected
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"), // Когда согласовали/отклонили
});

// === WORK PEOPLE (Люди) TABLE ===

export const workPeople = pgTable("work_people", {
  id: serial("id").primaryKey(),
  workId: integer("work_id").notNull().references(() => works.id, { onDelete: "cascade" }),
  date: varchar("date").notNull(), // Format: YYYY-MM-DD
  count: integer("count").default(0).notNull(), // Number of people
});

// === PROGRESS SUBMISSIONS RELATIONS ===

export const progressSubmissionsRelations = relations(progressSubmissions, ({ one }) => ({
  work: one(works, {
    fields: [progressSubmissions.workId],
    references: [works.id],
  }),
  submitter: one(users, {
    fields: [progressSubmissions.submitterId],
    references: [users.id],
  }),
  approver: one(users, {
    fields: [progressSubmissions.approverId],
    references: [users.id],
  }),
}));

// === PROGRESS SUBMISSIONS SCHEMAS ===

export const insertProgressSubmissionSchema = createInsertSchema(progressSubmissions).omit({ id: true, createdAt: true, resolvedAt: true }).extend({
  percent: z.coerce.number().min(0).max(100),
  status: z.enum(["submitted", "approved", "rejected"]).default("submitted"),
});

export type ProgressSubmission = typeof progressSubmissions.$inferSelect;
export type InsertProgressSubmission = z.infer<typeof insertProgressSubmissionSchema>;

// Progress submission with user info for display
export type ProgressSubmissionWithUsers = ProgressSubmission & {
  submitterName?: string;
  approverName?: string;
};

// === WORK PEOPLE RELATIONS ===

export const workPeopleRelations = relations(workPeople, ({ one }) => ({
  work: one(works, {
    fields: [workPeople.workId],
    references: [works.id],
  }),
}));

// === WORK PEOPLE SCHEMAS ===

export const insertWorkPeopleSchema = createInsertSchema(workPeople).omit({ id: true });

export type WorkPeople = typeof workPeople.$inferSelect;
export type InsertWorkPeople = z.infer<typeof insertWorkPeopleSchema>;

// === WORKS TREE TYPES (PDC-based hierarchy) ===

// Work with materials from PDC elements
export type WorkMaterial = {
  id: number;
  pdcElementId: number;
  number: string;
  name: string;
  unit: string;
  quantity: number;
  costWithVat: number;
};

// Work item with manual fields + PDC data
export type WorkTreeItem = Work & {
  pdcName: string;
  pdcUnit: string;
  pdcQuantity: number;
  pdcCostWithVat: number;
  materials?: WorkMaterial[];
};

// WorkGroup with works inside (level 4)
export type WorkTreeGroup = {
  id: number;
  pdcGroupId: number;
  number: string;
  name: string;
  unit: string;
  quantity: number;
  costWithVat: number;
  progressPercentage: number;
  works: WorkTreeItem[];
};

// WorkSection (from PDC Section) - level 3
export type WorkTreeSection = {
  id: number;
  pdcSectionId: number;
  number: string;
  name: string;
  description: string | null;
  progressPercentage: number;
  costWithVat: number;
  groups: WorkTreeGroup[];
};

// WorkBlock (from PDC Block) - level 2
export type WorkTreeBlock = {
  id: number;
  pdcBlockId: number;
  number: string;
  name: string;
  progressPercentage: number;
  costWithVat: number;
  sections: WorkTreeSection[];
};

// WorkDocument (from PDC Document) - level 1
export type WorkTreeDocument = {
  id: number;
  pdcDocumentId: number;
  name: string;
  headerText: string | null;
  vatRate: number;
  progressPercentage: number;
  costWithVat: number;
  blocks: WorkTreeBlock[];
};

// Full works tree response
export type WorksTreeResponse = WorkTreeDocument[];

// === PROJECTS RELATIONS ===

export const projectsRelations = relations(projects, ({ many }) => ({
  permissions: many(projectPermissions),
  pdcDocuments: many(pdcDocuments),
  notifications: many(notifications),
}));

export const projectPermissionsRelations = relations(projectPermissions, ({ one }) => ({
  user: one(users, {
    fields: [projectPermissions.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [projectPermissions.projectId],
    references: [projects.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [notifications.projectId],
    references: [projects.id],
  }),
}));

// === PROJECTS SCHEMAS ===

export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, deletedAt: true });
export const insertProjectPermissionSchema = createInsertSchema(projectPermissions).omit({ id: true, createdAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type ProjectPermission = typeof projectPermissions.$inferSelect;
export type InsertProjectPermission = z.infer<typeof insertProjectPermissionSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Project with permissions for user
export type ProjectWithPermission = Project & {
  permission?: ProjectPermission;
};

// Full project permission details for user management
export type UserProjectPermission = {
  userId: number;
  username: string;
  permission: ProjectPermission;
};
