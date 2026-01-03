import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // === Blocks ===
  
  app.get(api.blocks.list.path, async (_req, res) => {
    const blocksList = await storage.getBlocksWithGroupsAndWorks();
    res.json(blocksList);
  });

  app.get(api.blocks.unassignedGroups.path, async (_req, res) => {
    const groups = await storage.getUnassignedGroups();
    res.json(groups);
  });

  app.post(api.blocks.create.path, async (req, res) => {
    try {
      const input = api.blocks.create.input.parse(req.body);
      const block = await storage.createBlock(input);
      res.status(201).json(block);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.blocks.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.blocks.update.input.parse(req.body);
      const updated = await storage.updateBlock(id, input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.blocks.delete.path, async (req, res) => {
    await storage.deleteBlock(Number(req.params.id));
    res.status(204).send();
  });

  // === Work Groups ===
  
  app.get(api.workGroups.list.path, async (_req, res) => {
    const groups = await storage.getWorkGroupsWithWorks();
    res.json(groups);
  });

  app.post(api.workGroups.create.path, async (req, res) => {
    try {
      const input = api.workGroups.create.input.parse(req.body);
      const group = await storage.createWorkGroup(input);
      res.status(201).json(group);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.workGroups.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.workGroups.update.input.parse(req.body);
      const updated = await storage.updateWorkGroup(id, input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.workGroups.delete.path, async (req, res) => {
    await storage.deleteWorkGroup(Number(req.params.id));
    res.status(204).send();
  });

  // === Works ===

  app.post(api.works.create.path, async (req, res) => {
    try {
      const input = api.works.create.input.parse(req.body);
      const work = await storage.createWork(input);
      res.status(201).json(work);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.works.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.works.update.input.parse(req.body);
      
      const existing = await storage.getWork(id);
      if (!existing) {
        return res.status(404).json({ message: "Work not found" });
      }

      const updated = await storage.updateWork(id, input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.post(api.works.moveUp.path, async (req, res) => {
    const id = Number(req.params.id);
    const existing = await storage.getWork(id);
    if (!existing) {
      return res.status(404).json({ message: "Work not found" });
    }
    await storage.moveWorkUp(id);
    res.status(204).send();
  });

  app.post(api.works.moveDown.path, async (req, res) => {
    const id = Number(req.params.id);
    const existing = await storage.getWork(id);
    if (!existing) {
      return res.status(404).json({ message: "Work not found" });
    }
    await storage.moveWorkDown(id);
    res.status(204).send();
  });

  app.delete(api.works.delete.path, async (req, res) => {
    const id = Number(req.params.id);
    const existing = await storage.getWork(id);
    if (!existing) {
      return res.status(404).json({ message: "Work not found" });
    }
    await storage.deleteWork(id);
    res.status(204).send();
  });

  // === Holidays ===

  app.get(api.holidays.list.path, async (_req, res) => {
    const holidaysList = await storage.getHolidays();
    res.json(holidaysList);
  });

  app.post(api.holidays.create.path, async (req, res) => {
    try {
      const input = api.holidays.create.input.parse(req.body);
      const holiday = await storage.createHoliday(input);
      res.status(201).json(holiday);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.post(api.holidays.toggle.path, async (req, res) => {
    try {
      const { date } = api.holidays.toggle.input.parse(req.body);
      const existing = await storage.getHolidayByDate(date);
      
      if (existing) {
        await storage.deleteHolidayByDate(date);
        res.json({ isHoliday: false });
      } else {
        await storage.createHoliday({ date });
        res.json({ isHoliday: true });
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.holidays.delete.path, async (req, res) => {
    await storage.deleteHoliday(Number(req.params.id));
    res.status(204).send();
  });

  // === Contracts (Budgets) ===

  app.get('/api/contracts', async (_req, res) => {
    const contractsList = await storage.getContracts();
    res.json(contractsList);
  });

  app.get('/api/contracts/:id', async (req, res) => {
    const contract = await storage.getContractWithData(Number(req.params.id));
    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }
    res.json(contract);
  });

  app.post('/api/contracts', async (req, res) => {
    try {
      const contract = await storage.createContract(req.body);
      res.status(201).json(contract);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put('/api/contracts/:id', async (req, res) => {
    try {
      const updated = await storage.updateContract(Number(req.params.id), req.body);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.delete('/api/contracts/:id', async (req, res) => {
    await storage.deleteContract(Number(req.params.id));
    res.status(204).send();
  });

  // === Budget Columns ===

  app.get('/api/contracts/:contractId/columns', async (req, res) => {
    const columns = await storage.getBudgetColumns(Number(req.params.contractId));
    res.json(columns);
  });

  app.post('/api/budget-columns', async (req, res) => {
    try {
      const column = await storage.createBudgetColumn(req.body);
      res.status(201).json(column);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put('/api/budget-columns/:id', async (req, res) => {
    try {
      const updated = await storage.updateBudgetColumn(Number(req.params.id), req.body);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.delete('/api/budget-columns/:id', async (req, res) => {
    await storage.deleteBudgetColumn(Number(req.params.id));
    res.status(204).send();
  });

  // === Budget Rows ===

  app.get('/api/contracts/:contractId/rows', async (req, res) => {
    const rows = await storage.getBudgetRows(Number(req.params.contractId));
    res.json(rows);
  });

  app.post('/api/budget-rows', async (req, res) => {
    try {
      const row = await storage.createBudgetRow(req.body);
      res.status(201).json(row);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put('/api/budget-rows/:id', async (req, res) => {
    try {
      const updated = await storage.updateBudgetRow(Number(req.params.id), req.body);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.delete('/api/budget-rows/:id', async (req, res) => {
    await storage.deleteBudgetRow(Number(req.params.id));
    res.status(204).send();
  });

  app.put('/api/budget-rows/:id/reorder', async (req, res) => {
    try {
      const direction = req.body.direction as 'up' | 'down';
      await storage.reorderBudgetRow(Number(req.params.id), direction);
      res.status(200).json({ success: true });
    } catch (err) {
      throw err;
    }
  });

  // === Budget Values ===

  app.get('/api/budget-rows/:rowId/values', async (req, res) => {
    const values = await storage.getBudgetValues(Number(req.params.rowId));
    res.json(values);
  });

  app.post('/api/budget-values', async (req, res) => {
    try {
      const value = await storage.upsertBudgetValue(req.body);
      res.status(201).json(value);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.delete('/api/budget-values/:id', async (req, res) => {
    await storage.deleteBudgetValue(Number(req.params.id));
    res.status(204).send();
  });

  // Seed Data
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const groups = await storage.getWorkGroupsWithWorks();
  // Check if we need to reinitialize order values for existing data
  const needsReorder = groups.some(g => g.works.some(w => w.order === 0) && g.works.length > 1);
  
  if (groups.length === 0) {
    console.log("Seeding database...");
    
    const group1 = await storage.createWorkGroup({ name: "Подготовительные работы" });
    await storage.createWork({
      groupId: group1.id,
      name: "Ограждение территории",
      daysEstimated: 5,
      volumeAmount: 150,
      volumeUnit: "п.м",
      progressPercentage: 100,
      responsiblePerson: "Иванов И.И."
    });
    await storage.createWork({
      groupId: group1.id,
      name: "Устройство бытового городка",
      daysEstimated: 3,
      volumeAmount: 1,
      volumeUnit: "компл",
      progressPercentage: 80,
      responsiblePerson: "Петров П.П."
    });

    const group2 = await storage.createWorkGroup({ name: "Земляные работы" });
    await storage.createWork({
      groupId: group2.id,
      name: "Разработка грунта экскаватором",
      daysEstimated: 10,
      volumeAmount: 500,
      volumeUnit: "м3",
      progressPercentage: 45,
      responsiblePerson: "Сидоров С.С."
    });
    await storage.createWork({
      groupId: group2.id,
      name: "Ручная доработка грунта",
      daysEstimated: 4,
      volumeAmount: 50,
      volumeUnit: "м3",
      progressPercentage: 10,
      responsiblePerson: "Сидоров С.С."
    });

    const group3 = await storage.createWorkGroup({ name: "Фундамент" });
    await storage.createWork({
      groupId: group3.id,
      name: "Устройство бетонной подготовки",
      daysEstimated: 6,
      volumeAmount: 120,
      volumeUnit: "м2",
      progressPercentage: 0,
      responsiblePerson: "Козлов К.К."
    });

    console.log("Database seeded!");
  } else if (needsReorder) {
    console.log("Reinitializing order values...");
    for (const group of groups) {
      for (let i = 0; i < group.works.length; i++) {
        await storage.updateWork(group.works[i].id, { order: i });
      }
    }
    console.log("Order values reinitialized!");
  }
}
