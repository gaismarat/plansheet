import { db } from "./db";
import {
  blocks,
  works,
  workGroups,
  holidays,
  contracts,
  budgetColumns,
  budgetRows,
  budgetValues,
  users,
  permissions,
  pdcDocuments,
  pdcBlocks,
  pdcSections,
  pdcGroups,
  pdcElements,
  workPeople,
  progressSubmissions,
  projects,
  projectPermissions,
  notifications,
  classifierCodes,
  stages,
  executors,
  budgetRowCodes,
  priceChanges,
  sectionAllocations,
  workSectionProgress,
  workMaterialProgress,
  workMaterialProgressHistory,
  type Block,
  type Work,
  type WorkGroup,
  type Holiday,
  type Contract,
  type BudgetColumn,
  type BudgetRow,
  type BudgetValue,
  type ContractWithData,
  type BudgetRowWithChildren,
  type InsertBlock,
  type InsertWork,
  type InsertWorkGroup,
  type InsertHoliday,
  type InsertContract,
  type InsertBudgetColumn,
  type InsertBudgetRow,
  type InsertBudgetValue,
  type UpdateBlockRequest,
  type UpdateWorkGroupRequest,
  type UpdateWorkRequest,
  type BlockResponse,
  type WorkGroupResponse,
  type User,
  type Permission,
  type SafeUser,
  type UserWithPermissions,
  type InsertPermission,
  type PdcDocument,
  type PdcBlock,
  type PdcSection,
  type PdcGroup,
  type PdcElement,
  type InsertPdcDocument,
  type InsertPdcBlock,
  type InsertPdcSection,
  type InsertPdcGroup,
  type InsertPdcElement,
  type PdcDocumentWithData,
  type PdcBlockWithSections,
  type PdcSectionWithGroups,
  type PdcGroupWithElements,
  type WorkPeople,
  type ProgressSubmission,
  type ProgressSubmissionWithUsers,
  type WorksTreeResponse,
  type WorkTreeDocument,
  type WorkTreeBlock,
  type WorkTreeSection,
  type WorkTreeGroup,
  type WorkTreeItem,
  type WorkMaterial,
  type Project,
  type InsertProject,
  type ProjectPermission,
  type InsertProjectPermission,
  type Notification,
  type InsertNotification,
  type ProjectWithPermission,
  type ClassifierCode,
  type InsertClassifierCode,
  type Stage,
  type InsertStage,
  type Executor,
  type InsertExecutor,
  type PriceChange,
  type InsertPriceChange,
  type PriceChangeWithUser,
  type BudgetRowCode,
  type InsertBudgetRowCode,
  type BudgetRowCodeWithCode,
  type SectionAllocation,
  type InsertSectionAllocation,
  type WorkSectionProgress,
  type InsertWorkSectionProgress,
  type WorkMaterialProgress,
  type InsertWorkMaterialProgress,
  type WorkMaterialProgressHistory,
  type InsertWorkMaterialProgressHistory
} from "@shared/schema";
import { eq, and, isNull, asc, lt, sql, or, inArray } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // Blocks
  getBlocksWithGroupsAndWorks(): Promise<BlockResponse[]>;
  getUnassignedGroups(): Promise<WorkGroupResponse[]>;
  createBlock(block: InsertBlock): Promise<Block>;
  updateBlock(id: number, updates: UpdateBlockRequest): Promise<Block>;
  deleteBlock(id: number): Promise<void>;
  
  // Work Groups
  getWorkGroupsWithWorks(): Promise<(WorkGroup & { works: Work[] })[]>;
  createWorkGroup(group: InsertWorkGroup): Promise<WorkGroup>;
  updateWorkGroup(id: number, updates: UpdateWorkGroupRequest): Promise<WorkGroup>;
  deleteWorkGroup(id: number): Promise<void>;

  // Works
  getAllWorks(): Promise<Work[]>;
  createWork(work: InsertWork): Promise<Work>;
  updateWork(id: number, updates: UpdateWorkRequest): Promise<Work>;
  deleteWork(id: number): Promise<void>;
  getWork(id: number): Promise<Work | undefined>;
  
  // Reordering
  moveWorkUp(id: number): Promise<void>;
  moveWorkDown(id: number): Promise<void>;
  
  // Holidays
  getHolidays(): Promise<Holiday[]>;
  createHoliday(holiday: InsertHoliday): Promise<Holiday>;
  deleteHoliday(id: number): Promise<void>;
  deleteHolidayByDate(date: string): Promise<void>;
  getHolidayByDate(date: string): Promise<Holiday | undefined>;

  // Contracts (Budgets)
  getContracts(): Promise<Contract[]>;
  getContractWithData(id: number): Promise<ContractWithData | undefined>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: number, updates: Partial<InsertContract>): Promise<Contract>;
  deleteContract(id: number): Promise<void>;

  // Budget Columns
  getBudgetColumns(contractId: number): Promise<BudgetColumn[]>;
  createBudgetColumn(column: InsertBudgetColumn): Promise<BudgetColumn>;
  updateBudgetColumn(id: number, updates: Partial<InsertBudgetColumn>): Promise<BudgetColumn>;
  deleteBudgetColumn(id: number): Promise<void>;

  // Budget Rows
  getBudgetRows(contractId: number): Promise<BudgetRow[]>;
  createBudgetRow(row: InsertBudgetRow): Promise<BudgetRow>;
  updateBudgetRow(id: number, updates: Partial<InsertBudgetRow>): Promise<BudgetRow>;
  reorderBudgetRow(id: number, direction: 'up' | 'down'): Promise<void>;
  deleteBudgetRow(id: number): Promise<void>;

  // Budget Values
  getBudgetValues(rowId: number): Promise<BudgetValue[]>;
  upsertBudgetValue(value: InsertBudgetValue): Promise<BudgetValue>;
  deleteBudgetValue(id: number): Promise<void>;

  // Budget Row Codes (связь строк бюджета с кодами классификатора)
  getBudgetRowCodes(rowId: number): Promise<BudgetRowCodeWithCode[]>;
  addBudgetRowCode(rowId: number, codeId: number): Promise<BudgetRowCode>;
  removeBudgetRowCode(rowId: number, codeId: number): Promise<void>;
  setBudgetRowCodes(rowId: number, codeIds: number[]): Promise<BudgetRowCodeWithCode[]>;

  // Budget PDC Actual Costs (расчёт факта из ПДЦ)
  calculateBudgetActualCosts(projectId: number): Promise<{ rowId: number; stageId: number; actualCost: number }[]>;

  // Users
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  getUsers(): Promise<SafeUser[]>;
  getUserWithPermissions(id: number): Promise<UserWithPermissions | undefined>;
  createUser(username: string, password: string, isAdmin: boolean, createdById?: number): Promise<SafeUser>;
  updateUserPassword(id: number, newPassword: string): Promise<void>;
  deleteUser(id: number): Promise<void>;
  validatePassword(user: User, password: string): Promise<boolean>;

  // Permissions
  getPermissions(userId: number): Promise<Permission[]>;
  setPermission(userId: number, permissionType: string, resource: string, allowed: boolean): Promise<Permission>;
  deletePermission(id: number): Promise<void>;
  hasPermission(userId: number, permissionType: string, resource: string): Promise<boolean>;

  // PDC Documents
  getPdcDocuments(): Promise<PdcDocument[]>;
  getPdcDocumentWithData(id: number): Promise<PdcDocumentWithData | undefined>;
  createPdcDocument(doc: InsertPdcDocument): Promise<PdcDocument>;
  updatePdcDocument(id: number, updates: Partial<InsertPdcDocument>): Promise<PdcDocument>;
  deletePdcDocument(id: number): Promise<void>;
  reorderPdcDocument(id: number, direction: 'up' | 'down'): Promise<void>;

  // PDC Blocks
  createPdcBlock(block: InsertPdcBlock): Promise<PdcBlock>;
  updatePdcBlock(id: number, updates: Partial<InsertPdcBlock>): Promise<PdcBlock>;
  deletePdcBlock(id: number): Promise<void>;
  reorderPdcBlock(id: number, direction: 'up' | 'down'): Promise<void>;

  // PDC Sections
  createPdcSection(section: InsertPdcSection): Promise<PdcSection>;
  updatePdcSection(id: number, updates: Partial<InsertPdcSection>): Promise<PdcSection>;
  deletePdcSection(id: number): Promise<void>;
  reorderPdcSection(id: number, direction: 'up' | 'down'): Promise<void>;

  // PDC Groups
  createPdcGroup(group: InsertPdcGroup): Promise<PdcGroup>;
  updatePdcGroup(id: number, updates: Partial<InsertPdcGroup>): Promise<PdcGroup>;
  deletePdcGroup(id: number): Promise<void>;
  reorderPdcGroup(id: number, direction: 'up' | 'down'): Promise<void>;

  // PDC Elements
  createPdcElement(element: InsertPdcElement): Promise<PdcElement>;
  updatePdcElement(id: number, updates: Partial<InsertPdcElement>): Promise<PdcElement>;
  deletePdcElement(id: number): Promise<void>;
  reorderPdcElement(id: number, direction: 'up' | 'down'): Promise<void>;

  // Work People
  getWorkPeople(): Promise<WorkPeople[]>;
  getWorkPeopleByWorkId(workId: number): Promise<WorkPeople[]>;
  getWorkPeopleBySection(workId: number, sectionNumber: number): Promise<WorkPeople[]>;
  upsertWorkPeople(workId: number, date: string, count: number, sectionNumber?: number | null): Promise<WorkPeople>;
  deleteWorkPeople(id: number): Promise<void>;

  // Progress Submissions
  submitProgress(workId: number, percent: number, submitterId: number, sectionNumber?: number | null): Promise<ProgressSubmission>;
  approveProgress(submissionId: number, approverId: number): Promise<ProgressSubmission>;
  rejectProgress(submissionId: number, approverId: number): Promise<ProgressSubmission>;
  getProgressHistory(workId: number, sectionNumber?: number | null): Promise<ProgressSubmissionWithUsers[]>;
  getLatestSubmission(workId: number, sectionNumber?: number | null): Promise<ProgressSubmission | undefined>;
  getLatestSectionSubmissions(workId: number): Promise<(ProgressSubmission & { submitterName?: string })[]>;
  
  // Work Section Progress
  getWorkSectionProgress(workId: number): Promise<WorkSectionProgress[]>;
  upsertWorkSectionProgress(workId: number, sectionNumber: number, data: Partial<InsertWorkSectionProgress>): Promise<WorkSectionProgress>;
  deleteWorkSectionProgress(workId: number, sectionNumber: number): Promise<void>;

  // Works Tree (PDC-based hierarchy)
  getWorksTree(): Promise<WorksTreeResponse>;
  getWorkMaterials(workId: number): Promise<WorkMaterial[]>;
  getOrCreateWorkForPdcGroup(pdcGroupId: number): Promise<Work>;
  syncWorksFromPdc(): Promise<void>;

  // Work Material Progress
  getWorkMaterialProgress(workId: number): Promise<WorkMaterialProgress[]>;
  upsertWorkMaterialProgress(workId: number, pdcElementId: number, sectionNumber: number, data: Partial<InsertWorkMaterialProgress>): Promise<WorkMaterialProgress>;

  // Work Material Progress History
  getWorkMaterialProgressHistory(workId: number, pdcElementId: number, sectionNumber: number): Promise<(WorkMaterialProgressHistory & { username: string })[]>;
  addWorkMaterialProgressHistory(data: InsertWorkMaterialProgressHistory): Promise<WorkMaterialProgressHistory>;
  deleteWorkMaterialProgressHistory(id: number): Promise<void>;

  // Admin initialization
  initializeAdmin(): Promise<void>;

  // Projects
  getProjects(): Promise<Project[]>;
  getProjectsForUser(userId: number): Promise<ProjectWithPermission[]>;
  getDeletedProjectsForUser(userId: number): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(name: string, ownerId: number): Promise<Project>;
  updateProject(id: number, name: string): Promise<Project>;
  softDeleteProject(id: number): Promise<void>;
  restoreProject(id: number): Promise<void>;
  hardDeleteProject(id: number): Promise<void>;
  duplicateProject(id: number, newName: string, userId: number): Promise<Project>;
  cleanupDeletedProjects(): Promise<void>;

  // Project Permissions
  getProjectPermission(userId: number, projectId: number): Promise<ProjectPermission | undefined>;
  getProjectPermissionsForUser(userId: number): Promise<ProjectPermission[]>;
  getProjectPermissions(projectId: number): Promise<(ProjectPermission & { username: string })[]>;
  setProjectPermission(permission: InsertProjectPermission): Promise<ProjectPermission>;
  updateProjectPermission(id: number, updates: Partial<InsertProjectPermission>): Promise<ProjectPermission>;
  deleteProjectPermission(userId: number, projectId: number): Promise<void>;
  isProjectOwner(userId: number, projectId: number): Promise<boolean>;
  isProjectAdmin(userId: number, projectId: number): Promise<boolean>;
  transferOwnership(projectId: number, fromUserId: number, toUserId: number): Promise<void>;
  processExpiredOwners(): Promise<void>;

  // Notifications
  getNotifications(userId: number): Promise<(Notification & { projectName: string | null })[]>;
  getUnreadNotificationCount(userId: number): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationsAsRead(userId: number): Promise<void>;
  cleanupOldNotifications(): Promise<void>;

  // Classifier Codes
  getClassifierCodes(): Promise<ClassifierCode[]>;
  getClassifierCode(id: number): Promise<ClassifierCode | undefined>;
  createClassifierCode(code: InsertClassifierCode): Promise<ClassifierCode>;
  updateClassifierCode(id: number, updates: Partial<InsertClassifierCode>): Promise<ClassifierCode>;
  deleteClassifierCode(id: number): Promise<void>;
  reorderClassifierCode(id: number, direction: 'up' | 'down'): Promise<void>;
  duplicateClassifierCodeWithChildren(id: number): Promise<ClassifierCode[]>;

  // Stages (Этапы проекта)
  getStages(projectId: number): Promise<Stage[]>;
  createStage(stage: InsertStage): Promise<Stage>;
  updateStage(id: number, updates: Partial<InsertStage>): Promise<Stage>;
  deleteStage(id: number): Promise<void>;
  createDefaultStages(projectId: number): Promise<Stage[]>;

  // Executors (Исполнители проекта)
  getExecutors(projectId: number): Promise<Executor[]>;
  createExecutor(executor: InsertExecutor): Promise<Executor>;
  updateExecutor(id: number, updates: Partial<InsertExecutor>): Promise<Executor>;
  deleteExecutor(id: number): Promise<void>;

  // Price Changes (История изменений цен)
  getPriceHistory(params: { groupId?: number; elementId?: number; priceType: string }): Promise<PriceChangeWithUser[]>;
  createPriceChange(change: InsertPriceChange): Promise<PriceChange>;
  getInitialPricesForDocument(documentId: number): Promise<{ groupId?: number; elementId?: number; priceType: string; initialPrice: string }[]>;

  // Section Allocations (Распределение по секциям)
  getSectionAllocations(params: { groupId?: number; elementId?: number }): Promise<SectionAllocation[]>;
  upsertSectionAllocations(allocations: InsertSectionAllocation[]): Promise<void>;
  deleteSectionAllocations(params: { groupId?: number; elementId?: number; sectionNumber?: number }): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // === BLOCKS ===
  
  async getBlocksWithGroupsAndWorks(): Promise<BlockResponse[]> {
    return await db.query.blocks.findMany({
      with: {
        groups: {
          with: {
            works: {
              orderBy: (works, { asc }) => [asc(works.order), asc(works.id)],
            },
          },
          orderBy: (workGroups, { asc }) => [asc(workGroups.order), asc(workGroups.id)],
        },
      },
      orderBy: (blocks, { asc }) => [asc(blocks.order), asc(blocks.id)],
    });
  }

  async getUnassignedGroups(): Promise<WorkGroupResponse[]> {
    return await db.query.workGroups.findMany({
      where: isNull(workGroups.blockId),
      with: {
        works: {
          orderBy: (works, { asc }) => [asc(works.order), asc(works.id)],
        },
      },
      orderBy: (workGroups, { asc }) => [asc(workGroups.order), asc(workGroups.id)],
    });
  }

  async createBlock(block: InsertBlock): Promise<Block> {
    const allBlocks = await db.select().from(blocks);
    const maxOrder = Math.max(...allBlocks.map(b => b.order), -1);
    
    const [newBlock] = await db.insert(blocks).values({
      ...block,
      order: maxOrder + 1
    }).returning();
    return newBlock;
  }

  async updateBlock(id: number, updates: UpdateBlockRequest): Promise<Block> {
    const [updated] = await db
      .update(blocks)
      .set(updates)
      .where(eq(blocks.id, id))
      .returning();
    return updated;
  }

  async deleteBlock(id: number): Promise<void> {
    await db.update(workGroups).set({ blockId: null }).where(eq(workGroups.blockId, id));
    await db.delete(blocks).where(eq(blocks.id, id));
  }

  // === WORK GROUPS ===

  async getWorkGroupsWithWorks(): Promise<(WorkGroup & { works: Work[] })[]> {
    const groups = await db.select().from(workGroups).orderBy(workGroups.id);
    const result: (WorkGroup & { works: Work[] })[] = [];

    for (const group of groups) {
      const groupWorks = await db.select().from(works).where(eq(works.groupId, group.id)).orderBy(works.id);
      result.push({ ...group, works: groupWorks });
    }
    
    // Alternative: Use Drizzle query.workGroups.findMany({ with: { works: true } }) if schema relations are set up correctly in query builder mode,
    // but explicit loops are fine for simple storage implementation with `db.select`.
    // Actually, let's try the relation query for better performance if possible, but keeping it simple with loops is robust for now without relying on relational query builder specifics if not fully configured.
    // Wait, I defined relations in schema.ts, so I can use db.query.
    
    return await db.query.workGroups.findMany({
      with: {
        works: {
          orderBy: (works, { asc }) => [asc(works.order), asc(works.id)],
        },
      },
      orderBy: (workGroups, { asc }) => [asc(workGroups.id)],
    });
  }

  async createWorkGroup(group: InsertWorkGroup): Promise<WorkGroup> {
    const allGroups = await db.select().from(workGroups).where(
      group.blockId ? eq(workGroups.blockId, group.blockId) : isNull(workGroups.blockId)
    );
    const maxOrder = Math.max(...allGroups.map(g => g.order), -1);
    
    const [newGroup] = await db.insert(workGroups).values({
      ...group,
      order: maxOrder + 1
    }).returning();
    return newGroup;
  }

  async updateWorkGroup(id: number, updates: UpdateWorkGroupRequest): Promise<WorkGroup> {
    const [updated] = await db
      .update(workGroups)
      .set(updates)
      .where(eq(workGroups.id, id))
      .returning();
    return updated;
  }

  async deleteWorkGroup(id: number): Promise<void> {
    await db.delete(workGroups).where(eq(workGroups.id, id));
  }

  async createWork(work: InsertWork): Promise<Work> {
    // Get the next order value for this pdc group or legacy group
    let groupWorks: Work[] = [];
    if (work.pdcGroupId) {
      groupWorks = await db.select().from(works).where(eq(works.pdcGroupId, work.pdcGroupId));
    } else if (work.groupId) {
      const gid = work.groupId;
      groupWorks = await db.select().from(works).where(
        and(eq(works.groupId, gid), isNull(works.pdcGroupId))
      );
    }
    const maxOrder = Math.max(...groupWorks.map(w => w.order), -1);
    
    const [newWork] = await db.insert(works).values({
      ...work,
      order: maxOrder + 1
    }).returning();
    return newWork;
  }

  async updateWork(id: number, updates: UpdateWorkRequest): Promise<Work> {
    const [updated] = await db
      .update(works)
      .set(updates)
      .where(eq(works.id, id))
      .returning();
    return updated;
  }

  async deleteWork(id: number): Promise<void> {
    await db.delete(works).where(eq(works.id, id));
  }

  async getAllWorks(): Promise<Work[]> {
    return await db.select().from(works).orderBy(asc(works.id));
  }

  async getWork(id: number): Promise<Work | undefined> {
    const [work] = await db.select().from(works).where(eq(works.id, id));
    return work;
  }

  async moveWorkUp(id: number): Promise<void> {
    const work = await this.getWork(id);
    if (!work) return;
    
    // Use pdcGroupId for PDC-based works, groupId for legacy
    let condition;
    if (work.pdcGroupId) {
      condition = and(eq(works.pdcGroupId, work.pdcGroupId), eq(works.order, work.order - 1));
    } else if (work.groupId) {
      condition = and(eq(works.groupId, work.groupId), eq(works.order, work.order - 1));
    } else {
      return;
    }
    
    const [prevWork] = await db.select().from(works).where(condition).limit(1);
    
    if (prevWork) {
      await this.updateWork(work.id, { order: work.order - 1 });
      await this.updateWork(prevWork.id, { order: prevWork.order + 1 });
    }
  }

  async moveWorkDown(id: number): Promise<void> {
    const work = await this.getWork(id);
    if (!work) return;
    
    // Use pdcGroupId for PDC-based works, groupId for legacy
    let condition;
    if (work.pdcGroupId) {
      condition = and(eq(works.pdcGroupId, work.pdcGroupId), eq(works.order, work.order + 1));
    } else if (work.groupId) {
      condition = and(eq(works.groupId, work.groupId), eq(works.order, work.order + 1));
    } else {
      return;
    }
    
    const [nextWork] = await db.select().from(works).where(condition).limit(1);
    
    if (nextWork) {
      await this.updateWork(work.id, { order: work.order + 1 });
      await this.updateWork(nextWork.id, { order: nextWork.order - 1 });
    }
  }

  async getHolidays(): Promise<Holiday[]> {
    return await db.select().from(holidays).orderBy(holidays.date);
  }

  async createHoliday(holiday: InsertHoliday): Promise<Holiday> {
    const [newHoliday] = await db.insert(holidays).values(holiday).returning();
    return newHoliday;
  }

  async deleteHoliday(id: number): Promise<void> {
    await db.delete(holidays).where(eq(holidays.id, id));
  }

  async deleteHolidayByDate(date: string): Promise<void> {
    await db.delete(holidays).where(eq(holidays.date, date));
  }

  async getHolidayByDate(date: string): Promise<Holiday | undefined> {
    const [holiday] = await db.select().from(holidays).where(eq(holidays.date, date));
    return holiday;
  }

  // === CONTRACTS (BUDGETS) ===

  async getContracts(): Promise<Contract[]> {
    return await db.select().from(contracts).orderBy(asc(contracts.id));
  }

  async getContractWithData(id: number): Promise<ContractWithData | undefined> {
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, id));
    if (!contract) return undefined;

    const columns = await db.select().from(budgetColumns)
      .where(eq(budgetColumns.contractId, id))
      .orderBy(asc(budgetColumns.order), asc(budgetColumns.id));

    const rows = await db.select().from(budgetRows)
      .where(eq(budgetRows.contractId, id))
      .orderBy(asc(budgetRows.order), asc(budgetRows.id));

    const allValues = await db.select().from(budgetValues);

    // Build hierarchical structure
    const buildHierarchy = (parentId: number | null): BudgetRowWithChildren[] => {
      return rows
        .filter(r => r.parentId === parentId)
        .map(row => ({
          ...row,
          values: allValues.filter(v => v.rowId === row.id),
          children: buildHierarchy(row.id)
        }));
    };

    return {
      ...contract,
      columns,
      rows: buildHierarchy(null)
    };
  }

  async createContract(contract: InsertContract): Promise<Contract> {
    const [newContract] = await db.insert(contracts).values(contract).returning();
    
    // Create default "ВСЕГО" column
    await db.insert(budgetColumns).values({
      contractId: newContract.id,
      name: "ВСЕГО",
      order: 0,
      isTotal: 1
    });

    // Create default chapters
    await db.insert(budgetRows).values([
      { contractId: newContract.id, name: "ДОХОДЫ", level: "chapter", chapterType: "income", order: 0 },
      { contractId: newContract.id, name: "РАСХОДЫ", level: "chapter", chapterType: "expense", order: 1 }
    ]);

    return newContract;
  }

  async updateContract(id: number, updates: Partial<InsertContract>): Promise<Contract> {
    const [updated] = await db.update(contracts).set(updates).where(eq(contracts.id, id)).returning();
    return updated;
  }

  async deleteContract(id: number): Promise<void> {
    await db.delete(contracts).where(eq(contracts.id, id));
  }

  // === BUDGET COLUMNS ===

  async getBudgetColumns(contractId: number): Promise<BudgetColumn[]> {
    return await db.select().from(budgetColumns)
      .where(eq(budgetColumns.contractId, contractId))
      .orderBy(asc(budgetColumns.order), asc(budgetColumns.id));
  }

  async createBudgetColumn(column: InsertBudgetColumn): Promise<BudgetColumn> {
    const existing = await db.select().from(budgetColumns)
      .where(eq(budgetColumns.contractId, column.contractId));
    const maxOrder = Math.max(...existing.map(c => c.order), -1);
    
    const [newColumn] = await db.insert(budgetColumns).values({
      ...column,
      order: maxOrder + 1
    }).returning();
    return newColumn;
  }

  async updateBudgetColumn(id: number, updates: Partial<InsertBudgetColumn>): Promise<BudgetColumn> {
    const [updated] = await db.update(budgetColumns).set(updates).where(eq(budgetColumns.id, id)).returning();
    return updated;
  }

  async deleteBudgetColumn(id: number): Promise<void> {
    await db.delete(budgetColumns).where(eq(budgetColumns.id, id));
  }

  // === BUDGET ROWS ===

  async getBudgetRows(contractId: number): Promise<BudgetRow[]> {
    return await db.select().from(budgetRows)
      .where(eq(budgetRows.contractId, contractId))
      .orderBy(asc(budgetRows.order), asc(budgetRows.id));
  }

  async createBudgetRow(row: InsertBudgetRow): Promise<BudgetRow> {
    const existing = await db.select().from(budgetRows)
      .where(and(
        eq(budgetRows.contractId, row.contractId),
        row.parentId ? eq(budgetRows.parentId, row.parentId) : isNull(budgetRows.parentId)
      ));
    const maxOrder = Math.max(...existing.map(r => r.order), -1);
    
    const [newRow] = await db.insert(budgetRows).values({
      ...row,
      order: maxOrder + 1
    }).returning();

    // Create default values for all columns
    const columns = await this.getBudgetColumns(row.contractId);
    for (const col of columns) {
      await db.insert(budgetValues).values({
        rowId: newRow.id,
        columnId: col.id,
        manualValue: "0",
        pdcValue: "0"
      });
    }

    return newRow;
  }

  async updateBudgetRow(id: number, updates: Partial<InsertBudgetRow>): Promise<BudgetRow> {
    const [updated] = await db.update(budgetRows).set(updates).where(eq(budgetRows.id, id)).returning();
    return updated;
  }

  async reorderBudgetRow(id: number, direction: 'up' | 'down'): Promise<void> {
    const [row] = await db.select().from(budgetRows).where(eq(budgetRows.id, id));
    if (!row) return;

    // Get siblings with same parentId, ordered
    const siblings = await db.select()
      .from(budgetRows)
      .where(eq(budgetRows.parentId, row.parentId!))
      .orderBy(budgetRows.order);

    const currentIndex = siblings.findIndex(s => s.id === id);
    if (currentIndex === -1) return;

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= siblings.length) return;

    const swapRow = siblings[swapIndex];
    
    // Swap orders
    await db.update(budgetRows).set({ order: swapRow.order }).where(eq(budgetRows.id, row.id));
    await db.update(budgetRows).set({ order: row.order }).where(eq(budgetRows.id, swapRow.id));
  }

  async deleteBudgetRow(id: number): Promise<void> {
    // Delete children first (recursive)
    const children = await db.select().from(budgetRows).where(eq(budgetRows.parentId, id));
    for (const child of children) {
      await this.deleteBudgetRow(child.id);
    }
    await db.delete(budgetRows).where(eq(budgetRows.id, id));
  }

  // === BUDGET VALUES ===

  async getBudgetValues(rowId: number): Promise<BudgetValue[]> {
    return await db.select().from(budgetValues).where(eq(budgetValues.rowId, rowId));
  }

  async upsertBudgetValue(value: InsertBudgetValue): Promise<BudgetValue> {
    // Check if exists
    const [existing] = await db.select().from(budgetValues)
      .where(and(eq(budgetValues.rowId, value.rowId), eq(budgetValues.columnId, value.columnId)));
    
    if (existing) {
      // Only update provided fields, preserve existing pdcValue if not specified
      const updateData: Partial<InsertBudgetValue> = {};
      if (value.manualValue !== undefined) updateData.manualValue = value.manualValue;
      if (value.pdcValue !== undefined) updateData.pdcValue = value.pdcValue;
      
      const [updated] = await db.update(budgetValues)
        .set(updateData)
        .where(eq(budgetValues.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(budgetValues).values(value).returning();
      return created;
    }
  }

  async deleteBudgetValue(id: number): Promise<void> {
    await db.delete(budgetValues).where(eq(budgetValues.id, id));
  }

  // === BUDGET ROW CODES ===

  async getBudgetRowCodes(rowId: number): Promise<BudgetRowCodeWithCode[]> {
    const rowCodesData = await db.select().from(budgetRowCodes)
      .where(eq(budgetRowCodes.rowId, rowId));
    
    const result: BudgetRowCodeWithCode[] = [];
    for (const rc of rowCodesData) {
      const [code] = await db.select().from(classifierCodes)
        .where(eq(classifierCodes.id, rc.codeId));
      result.push({ ...rc, code: code || undefined });
    }
    return result;
  }

  async addBudgetRowCode(rowId: number, codeId: number): Promise<BudgetRowCode> {
    const [existing] = await db.select().from(budgetRowCodes)
      .where(and(eq(budgetRowCodes.rowId, rowId), eq(budgetRowCodes.codeId, codeId)));
    if (existing) return existing;
    
    const [created] = await db.insert(budgetRowCodes).values({ rowId, codeId }).returning();
    return created;
  }

  async removeBudgetRowCode(rowId: number, codeId: number): Promise<void> {
    await db.delete(budgetRowCodes)
      .where(and(eq(budgetRowCodes.rowId, rowId), eq(budgetRowCodes.codeId, codeId)));
  }

  async setBudgetRowCodes(rowId: number, codeIds: number[]): Promise<BudgetRowCodeWithCode[]> {
    // Delete existing codes
    await db.delete(budgetRowCodes).where(eq(budgetRowCodes.rowId, rowId));
    
    // Add new codes
    for (const codeId of codeIds) {
      await db.insert(budgetRowCodes).values({ rowId, codeId });
    }
    
    return await this.getBudgetRowCodes(rowId);
  }

  async calculateBudgetActualCosts(projectId: number): Promise<{ rowId: number; stageId: number; actualCost: number }[]> {
    // Get all PDC documents for this project with their groups and elements
    const projectDocs = await db.select().from(pdcDocuments)
      .where(eq(pdcDocuments.projectId, projectId));
    
    // Build a map: stageId -> classifierCodeId -> total cost
    // stageId null means unassigned stage
    const stageCostMap = new Map<number, Map<number, number>>();
    
    for (const doc of projectDocs) {
      if (!doc.stageId) continue; // Skip documents without stage
      
      // Get full document data with blocks, sections, groups, elements
      const docData = await this.getPdcDocumentWithData(doc.id);
      if (!docData) continue;
      
      for (const block of docData.blocks || []) {
        for (const section of block.sections || []) {
          for (const group of section.groups || []) {
            if (!group.classifierCodeId) continue;
            
            // Calculate group total cost (sum of elements material costs)
            let groupTotal = 0;
            for (const element of group.elements || []) {
              const qty = parseFloat(String(element.quantity || 0));
              const price = parseFloat(String(element.materialPrice || 0));
              groupTotal += qty * price;
            }
            
            // Add to map
            if (!stageCostMap.has(doc.stageId)) {
              stageCostMap.set(doc.stageId, new Map());
            }
            const codeMap = stageCostMap.get(doc.stageId)!;
            const currentCost = codeMap.get(group.classifierCodeId) || 0;
            codeMap.set(group.classifierCodeId, currentCost + groupTotal);
          }
        }
      }
    }
    
    // Get all budget rows with their codes
    const allRowCodes = await db.select().from(budgetRowCodes);
    
    // Build results: for each budget row + stage combination, calculate actual cost
    const results: { rowId: number; stageId: number; actualCost: number }[] = [];
    
    // Group row codes by rowId
    const rowToCodeIds = new Map<number, number[]>();
    for (const rc of allRowCodes) {
      if (!rowToCodeIds.has(rc.rowId)) {
        rowToCodeIds.set(rc.rowId, []);
      }
      rowToCodeIds.get(rc.rowId)!.push(rc.codeId);
    }
    
    // For each row and stage, sum up costs for all matching codes
    rowToCodeIds.forEach((codeIds, rowId) => {
      stageCostMap.forEach((codeMap, stageId) => {
        let totalActual = 0;
        for (const codeId of codeIds) {
          const cost = codeMap.get(codeId) || 0;
          totalActual += cost;
        }
        if (totalActual > 0) {
          results.push({ rowId, stageId, actualCost: totalActual });
        }
      });
    });
    
    return results;
  }

  // === USERS ===

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUsers(): Promise<SafeUser[]> {
    const allUsers = await db.select({
      id: users.id,
      username: users.username,
      isAdmin: users.isAdmin,
      createdById: users.createdById,
      createdAt: users.createdAt
    }).from(users).orderBy(asc(users.id));
    return allUsers;
  }

  async getUserWithPermissions(id: number): Promise<UserWithPermissions | undefined> {
    const [user] = await db.select({
      id: users.id,
      username: users.username,
      isAdmin: users.isAdmin,
      createdById: users.createdById,
      createdAt: users.createdAt
    }).from(users).where(eq(users.id, id));
    
    if (!user) return undefined;
    
    const userPermissions = await db.select().from(permissions).where(eq(permissions.userId, id));
    return { ...user, permissions: userPermissions };
  }

  async createUser(username: string, password: string, isAdmin: boolean, createdById?: number): Promise<SafeUser> {
    const passwordHash = await bcrypt.hash(password, 10);
    const [newUser] = await db.insert(users).values({
      username,
      passwordHash,
      isAdmin,
      createdById
    }).returning();
    
    const { passwordHash: _, ...safeUser } = newUser;
    return safeUser;
  }

  async updateUserPassword(id: number, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ passwordHash }).where(eq(users.id, id));
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return await bcrypt.compare(password, user.passwordHash);
  }

  // === PERMISSIONS ===

  async getPermissions(userId: number): Promise<Permission[]> {
    return await db.select().from(permissions).where(eq(permissions.userId, userId));
  }

  async setPermission(userId: number, permissionType: string, resource: string, allowed: boolean): Promise<Permission> {
    // Check if permission exists
    const [existing] = await db.select().from(permissions)
      .where(and(
        eq(permissions.userId, userId),
        eq(permissions.permissionType, permissionType),
        eq(permissions.resource, resource)
      ));
    
    if (existing) {
      const [updated] = await db.update(permissions)
        .set({ allowed })
        .where(eq(permissions.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(permissions).values({
        userId,
        permissionType,
        resource,
        allowed
      }).returning();
      return created;
    }
  }

  async deletePermission(id: number): Promise<void> {
    await db.delete(permissions).where(eq(permissions.id, id));
  }

  async hasPermission(userId: number, permissionType: string, resource: string): Promise<boolean> {
    // Admins have all permissions
    const user = await this.getUserById(userId);
    if (user?.isAdmin) return true;
    
    const [permission] = await db.select().from(permissions)
      .where(and(
        eq(permissions.userId, userId),
        eq(permissions.permissionType, permissionType),
        eq(permissions.resource, resource)
      ));
    
    return permission?.allowed ?? false;
  }

  // === ADMIN INITIALIZATION ===

  async initializeAdmin(): Promise<void> {
    const adminPassword = "nhu!P3nG@-";
    
    // Check if admin already exists
    const existingAdmin = await this.getUserByUsername("GaisinMF");
    if (existingAdmin) {
      // Update the password to ensure it's correct
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await db.update(users)
        .set({ passwordHash: hashedPassword, isAdmin: true })
        .where(eq(users.id, existingAdmin.id));
      console.log("Admin user password updated");
      return;
    }
    
    // Create the admin user
    await this.createUser("GaisinMF", adminPassword, true);
    console.log("Admin user GaisinMF created successfully");
  }

  // === PDC DOCUMENTS ===

  async getPdcDocuments(): Promise<PdcDocument[]> {
    return await db.select().from(pdcDocuments).orderBy(asc(pdcDocuments.order), asc(pdcDocuments.id));
  }

  async getPdcDocumentWithData(id: number): Promise<PdcDocumentWithData | undefined> {
    const result = await db.query.pdcDocuments.findFirst({
      where: eq(pdcDocuments.id, id),
      with: {
        blocks: {
          orderBy: (pdcBlocks, { asc }) => [asc(pdcBlocks.order), asc(pdcBlocks.id)],
          with: {
            sections: {
              orderBy: (pdcSections, { asc }) => [asc(pdcSections.order), asc(pdcSections.id)],
              with: {
                groups: {
                  orderBy: (pdcGroups, { asc }) => [asc(pdcGroups.order), asc(pdcGroups.id)],
                  with: {
                    elements: {
                      orderBy: (pdcElements, { asc }) => [asc(pdcElements.order), asc(pdcElements.id)],
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    return result as PdcDocumentWithData | undefined;
  }

  async createPdcDocument(doc: InsertPdcDocument): Promise<PdcDocument> {
    const existing = await db.select().from(pdcDocuments);
    const maxOrder = Math.max(...existing.map(d => d.order), -1);
    
    const [newDoc] = await db.insert(pdcDocuments).values({
      ...doc,
      order: maxOrder + 1
    }).returning();
    return newDoc;
  }

  async updatePdcDocument(id: number, updates: Partial<InsertPdcDocument>): Promise<PdcDocument> {
    const [updated] = await db.update(pdcDocuments).set(updates).where(eq(pdcDocuments.id, id)).returning();
    return updated;
  }

  async deletePdcDocument(id: number): Promise<void> {
    await db.delete(pdcDocuments).where(eq(pdcDocuments.id, id));
  }

  async reorderPdcDocument(id: number, direction: 'up' | 'down'): Promise<void> {
    const [doc] = await db.select().from(pdcDocuments).where(eq(pdcDocuments.id, id));
    if (!doc) return;

    const siblings = await db.select()
      .from(pdcDocuments)
      .orderBy(asc(pdcDocuments.order), asc(pdcDocuments.id));

    const currentIndex = siblings.findIndex(s => s.id === id);
    if (currentIndex === -1) return;

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= siblings.length) return;

    const swapDoc = siblings[swapIndex];
    await db.update(pdcDocuments).set({ order: swapDoc.order }).where(eq(pdcDocuments.id, doc.id));
    await db.update(pdcDocuments).set({ order: doc.order }).where(eq(pdcDocuments.id, swapDoc.id));
  }

  // === PDC BLOCKS ===

  async createPdcBlock(block: InsertPdcBlock): Promise<PdcBlock> {
    const existing = await db.select().from(pdcBlocks)
      .where(eq(pdcBlocks.documentId, block.documentId));
    const maxOrder = Math.max(...existing.map(b => b.order), -1);
    
    const [newBlock] = await db.insert(pdcBlocks).values({
      ...block,
      order: maxOrder + 1
    }).returning();
    return newBlock;
  }

  async updatePdcBlock(id: number, updates: Partial<InsertPdcBlock>): Promise<PdcBlock> {
    const [updated] = await db.update(pdcBlocks).set(updates).where(eq(pdcBlocks.id, id)).returning();
    return updated;
  }

  async deletePdcBlock(id: number): Promise<void> {
    await db.delete(pdcBlocks).where(eq(pdcBlocks.id, id));
  }

  async reorderPdcBlock(id: number, direction: 'up' | 'down'): Promise<void> {
    const [block] = await db.select().from(pdcBlocks).where(eq(pdcBlocks.id, id));
    if (!block) return;

    const siblings = await db.select()
      .from(pdcBlocks)
      .where(eq(pdcBlocks.documentId, block.documentId))
      .orderBy(asc(pdcBlocks.order));

    const currentIndex = siblings.findIndex(s => s.id === id);
    if (currentIndex === -1) return;

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= siblings.length) return;

    const swapBlock = siblings[swapIndex];
    await db.update(pdcBlocks).set({ order: swapBlock.order }).where(eq(pdcBlocks.id, block.id));
    await db.update(pdcBlocks).set({ order: block.order }).where(eq(pdcBlocks.id, swapBlock.id));
  }

  // === PDC SECTIONS ===

  async createPdcSection(section: InsertPdcSection): Promise<PdcSection> {
    const existing = await db.select().from(pdcSections)
      .where(eq(pdcSections.blockId, section.blockId));
    const maxOrder = Math.max(...existing.map(s => s.order), -1);
    
    const [newSection] = await db.insert(pdcSections).values({
      ...section,
      order: maxOrder + 1
    }).returning();
    return newSection;
  }

  async updatePdcSection(id: number, updates: Partial<InsertPdcSection>): Promise<PdcSection> {
    const [updated] = await db.update(pdcSections).set(updates).where(eq(pdcSections.id, id)).returning();
    return updated;
  }

  async deletePdcSection(id: number): Promise<void> {
    await db.delete(pdcSections).where(eq(pdcSections.id, id));
  }

  async reorderPdcSection(id: number, direction: 'up' | 'down'): Promise<void> {
    const [section] = await db.select().from(pdcSections).where(eq(pdcSections.id, id));
    if (!section) return;

    const siblings = await db.select()
      .from(pdcSections)
      .where(eq(pdcSections.blockId, section.blockId))
      .orderBy(asc(pdcSections.order));

    const currentIndex = siblings.findIndex(s => s.id === id);
    if (currentIndex === -1) return;

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= siblings.length) return;

    const swapSection = siblings[swapIndex];
    await db.update(pdcSections).set({ order: swapSection.order }).where(eq(pdcSections.id, section.id));
    await db.update(pdcSections).set({ order: section.order }).where(eq(pdcSections.id, swapSection.id));
  }

  // === PDC GROUPS ===

  async createPdcGroup(group: InsertPdcGroup): Promise<PdcGroup> {
    const existing = await db.select().from(pdcGroups)
      .where(eq(pdcGroups.sectionId, group.sectionId));
    const maxOrder = Math.max(...existing.map(g => g.order), -1);
    
    const [newGroup] = await db.insert(pdcGroups).values({
      ...group,
      order: maxOrder + 1
    }).returning();
    return newGroup;
  }

  async updatePdcGroup(id: number, updates: Partial<InsertPdcGroup>): Promise<PdcGroup> {
    const [updated] = await db.update(pdcGroups).set(updates).where(eq(pdcGroups.id, id)).returning();
    return updated;
  }

  async deletePdcGroup(id: number): Promise<void> {
    await db.delete(pdcGroups).where(eq(pdcGroups.id, id));
  }

  async reorderPdcGroup(id: number, direction: 'up' | 'down'): Promise<void> {
    const [group] = await db.select().from(pdcGroups).where(eq(pdcGroups.id, id));
    if (!group) return;

    const siblings = await db.select()
      .from(pdcGroups)
      .where(eq(pdcGroups.sectionId, group.sectionId))
      .orderBy(asc(pdcGroups.order));

    const currentIndex = siblings.findIndex(s => s.id === id);
    if (currentIndex === -1) return;

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= siblings.length) return;

    const swapGroup = siblings[swapIndex];
    await db.update(pdcGroups).set({ order: swapGroup.order }).where(eq(pdcGroups.id, group.id));
    await db.update(pdcGroups).set({ order: group.order }).where(eq(pdcGroups.id, swapGroup.id));
  }

  // === PDC ELEMENTS ===

  async createPdcElement(element: InsertPdcElement): Promise<PdcElement> {
    const existing = await db.select().from(pdcElements)
      .where(eq(pdcElements.groupId, element.groupId));
    const maxOrder = Math.max(...existing.map(e => e.order), -1);
    
    const [newElement] = await db.insert(pdcElements).values({
      ...element,
      order: maxOrder + 1
    }).returning();
    return newElement;
  }

  async updatePdcElement(id: number, updates: Partial<InsertPdcElement>): Promise<PdcElement> {
    const [updated] = await db.update(pdcElements).set(updates).where(eq(pdcElements.id, id)).returning();
    return updated;
  }

  async deletePdcElement(id: number): Promise<void> {
    await db.delete(pdcElements).where(eq(pdcElements.id, id));
  }

  async reorderPdcElement(id: number, direction: 'up' | 'down'): Promise<void> {
    const [element] = await db.select().from(pdcElements).where(eq(pdcElements.id, id));
    if (!element) return;

    const siblings = await db.select()
      .from(pdcElements)
      .where(eq(pdcElements.groupId, element.groupId))
      .orderBy(asc(pdcElements.order));

    const currentIndex = siblings.findIndex(s => s.id === id);
    if (currentIndex === -1) return;

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= siblings.length) return;

    const swapElement = siblings[swapIndex];
    await db.update(pdcElements).set({ order: swapElement.order }).where(eq(pdcElements.id, element.id));
    await db.update(pdcElements).set({ order: element.order }).where(eq(pdcElements.id, swapElement.id));
  }

  // === WORK PEOPLE ===

  async getWorkPeople(): Promise<WorkPeople[]> {
    return await db.select().from(workPeople).orderBy(asc(workPeople.workId), asc(workPeople.date));
  }

  async getWorkPeopleByWorkId(workId: number): Promise<WorkPeople[]> {
    return await db.select().from(workPeople)
      .where(eq(workPeople.workId, workId))
      .orderBy(asc(workPeople.date));
  }

  async getWorkPeopleBySection(workId: number, sectionNumber: number): Promise<WorkPeople[]> {
    return await db.select().from(workPeople)
      .where(and(eq(workPeople.workId, workId), eq(workPeople.sectionNumber, sectionNumber)))
      .orderBy(asc(workPeople.date));
  }

  async upsertWorkPeople(workId: number, date: string, count: number, sectionNumber?: number | null): Promise<WorkPeople> {
    const conditions = [eq(workPeople.workId, workId), eq(workPeople.date, date)];
    if (sectionNumber !== undefined && sectionNumber !== null) {
      conditions.push(eq(workPeople.sectionNumber, sectionNumber));
    } else {
      conditions.push(sql`${workPeople.sectionNumber} IS NULL`);
    }
    
    const existing = await db.select().from(workPeople).where(and(...conditions));
    
    if (existing.length > 0) {
      const [updated] = await db.update(workPeople)
        .set({ count })
        .where(eq(workPeople.id, existing[0].id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(workPeople)
        .values({ workId, date, count, sectionNumber: sectionNumber ?? null })
        .returning();
      return created;
    }
  }

  async deleteWorkPeople(id: number): Promise<void> {
    await db.delete(workPeople).where(eq(workPeople.id, id));
  }

  // === PROGRESS SUBMISSIONS ===

  async submitProgress(workId: number, percent: number, submitterId: number, sectionNumber?: number | null): Promise<ProgressSubmission> {
    const [submission] = await db.insert(progressSubmissions).values({
      workId,
      percent,
      submitterId,
      sectionNumber: sectionNumber !== undefined ? sectionNumber : null,
      status: "submitted"
    }).returning();
    return submission;
  }

  async approveProgress(submissionId: number, approverId: number): Promise<ProgressSubmission> {
    const [submission] = await db.select().from(progressSubmissions).where(eq(progressSubmissions.id, submissionId));
    if (!submission) throw new Error("Submission not found");

    const [updated] = await db.update(progressSubmissions)
      .set({ 
        status: "approved", 
        approverId, 
        resolvedAt: new Date() 
      })
      .where(eq(progressSubmissions.id, submissionId))
      .returning();
    
    if (submission.sectionNumber !== null && submission.sectionNumber !== undefined) {
      await this.upsertWorkSectionProgress(submission.workId, submission.sectionNumber, {
        progressPercentage: submission.percent
      });
      const sectionProgress = await this.getWorkSectionProgress(submission.workId);
      if (sectionProgress.length > 0) {
        const totalProgress = Math.round(
          sectionProgress.reduce((sum, sp) => sum + sp.progressPercentage, 0) / sectionProgress.length
        );
        await db.update(works)
          .set({ progressPercentage: totalProgress })
          .where(eq(works.id, submission.workId));
      }
    } else {
      await db.update(works)
        .set({ progressPercentage: submission.percent })
        .where(eq(works.id, submission.workId));
    }
    
    return updated;
  }

  async rejectProgress(submissionId: number, approverId: number): Promise<ProgressSubmission> {
    const [updated] = await db.update(progressSubmissions)
      .set({ 
        status: "rejected", 
        approverId, 
        resolvedAt: new Date() 
      })
      .where(eq(progressSubmissions.id, submissionId))
      .returning();
    return updated;
  }

  async getProgressHistory(workId: number, sectionNumber?: number | null): Promise<ProgressSubmissionWithUsers[]> {
    let whereClause;
    if (sectionNumber !== undefined && sectionNumber !== null) {
      whereClause = and(eq(progressSubmissions.workId, workId), eq(progressSubmissions.sectionNumber, sectionNumber));
    } else if (sectionNumber === null) {
      whereClause = and(eq(progressSubmissions.workId, workId), isNull(progressSubmissions.sectionNumber));
    } else {
      whereClause = eq(progressSubmissions.workId, workId);
    }
    const submissions = await db.select().from(progressSubmissions)
      .where(whereClause)
      .orderBy(asc(progressSubmissions.id));
    
    const result: ProgressSubmissionWithUsers[] = [];
    for (const sub of submissions) {
      const [submitter] = await db.select().from(users).where(eq(users.id, sub.submitterId));
      let approverName: string | undefined;
      if (sub.approverId) {
        const [approver] = await db.select().from(users).where(eq(users.id, sub.approverId));
        approverName = approver?.username;
      }
      result.push({
        ...sub,
        submitterName: submitter?.username,
        approverName
      });
    }
    return result;
  }

  async getLatestSubmission(workId: number, sectionNumber?: number | null): Promise<ProgressSubmission | undefined> {
    let whereClause;
    if (sectionNumber !== undefined && sectionNumber !== null) {
      whereClause = and(eq(progressSubmissions.workId, workId), eq(progressSubmissions.sectionNumber, sectionNumber));
    } else if (sectionNumber === null) {
      whereClause = and(eq(progressSubmissions.workId, workId), isNull(progressSubmissions.sectionNumber));
    } else {
      whereClause = eq(progressSubmissions.workId, workId);
    }
    const submissions = await db.select().from(progressSubmissions)
      .where(whereClause)
      .orderBy(asc(progressSubmissions.id));
    
    if (submissions.length === 0) return undefined;
    return submissions[submissions.length - 1];
  }

  async getLatestSectionSubmissions(workId: number): Promise<(ProgressSubmission & { submitterName?: string })[]> {
    // Get all submissions for this work that have a section number
    const allSectionSubmissions = await db.select().from(progressSubmissions)
      .where(and(
        eq(progressSubmissions.workId, workId),
        sql`${progressSubmissions.sectionNumber} IS NOT NULL`
      ))
      .orderBy(asc(progressSubmissions.id));
    
    // Group by sectionNumber and get the latest for each
    const latestBySection = new Map<number, typeof allSectionSubmissions[0]>();
    for (const sub of allSectionSubmissions) {
      if (sub.sectionNumber !== null) {
        latestBySection.set(sub.sectionNumber, sub);
      }
    }
    
    // Convert to array with submitter names
    const result: (ProgressSubmission & { submitterName?: string })[] = [];
    for (const sub of Array.from(latestBySection.values())) {
      const [submitter] = await db.select().from(users).where(eq(users.id, sub.submitterId));
      result.push({
        ...sub,
        submitterName: submitter?.username
      });
    }
    
    return result.sort((a, b) => (a.sectionNumber || 0) - (b.sectionNumber || 0));
  }

  // === WORK SECTION PROGRESS ===

  async getWorkSectionProgress(workId: number): Promise<WorkSectionProgress[]> {
    return await db.select().from(workSectionProgress)
      .where(eq(workSectionProgress.workId, workId))
      .orderBy(asc(workSectionProgress.sectionNumber));
  }

  async upsertWorkSectionProgress(workId: number, sectionNumber: number, data: Partial<InsertWorkSectionProgress>): Promise<WorkSectionProgress> {
    const existing = await db.select().from(workSectionProgress)
      .where(and(eq(workSectionProgress.workId, workId), eq(workSectionProgress.sectionNumber, sectionNumber)));
    
    if (existing.length > 0) {
      const [updated] = await db.update(workSectionProgress)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(workSectionProgress.id, existing[0].id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(workSectionProgress)
        .values({ workId, sectionNumber, ...data })
        .returning();
      return created;
    }
  }

  async deleteWorkSectionProgress(workId: number, sectionNumber: number): Promise<void> {
    await db.delete(workSectionProgress)
      .where(and(eq(workSectionProgress.workId, workId), eq(workSectionProgress.sectionNumber, sectionNumber)));
    
    const remainingSections = await this.getWorkSectionProgress(workId);
    if (remainingSections.length > 0) {
      const totalProgress = Math.round(
        remainingSections.reduce((sum, sp) => sum + sp.progressPercentage, 0) / remainingSections.length
      );
      await db.update(works)
        .set({ progressPercentage: totalProgress })
        .where(eq(works.id, workId));
    } else {
      const allGlobalSubmissions = await db.select().from(progressSubmissions)
        .where(and(eq(progressSubmissions.workId, workId), isNull(progressSubmissions.sectionNumber)))
        .orderBy(asc(progressSubmissions.id));
      const lastApproved = allGlobalSubmissions.filter(s => s.status === 'approved').pop();
      await db.update(works)
        .set({ progressPercentage: lastApproved ? lastApproved.percent : 0 })
        .where(eq(works.id, workId));
    }
  }

  // === WORKS TREE (PDC-based hierarchy) ===

  async getOrCreateWorkForPdcGroup(pdcGroupId: number): Promise<Work> {
    const [existing] = await db.select().from(works).where(eq(works.pdcGroupId, pdcGroupId));
    if (existing) return existing;

    const [pdcGroup] = await db.select().from(pdcGroups).where(eq(pdcGroups.id, pdcGroupId));
    if (!pdcGroup) throw new Error(`PDC Group ${pdcGroupId} not found`);

    const quantity = parseFloat(pdcGroup.quantity || "0");
    const smrPnrPrice = parseFloat(pdcGroup.smrPnrPrice || "0");

    const [newWork] = await db.insert(works).values({
      pdcGroupId,
      name: pdcGroup.name,
      volumeAmount: quantity,
      volumeUnit: pdcGroup.unit || "шт.",
      costPlan: quantity * smrPnrPrice,
      order: pdcGroup.order
    }).returning();
    return newWork;
  }

  async syncWorksFromPdc(): Promise<void> {
    const allPdcGroups = await db.select().from(pdcGroups).orderBy(asc(pdcGroups.id));
    for (const pdcGroup of allPdcGroups) {
      await this.getOrCreateWorkForPdcGroup(pdcGroup.id);
    }
  }

  async getWorkMaterials(workId: number): Promise<WorkMaterial[]> {
    const work = await this.getWork(workId);
    if (!work || !work.pdcGroupId) return [];

    const [pdcGroup] = await db.select().from(pdcGroups).where(eq(pdcGroups.id, work.pdcGroupId));
    if (!pdcGroup) return [];

    const [pdcSection] = await db.select().from(pdcSections).where(eq(pdcSections.id, pdcGroup.sectionId));
    const [pdcBlock] = pdcSection ? await db.select().from(pdcBlocks).where(eq(pdcBlocks.id, pdcSection.blockId)) : [null];
    const [pdcDocument] = pdcBlock ? await db.select().from(pdcDocuments).where(eq(pdcDocuments.id, pdcBlock.documentId)) : [null];
    
    const vatRate = pdcDocument ? parseFloat(pdcDocument.vatRate || "20") : 20;
    const vatMultiplier = 1 + vatRate / 100;
    const sectionsCount = pdcDocument ? (pdcDocument.sectionsCount || 1) : 1;

    const elements = await db.select().from(pdcElements)
      .where(eq(pdcElements.groupId, work.pdcGroupId))
      .orderBy(asc(pdcElements.order), asc(pdcElements.id));

    // Fetch section allocations for all elements in this group
    const elementIds = elements.map(el => el.id);
    const allAllocations = elementIds.length > 0 
      ? await db.select().from(sectionAllocations)
          .where(inArray(sectionAllocations.elementId, elementIds))
      : [];

    return elements.map((el, idx) => {
      const quantity = parseFloat(el.quantity || "0");
      const materialPrice = parseFloat(el.materialPrice || "0");
      const costWithVat = quantity * materialPrice * vatMultiplier;
      
      // Get section allocations for this element
      const elementAllocations = allAllocations
        .filter(a => a.elementId === el.id)
        .sort((a, b) => a.sectionNumber - b.sectionNumber);

      const sections = elementAllocations.map(alloc => {
        const coef = parseFloat(alloc.coefficient || "0") / 100;
        const manualQty = parseFloat(alloc.quantity || "0");
        const sectionQty = alloc.coefficient ? quantity * coef : manualQty;
        const sectionCost = sectionQty * materialPrice * vatMultiplier;
        
        return {
          sectionNumber: alloc.sectionNumber,
          quantity: sectionQty,
          costWithVat: sectionCost
        };
      });

      return {
        id: el.id,
        pdcElementId: el.id,
        number: `${idx + 1}`,
        name: el.name,
        unit: el.unit || "шт.",
        quantity,
        costWithVat,
        sectionsCount,
        sections: sectionsCount > 1 ? sections : undefined
      };
    });
  }

  async getWorkMaterialProgress(workId: number): Promise<WorkMaterialProgress[]> {
    return db.select().from(workMaterialProgress)
      .where(eq(workMaterialProgress.workId, workId))
      .orderBy(asc(workMaterialProgress.pdcElementId), asc(workMaterialProgress.sectionNumber));
  }

  async upsertWorkMaterialProgress(
    workId: number, 
    pdcElementId: number, 
    sectionNumber: number, 
    data: Partial<InsertWorkMaterialProgress>
  ): Promise<WorkMaterialProgress> {
    const existing = await db.select().from(workMaterialProgress)
      .where(and(
        eq(workMaterialProgress.workId, workId),
        eq(workMaterialProgress.pdcElementId, pdcElementId),
        eq(workMaterialProgress.sectionNumber, sectionNumber)
      ))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db.update(workMaterialProgress)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(workMaterialProgress.id, existing[0].id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(workMaterialProgress)
        .values({
          workId,
          pdcElementId,
          sectionNumber,
          quantityClosed: data.quantityClosed || "0",
          costClosed: data.costClosed || "0"
        })
        .returning();
      return created;
    }
  }

  async getWorkMaterialProgressHistory(
    workId: number, 
    pdcElementId: number, 
    sectionNumber: number
  ): Promise<(WorkMaterialProgressHistory & { username: string })[]> {
    const history = await db.select({
      id: workMaterialProgressHistory.id,
      workId: workMaterialProgressHistory.workId,
      pdcElementId: workMaterialProgressHistory.pdcElementId,
      sectionNumber: workMaterialProgressHistory.sectionNumber,
      type: workMaterialProgressHistory.type,
      value: workMaterialProgressHistory.value,
      unit: workMaterialProgressHistory.unit,
      userId: workMaterialProgressHistory.userId,
      createdAt: workMaterialProgressHistory.createdAt,
      username: users.username,
    })
      .from(workMaterialProgressHistory)
      .innerJoin(users, eq(workMaterialProgressHistory.userId, users.id))
      .where(and(
        eq(workMaterialProgressHistory.workId, workId),
        eq(workMaterialProgressHistory.pdcElementId, pdcElementId),
        eq(workMaterialProgressHistory.sectionNumber, sectionNumber)
      ))
      .orderBy(asc(workMaterialProgressHistory.createdAt));
    return history;
  }

  async addWorkMaterialProgressHistory(data: InsertWorkMaterialProgressHistory): Promise<WorkMaterialProgressHistory> {
    const [created] = await db.insert(workMaterialProgressHistory).values(data).returning();
    return created;
  }

  async deleteWorkMaterialProgressHistory(id: number): Promise<void> {
    await db.delete(workMaterialProgressHistory).where(eq(workMaterialProgressHistory.id, id));
  }

  async getWorksTree(): Promise<WorksTreeResponse> {
    await this.syncWorksFromPdc();

    const allDocuments = await db.select().from(pdcDocuments).orderBy(asc(pdcDocuments.order), asc(pdcDocuments.id));
    const allBlocks = await db.select().from(pdcBlocks).orderBy(asc(pdcBlocks.order), asc(pdcBlocks.id));
    const allSections = await db.select().from(pdcSections).orderBy(asc(pdcSections.order), asc(pdcSections.id));
    const allPdcGroups = await db.select().from(pdcGroups).orderBy(asc(pdcGroups.order), asc(pdcGroups.id));
    const allWorks = await db.select().from(works).orderBy(asc(works.order), asc(works.id));
    const allExecutors = await db.select().from(executors);
    const allSectionProgress = await db.select().from(workSectionProgress).orderBy(asc(workSectionProgress.sectionNumber));

    const worksByPdcGroupId = new Map<number, Work>();
    for (const w of allWorks) {
      if (w.pdcGroupId) {
        worksByPdcGroupId.set(w.pdcGroupId, w);
      }
    }

    // Map work_section_progress by workId
    const sectionProgressByWorkId = new Map<number, typeof allSectionProgress>();
    for (const sp of allSectionProgress) {
      if (!sectionProgressByWorkId.has(sp.workId)) {
        sectionProgressByWorkId.set(sp.workId, []);
      }
      sectionProgressByWorkId.get(sp.workId)!.push(sp);
    }

    const executorsById = new Map<number, string>();
    for (const e of allExecutors) {
      executorsById.set(e.id, e.name);
    }

    const result: WorksTreeResponse = [];

    for (const doc of allDocuments) {
      const vatRate = parseFloat(doc.vatRate || "20");
      const vatMultiplier = 1 + vatRate / 100;
      const docBlocks = allBlocks.filter(b => b.documentId === doc.id);

      let docIndex = 1;
      const treeBlocks: WorkTreeBlock[] = [];
      let docProgress = 0;
      let docCost = 0;
      let docWorkCount = 0;

      for (const block of docBlocks) {
        const blockSections = allSections.filter(s => s.blockId === block.id);
        
        let blockIndex = 1;
        const treeSections: WorkTreeSection[] = [];
        let blockProgress = 0;
        let blockCost = 0;
        let blockWorkCount = 0;

        for (const section of blockSections) {
          const sectionGroups = allPdcGroups.filter(g => g.sectionId === section.id);
          
          let groupIndex = 1;
          const treeGroups: WorkTreeGroup[] = [];
          let sectionProgress = 0;
          let sectionCost = 0;
          let sectionWorkCount = 0;

          for (const pdcGroup of sectionGroups) {
            const work = worksByPdcGroupId.get(pdcGroup.id);
            const quantity = parseFloat(pdcGroup.quantity || "0");
            const smrPnrPrice = parseFloat(pdcGroup.smrPnrPrice || "0");
            const groupCostWithVat = quantity * smrPnrPrice * vatMultiplier;

            const treeWorks: WorkTreeItem[] = [];
            if (work) {
              const executorName = doc.executorId ? executorsById.get(doc.executorId) || null : null;
              const sectionsCount = doc.sectionsCount || 1;
              
              // Get building sections data if sectionsCount > 1
              let buildingSections: WorkTreeItem['buildingSections'] = undefined;
              let aggregatedDates: { 
                planStartDate: string | null; 
                planEndDate: string | null; 
                actualStartDate: string | null; 
                actualEndDate: string | null; 
              } | null = null;
              
              if (sectionsCount > 1) {
                const sectionProgressData = sectionProgressByWorkId.get(work.id) || [];
                const sectionDataMap = new Map(sectionProgressData.map(sp => [sp.sectionNumber, sp]));
                
                // Always create all sections 1..sectionsCount, filling with data where available
                buildingSections = [];
                for (let i = 1; i <= sectionsCount; i++) {
                  const sp = sectionDataMap.get(i);
                  buildingSections.push({
                    sectionNumber: i,
                    planStartDate: sp?.planStartDate || null,
                    planEndDate: sp?.planEndDate || null,
                    actualStartDate: sp?.actualStartDate || null,
                    actualEndDate: sp?.actualEndDate || null
                  });
                }
                
                // Calculate aggregated dates from sections (min/max) using ISO date string comparison
                const planStarts = buildingSections.map(s => s.planStartDate).filter((d): d is string => d !== null);
                const planEnds = buildingSections.map(s => s.planEndDate).filter((d): d is string => d !== null);
                const actualStarts = buildingSections.map(s => s.actualStartDate).filter((d): d is string => d !== null);
                const actualEnds = buildingSections.map(s => s.actualEndDate).filter((d): d is string => d !== null);
                
                aggregatedDates = {
                  planStartDate: planStarts.length > 0 ? planStarts.reduce((a, b) => a < b ? a : b) : null,
                  planEndDate: planEnds.length > 0 ? planEnds.reduce((a, b) => a > b ? a : b) : null,
                  actualStartDate: actualStarts.length > 0 ? actualStarts.reduce((a, b) => a < b ? a : b) : null,
                  actualEndDate: actualEnds.length > 0 ? actualEnds.reduce((a, b) => a > b ? a : b) : null
                };
              }
              
              // Use aggregated dates only if they are not null, otherwise keep original work dates
              const finalDates = {
                planStartDate: aggregatedDates?.planStartDate ?? work.planStartDate,
                planEndDate: aggregatedDates?.planEndDate ?? work.planEndDate,
                actualStartDate: aggregatedDates?.actualStartDate ?? work.actualStartDate,
                actualEndDate: aggregatedDates?.actualEndDate ?? work.actualEndDate
              };
              
              treeWorks.push({
                ...work,
                ...finalDates,
                pdcName: pdcGroup.name,
                pdcUnit: pdcGroup.unit || "шт.",
                pdcQuantity: quantity,
                pdcCostWithVat: groupCostWithVat,
                executorName,
                sectionsCount,
                buildingSections
              });
              sectionProgress += work.progressPercentage;
              sectionWorkCount++;
            }

            treeGroups.push({
              id: pdcGroup.id,
              pdcGroupId: pdcGroup.id,
              number: `${docIndex}.${blockIndex}.${groupIndex}`,
              name: pdcGroup.name,
              unit: pdcGroup.unit || "шт.",
              quantity,
              costWithVat: groupCostWithVat,
              progressPercentage: work?.progressPercentage || 0,
              works: treeWorks
            });

            sectionCost += groupCostWithVat;
            groupIndex++;
          }

          const sectionAvgProgress = sectionWorkCount > 0 ? Math.round(sectionProgress / sectionWorkCount) : 0;
          treeSections.push({
            id: section.id,
            pdcSectionId: section.id,
            number: `${docIndex}.${blockIndex}`,
            name: section.name,
            description: section.description,
            progressPercentage: sectionAvgProgress,
            costWithVat: sectionCost,
            groups: treeGroups
          });

          blockProgress += sectionProgress;
          blockWorkCount += sectionWorkCount;
          blockCost += sectionCost;
          blockIndex++;
        }

        const blockAvgProgress = blockWorkCount > 0 ? Math.round(blockProgress / blockWorkCount) : 0;
        treeBlocks.push({
          id: block.id,
          pdcBlockId: block.id,
          number: `${docIndex}`,
          name: block.name,
          progressPercentage: blockAvgProgress,
          costWithVat: blockCost,
          sections: treeSections
        });

        docProgress += blockProgress;
        docWorkCount += blockWorkCount;
        docCost += blockCost;
        docIndex++;
      }

      const docAvgProgress = docWorkCount > 0 ? Math.round(docProgress / docWorkCount) : 0;
      result.push({
        id: doc.id,
        pdcDocumentId: doc.id,
        name: doc.name,
        headerText: doc.headerText,
        vatRate,
        sectionsCount: doc.sectionsCount || 1,
        progressPercentage: docAvgProgress,
        costWithVat: docCost,
        blocks: treeBlocks
      });
    }

    return result;
  }

  // === PROJECTS ===

  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects).where(isNull(projects.deletedAt)).orderBy(asc(projects.id));
  }

  async getProjectsForUser(userId: number): Promise<ProjectWithPermission[]> {
    const userPerms = await db.select().from(projectPermissions).where(eq(projectPermissions.userId, userId));
    const projectIds = userPerms.map(p => p.projectId);
    
    if (projectIds.length === 0) return [];
    
    const allProjects = await db.select().from(projects).where(isNull(projects.deletedAt));
    const result: ProjectWithPermission[] = [];
    
    for (const project of allProjects) {
      const perm = userPerms.find(p => p.projectId === project.id);
      if (perm) {
        result.push({ ...project, permission: perm });
      }
    }
    
    return result.sort((a, b) => a.id - b.id);
  }

  async getDeletedProjectsForUser(userId: number): Promise<Project[]> {
    const userPerms = await db.select().from(projectPermissions)
      .where(and(eq(projectPermissions.userId, userId), eq(projectPermissions.isOwner, true)));
    const ownerProjectIds = userPerms.map(p => p.projectId);
    
    if (ownerProjectIds.length === 0) return [];
    
    const allDeleted = await db.select().from(projects).where(sql`${projects.deletedAt} IS NOT NULL`);
    return allDeleted.filter(p => ownerProjectIds.includes(p.id)).sort((a, b) => a.id - b.id);
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(name: string, ownerId: number): Promise<Project> {
    const [newProject] = await db.insert(projects).values({ name }).returning();
    
    await db.insert(projectPermissions).values({
      userId: ownerId,
      projectId: newProject.id,
      isOwner: true,
      isAdmin: true,
      worksView: true,
      worksEdit: true,
      worksEditProgress: true,
      worksSeeAmounts: true,
      pdcView: true,
      pdcEdit: true,
      budgetView: true,
      budgetEdit: true,
      kspView: true,
      kspEdit: true,
      peopleView: true,
      peopleEdit: true,
      analyticsView: true,
      calendarView: true,
      calendarEdit: true
    });
    
    // Создаём базовые этапы для нового проекта
    await this.createDefaultStages(newProject.id);
    
    return newProject;
  }

  async updateProject(id: number, name: string): Promise<Project> {
    const [updated] = await db.update(projects).set({ name }).where(eq(projects.id, id)).returning();
    return updated;
  }

  async softDeleteProject(id: number): Promise<void> {
    await db.update(projects).set({ deletedAt: new Date() }).where(eq(projects.id, id));
  }

  async restoreProject(id: number): Promise<void> {
    await db.update(projects).set({ deletedAt: null }).where(eq(projects.id, id));
  }

  async hardDeleteProject(id: number): Promise<void> {
    await db.delete(projectPermissions).where(eq(projectPermissions.projectId, id));
    await db.delete(notifications).where(eq(notifications.projectId, id));
    await db.delete(pdcDocuments).where(eq(pdcDocuments.projectId, id));
    await db.delete(projects).where(eq(projects.id, id));
  }

  async duplicateProject(id: number, newName: string, userId: number): Promise<Project> {
    const sourceProject = await this.getProject(id);
    if (!sourceProject) throw new Error("Project not found");

    const [newProject] = await db.insert(projects).values({ name: newName }).returning();

    const sourcePerms = await db.select().from(projectPermissions).where(eq(projectPermissions.projectId, id));
    for (const perm of sourcePerms) {
      await db.insert(projectPermissions).values({
        ...perm,
        id: undefined,
        projectId: newProject.id,
        createdAt: undefined
      } as any);
    }

    const sourceDocs = await db.select().from(pdcDocuments).where(eq(pdcDocuments.projectId, id));
    const docIdMap = new Map<number, number>();
    
    for (const doc of sourceDocs) {
      const [newDoc] = await db.insert(pdcDocuments).values({
        projectId: newProject.id,
        name: doc.name,
        headerText: doc.headerText,
        vatRate: doc.vatRate,
        order: doc.order
      }).returning();
      docIdMap.set(doc.id, newDoc.id);
    }

    const sourceBlocks = await db.select().from(pdcBlocks);
    const blockIdMap = new Map<number, number>();
    
    for (const block of sourceBlocks) {
      const newDocId = docIdMap.get(block.documentId);
      if (newDocId) {
        const [newBlock] = await db.insert(pdcBlocks).values({
          documentId: newDocId,
          name: block.name,
          order: block.order
        }).returning();
        blockIdMap.set(block.id, newBlock.id);
      }
    }

    const sourceSections = await db.select().from(pdcSections);
    const sectionIdMap = new Map<number, number>();
    
    for (const section of sourceSections) {
      const newBlockId = blockIdMap.get(section.blockId);
      if (newBlockId) {
        const [newSection] = await db.insert(pdcSections).values({
          blockId: newBlockId,
          name: section.name,
          description: section.description,
          order: section.order
        }).returning();
        sectionIdMap.set(section.id, newSection.id);
      }
    }

    const sourceGroups = await db.select().from(pdcGroups);
    const groupIdMap = new Map<number, number>();
    
    for (const group of sourceGroups) {
      const newSectionId = sectionIdMap.get(group.sectionId);
      if (newSectionId) {
        const [newGroup] = await db.insert(pdcGroups).values({
          sectionId: newSectionId,
          name: group.name,
          unit: group.unit,
          quantity: group.quantity,
          smrPnrPrice: group.smrPnrPrice,
          order: group.order
        }).returning();
        groupIdMap.set(group.id, newGroup.id);
      }
    }

    const sourceElements = await db.select().from(pdcElements);
    for (const element of sourceElements) {
      const newGroupId = groupIdMap.get(element.groupId);
      if (newGroupId) {
        await db.insert(pdcElements).values({
          groupId: newGroupId,
          name: element.name,
          note: element.note,
          unit: element.unit,
          consumptionCoef: element.consumptionCoef,
          quantity: element.quantity,
          materialPrice: element.materialPrice,
          order: element.order
        });
      }
    }

    const sourceWorks = await db.select().from(works);
    const workIdMap = new Map<number, number>();
    
    for (const work of sourceWorks) {
      if (work.pdcGroupId) {
        const newPdcGroupId = groupIdMap.get(work.pdcGroupId);
        if (newPdcGroupId) {
          const [newWork] = await db.insert(works).values({
            ...work,
            id: undefined,
            pdcGroupId: newPdcGroupId,
            createdAt: undefined
          } as any).returning();
          workIdMap.set(work.id, newWork.id);
        }
      }
    }

    const sourceWorkPeople = await db.select().from(workPeople);
    for (const wp of sourceWorkPeople) {
      const newWorkId = workIdMap.get(wp.workId);
      if (newWorkId) {
        await db.insert(workPeople).values({
          workId: newWorkId,
          date: wp.date,
          count: wp.count
        });
      }
    }

    return newProject;
  }

  async cleanupDeletedProjects(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const toDelete = await db.select().from(projects)
      .where(and(
        sql`${projects.deletedAt} IS NOT NULL`,
        lt(projects.deletedAt, thirtyDaysAgo)
      ));
    
    for (const project of toDelete) {
      await this.hardDeleteProject(project.id);
    }
  }

  // === PROJECT PERMISSIONS ===

  async getProjectPermission(userId: number, projectId: number): Promise<ProjectPermission | undefined> {
    const [perm] = await db.select().from(projectPermissions)
      .where(and(eq(projectPermissions.userId, userId), eq(projectPermissions.projectId, projectId)));
    return perm;
  }

  async getProjectPermissionsForUser(userId: number): Promise<ProjectPermission[]> {
    return await db.select().from(projectPermissions)
      .where(eq(projectPermissions.userId, userId));
  }

  async getProjectPermissions(projectId: number): Promise<(ProjectPermission & { username: string })[]> {
    const perms = await db.select().from(projectPermissions).where(eq(projectPermissions.projectId, projectId));
    const result: (ProjectPermission & { username: string })[] = [];
    
    for (const perm of perms) {
      const user = await this.getUserById(perm.userId);
      if (user) {
        result.push({ ...perm, username: user.username });
      }
    }
    
    return result;
  }

  async setProjectPermission(permission: InsertProjectPermission): Promise<ProjectPermission> {
    const existing = await this.getProjectPermission(permission.userId, permission.projectId);
    
    if (existing) {
      const [updated] = await db.update(projectPermissions)
        .set(permission)
        .where(eq(projectPermissions.id, existing.id))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(projectPermissions).values(permission).returning();
    return created;
  }

  async updateProjectPermission(id: number, updates: Partial<InsertProjectPermission>): Promise<ProjectPermission> {
    const [updated] = await db.update(projectPermissions).set(updates).where(eq(projectPermissions.id, id)).returning();
    return updated;
  }

  async deleteProjectPermission(userId: number, projectId: number): Promise<void> {
    await db.delete(projectPermissions)
      .where(and(eq(projectPermissions.userId, userId), eq(projectPermissions.projectId, projectId)));
  }

  async isProjectOwner(userId: number, projectId: number): Promise<boolean> {
    const perm = await this.getProjectPermission(userId, projectId);
    return perm?.isOwner === true;
  }

  async isProjectAdmin(userId: number, projectId: number): Promise<boolean> {
    const perm = await this.getProjectPermission(userId, projectId);
    return perm?.isAdmin === true || perm?.isOwner === true;
  }

  async transferOwnership(projectId: number, fromUserId: number, toUserId: number): Promise<void> {
    const fifteenDaysFromNow = new Date();
    fifteenDaysFromNow.setDate(fifteenDaysFromNow.getDate() + 15);
    
    await db.update(projectPermissions)
      .set({ ownerExpiresAt: fifteenDaysFromNow })
      .where(and(eq(projectPermissions.userId, fromUserId), eq(projectPermissions.projectId, projectId)));
    
    await db.update(projectPermissions)
      .set({ isOwner: true, isAdmin: true })
      .where(and(eq(projectPermissions.userId, toUserId), eq(projectPermissions.projectId, projectId)));
  }

  async processExpiredOwners(): Promise<void> {
    const now = new Date();
    const expiredPerms = await db.select().from(projectPermissions)
      .where(and(
        eq(projectPermissions.isOwner, true),
        sql`${projectPermissions.ownerExpiresAt} IS NOT NULL`,
        lt(projectPermissions.ownerExpiresAt, now)
      ));
    
    for (const perm of expiredPerms) {
      await db.update(projectPermissions)
        .set({ isOwner: false, ownerExpiresAt: null })
        .where(eq(projectPermissions.id, perm.id));
    }
  }

  // === NOTIFICATIONS ===

  async getNotifications(userId: number): Promise<(Notification & { projectName: string | null })[]> {
    const result = await db.select({
      id: notifications.id,
      userId: notifications.userId,
      projectId: notifications.projectId,
      type: notifications.type,
      message: notifications.message,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
      projectName: projects.name,
    })
    .from(notifications)
    .leftJoin(projects, eq(notifications.projectId, projects.id))
    .where(eq(notifications.userId, userId))
    .orderBy(sql`${notifications.createdAt} DESC`);
    return result;
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    const unread = await db.select().from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return unread.length;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async markNotificationsAsRead(userId: number): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
  }

  async cleanupOldNotifications(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    await db.delete(notifications).where(lt(notifications.createdAt, thirtyDaysAgo));
  }

  // === CLASSIFIER CODES ===

  async getClassifierCodes(): Promise<ClassifierCode[]> {
    return await db.select().from(classifierCodes).orderBy(asc(classifierCodes.orderIndex), asc(classifierCodes.id));
  }

  async getClassifierCode(id: number): Promise<ClassifierCode | undefined> {
    const [code] = await db.select().from(classifierCodes).where(eq(classifierCodes.id, id));
    return code;
  }

  async createClassifierCode(code: InsertClassifierCode): Promise<ClassifierCode> {
    const siblings = await db.select().from(classifierCodes)
      .where(code.parentId ? eq(classifierCodes.parentId, code.parentId) : isNull(classifierCodes.parentId));
    const maxOrder = Math.max(...siblings.map(s => s.orderIndex), -1);
    
    const [created] = await db.insert(classifierCodes).values({
      ...code,
      orderIndex: maxOrder + 1
    }).returning();
    return created;
  }

  async updateClassifierCode(id: number, updates: Partial<InsertClassifierCode>): Promise<ClassifierCode> {
    const [updated] = await db.update(classifierCodes).set(updates).where(eq(classifierCodes.id, id)).returning();
    return updated;
  }

  async deleteClassifierCode(id: number): Promise<void> {
    const collectChildIds = async (parentId: number): Promise<number[]> => {
      const children = await db.select().from(classifierCodes).where(eq(classifierCodes.parentId, parentId));
      let ids: number[] = [];
      for (const child of children) {
        ids.push(child.id);
        const grandChildren = await collectChildIds(child.id);
        ids = ids.concat(grandChildren);
      }
      return ids;
    };

    const childIds = await collectChildIds(id);
    const allIds = [id, ...childIds];
    
    for (const delId of allIds.reverse()) {
      await db.delete(classifierCodes).where(eq(classifierCodes.id, delId));
    }
  }

  async reorderClassifierCode(id: number, direction: 'up' | 'down'): Promise<void> {
    const code = await this.getClassifierCode(id);
    if (!code) return;

    const siblings = await db.select().from(classifierCodes)
      .where(code.parentId ? eq(classifierCodes.parentId, code.parentId) : isNull(classifierCodes.parentId))
      .orderBy(asc(classifierCodes.orderIndex), asc(classifierCodes.id));

    const currentIndex = siblings.findIndex(s => s.id === id);
    if (currentIndex === -1) return;

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= siblings.length) return;

    const swapWith = siblings[swapIndex];
    await db.update(classifierCodes).set({ orderIndex: swapWith.orderIndex }).where(eq(classifierCodes.id, id));
    await db.update(classifierCodes).set({ orderIndex: code.orderIndex }).where(eq(classifierCodes.id, swapWith.id));
  }

  async duplicateClassifierCodeWithChildren(id: number): Promise<ClassifierCode[]> {
    const allCodes = await this.getClassifierCodes();
    const codeMap = new Map<number, ClassifierCode>();
    allCodes.forEach(c => codeMap.set(c.id, c));

    const original = codeMap.get(id);
    if (!original) return [];

    const createdCodes: ClassifierCode[] = [];

    const duplicateRecursive = async (originalId: number, newParentId: number | null): Promise<void> => {
      const orig = codeMap.get(originalId);
      if (!orig) return;

      const isRoot = originalId === id;
      const newCode = await this.createClassifierCode({
        type: orig.type as "article" | "zone" | "element" | "detail",
        name: orig.name,
        cipher: isRoot ? orig.cipher + "_копия" : orig.cipher,
        parentId: newParentId,
      });
      createdCodes.push(newCode);

      const children = allCodes.filter(c => c.parentId === originalId);
      for (const child of children) {
        await duplicateRecursive(child.id, newCode.id);
      }
    };

    await duplicateRecursive(id, original.parentId);
    return createdCodes;
  }

  // === STAGES (Этапы проекта) ===

  async getStages(projectId: number): Promise<Stage[]> {
    return await db.select().from(stages)
      .where(eq(stages.projectId, projectId))
      .orderBy(asc(stages.order), asc(stages.id));
  }

  async createStage(stage: InsertStage): Promise<Stage> {
    const existingStages = await db.select().from(stages)
      .where(eq(stages.projectId, stage.projectId));
    const maxOrder = Math.max(...existingStages.map(s => s.order ?? 0), -1);
    
    const [newStage] = await db.insert(stages).values({
      ...stage,
      order: maxOrder + 1
    }).returning();
    return newStage;
  }

  async updateStage(id: number, updates: Partial<InsertStage>): Promise<Stage> {
    const [updated] = await db.update(stages).set(updates).where(eq(stages.id, id)).returning();
    return updated;
  }

  async deleteStage(id: number): Promise<void> {
    // При удалении этапа, документы ПДЦ сбрасывают stageId на null (ON DELETE SET NULL)
    await db.delete(stages).where(eq(stages.id, id));
  }

  async createDefaultStages(projectId: number): Promise<Stage[]> {
    const [stage1] = await db.insert(stages).values({
      projectId,
      name: "Этап 1",
      order: 0
    }).returning();
    
    const [stage2] = await db.insert(stages).values({
      projectId,
      name: "Этап 2",
      order: 1
    }).returning();
    
    return [stage1, stage2];
  }

  // === EXECUTORS (Исполнители проекта) ===

  async getExecutors(projectId: number): Promise<Executor[]> {
    return await db.select().from(executors)
      .where(eq(executors.projectId, projectId))
      .orderBy(asc(executors.order), asc(executors.id));
  }

  async createExecutor(executor: InsertExecutor): Promise<Executor> {
    const existingExecutors = await db.select().from(executors)
      .where(eq(executors.projectId, executor.projectId));
    const maxOrder = Math.max(...existingExecutors.map(e => e.order ?? 0), -1);
    
    const [newExecutor] = await db.insert(executors).values({
      ...executor,
      order: maxOrder + 1
    }).returning();
    return newExecutor;
  }

  async updateExecutor(id: number, updates: Partial<InsertExecutor>): Promise<Executor> {
    const [updated] = await db.update(executors).set(updates).where(eq(executors.id, id)).returning();
    return updated;
  }

  async deleteExecutor(id: number): Promise<void> {
    await db.delete(executors).where(eq(executors.id, id));
  }

  // === PRICE CHANGES (История изменений цен) ===

  async getPriceHistory(params: { groupId?: number; elementId?: number; priceType: string }): Promise<PriceChangeWithUser[]> {
    const conditions = [eq(priceChanges.priceType, params.priceType)];
    
    if (params.groupId) {
      conditions.push(eq(priceChanges.groupId, params.groupId));
    }
    if (params.elementId) {
      conditions.push(eq(priceChanges.elementId, params.elementId));
    }

    const history = await db.select({
      id: priceChanges.id,
      groupId: priceChanges.groupId,
      elementId: priceChanges.elementId,
      priceType: priceChanges.priceType,
      price: priceChanges.price,
      reason: priceChanges.reason,
      userId: priceChanges.userId,
      createdAt: priceChanges.createdAt,
      user: {
        id: users.id,
        username: users.username,
      },
    })
    .from(priceChanges)
    .leftJoin(users, eq(priceChanges.userId, users.id))
    .where(and(...conditions))
    .orderBy(asc(priceChanges.createdAt));

    return history.map(h => ({
      ...h,
      user: h.user?.id ? h.user : null,
    }));
  }

  async createPriceChange(change: InsertPriceChange): Promise<PriceChange> {
    const [newChange] = await db.insert(priceChanges).values(change).returning();
    return newChange;
  }

  async getInitialPricesForDocument(documentId: number): Promise<{ groupId?: number; elementId?: number; priceType: string; initialPrice: string }[]> {
    // Get all groups and elements for this document
    const doc = await db.query.pdcDocuments.findFirst({
      where: eq(pdcDocuments.id, documentId),
      with: {
        blocks: {
          with: {
            sections: {
              with: {
                groups: {
                  with: {
                    elements: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!doc) return [];

    const groupIds: number[] = [];
    const elementIds: number[] = [];

    doc.blocks?.forEach(block => {
      block.sections?.forEach(section => {
        section.groups?.forEach(group => {
          groupIds.push(group.id);
          group.elements?.forEach(element => {
            elementIds.push(element.id);
          });
        });
      });
    });

    if (groupIds.length === 0 && elementIds.length === 0) return [];

    // Get earliest price change for each group/element
    const conditions = [];
    if (groupIds.length > 0) {
      conditions.push(inArray(priceChanges.groupId, groupIds));
    }
    if (elementIds.length > 0) {
      conditions.push(inArray(priceChanges.elementId, elementIds));
    }

    // or() requires at least 2 args, handle single condition case
    const whereClause = conditions.length === 1 ? conditions[0] : or(...conditions);

    const allChanges = await db.select()
      .from(priceChanges)
      .where(whereClause)
      .orderBy(asc(priceChanges.createdAt));

    // Find earliest (first) price for each group/element + priceType combination
    const initialPricesMap = new Map<string, { groupId?: number; elementId?: number; priceType: string; initialPrice: string }>();

    allChanges.forEach(change => {
      const key = `${change.groupId || ''}-${change.elementId || ''}-${change.priceType}`;
      if (!initialPricesMap.has(key)) {
        initialPricesMap.set(key, {
          groupId: change.groupId ?? undefined,
          elementId: change.elementId ?? undefined,
          priceType: change.priceType,
          initialPrice: change.price,
        });
      }
    });

    return Array.from(initialPricesMap.values());
  }

  // === SECTION ALLOCATIONS ===

  async getSectionAllocations(params: { groupId?: number; elementId?: number }): Promise<SectionAllocation[]> {
    const conditions = [];
    if (params.groupId !== undefined) {
      conditions.push(eq(sectionAllocations.groupId, params.groupId));
    }
    if (params.elementId !== undefined) {
      conditions.push(eq(sectionAllocations.elementId, params.elementId));
    }
    
    if (conditions.length === 0) return [];
    
    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
    
    return await db.select()
      .from(sectionAllocations)
      .where(whereClause)
      .orderBy(asc(sectionAllocations.sectionNumber));
  }

  async upsertSectionAllocations(allocations: InsertSectionAllocation[]): Promise<void> {
    for (const allocation of allocations) {
      // Find existing allocation
      const conditions = [eq(sectionAllocations.sectionNumber, allocation.sectionNumber)];
      if (allocation.groupId) {
        conditions.push(eq(sectionAllocations.groupId, allocation.groupId));
      }
      if (allocation.elementId) {
        conditions.push(eq(sectionAllocations.elementId, allocation.elementId));
      }
      
      const existing = await db.select()
        .from(sectionAllocations)
        .where(and(...conditions))
        .limit(1);
      
      if (existing.length > 0) {
        // Update existing
        await db.update(sectionAllocations)
          .set({ coefficient: allocation.coefficient, quantity: allocation.quantity })
          .where(eq(sectionAllocations.id, existing[0].id));
      } else {
        // Insert new
        await db.insert(sectionAllocations).values(allocation);
      }
    }
  }

  async deleteSectionAllocations(params: { groupId?: number; elementId?: number; sectionNumber?: number }): Promise<void> {
    const conditions = [];
    if (params.groupId !== undefined) {
      conditions.push(eq(sectionAllocations.groupId, params.groupId));
    }
    if (params.elementId !== undefined) {
      conditions.push(eq(sectionAllocations.elementId, params.elementId));
    }
    if (params.sectionNumber !== undefined) {
      conditions.push(eq(sectionAllocations.sectionNumber, params.sectionNumber));
    }
    
    if (conditions.length === 0) return;
    
    await db.delete(sectionAllocations).where(and(...conditions));
  }
}

export const storage = new DatabaseStorage();
