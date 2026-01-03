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
  type InsertPermission
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
    try {
      // Check if admin already exists
      const existingAdmin = await this.getUserByUsername("GaisinMF");
      if (existingAdmin) {
        console.log("Admin user already exists");
        return;
      }
      
      // Create the admin user
      await this.createUser("GaisinMF", "nhu!P3nG@-", true);
      console.log("Admin user GaisinMF created successfully");
    } catch (error) {
      console.error("Error initializing admin user:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
