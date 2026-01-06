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
  type WorkPeople
} from "@shared/schema";
import { eq, and, isNull, asc } from "drizzle-orm";
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
  upsertWorkPeople(workId: number, date: string, count: number): Promise<WorkPeople>;
  deleteWorkPeople(id: number): Promise<void>;

  // Admin initialization
  initializeAdmin(): Promise<void>;
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
    // First delete associated works to avoid constraint violation if not set to cascade (though default mostly isn't)
    await db.delete(works).where(eq(works.groupId, id));
    await db.delete(workGroups).where(eq(workGroups.id, id));
  }

  async createWork(work: InsertWork): Promise<Work> {
    // Get the next order value for this group
    const groupWorks = await db.select().from(works).where(eq(works.groupId, work.groupId));
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

  async getWork(id: number): Promise<Work | undefined> {
    const [work] = await db.select().from(works).where(eq(works.id, id));
    return work;
  }

  async moveWorkUp(id: number): Promise<void> {
    const work = await this.getWork(id);
    if (!work) return;
    
    const [prevWork] = await db.select().from(works)
      .where(and(eq(works.groupId, work.groupId), eq(works.order, work.order - 1)))
      .limit(1);
    
    if (prevWork) {
      await this.updateWork(work.id, { order: work.order - 1 });
      await this.updateWork(prevWork.id, { order: prevWork.order + 1 });
    }
  }

  async moveWorkDown(id: number): Promise<void> {
    const work = await this.getWork(id);
    if (!work) return;
    
    const [nextWork] = await db.select().from(works)
      .where(and(eq(works.groupId, work.groupId), eq(works.order, work.order + 1)))
      .limit(1);
    
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

  async upsertWorkPeople(workId: number, date: string, count: number): Promise<WorkPeople> {
    const existing = await db.select().from(workPeople)
      .where(and(eq(workPeople.workId, workId), eq(workPeople.date, date)));
    
    if (existing.length > 0) {
      const [updated] = await db.update(workPeople)
        .set({ count })
        .where(eq(workPeople.id, existing[0].id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(workPeople)
        .values({ workId, date, count })
        .returning();
      return created;
    }
  }

  async deleteWorkPeople(id: number): Promise<void> {
    await db.delete(workPeople).where(eq(workPeople.id, id));
  }
}

export const storage = new DatabaseStorage();
