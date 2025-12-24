import { db } from "./db";
import {
  works,
  workGroups,
  holidays,
  type Work,
  type WorkGroup,
  type Holiday,
  type InsertWork,
  type InsertWorkGroup,
  type InsertHoliday,
  type UpdateWorkRequest
} from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // Work Groups
  getWorkGroupsWithWorks(): Promise<(WorkGroup & { works: Work[] })[]>;
  createWorkGroup(group: InsertWorkGroup): Promise<WorkGroup>;
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
}

export class DatabaseStorage implements IStorage {
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
    const [newGroup] = await db.insert(workGroups).values(group).returning();
    return newGroup;
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
}

export const storage = new DatabaseStorage();
