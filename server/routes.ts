import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
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

  // Seed Data
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const groups = await storage.getWorkGroupsWithWorks();
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
  }
}
