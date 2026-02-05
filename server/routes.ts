import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { requireAuth, requireAdmin } from "./auth";
import { db } from "./db";
import { stages, executors, workMaterialProgressHistory, pdcGroups, pdcSections, pdcBlocks, pdcDocuments } from "@shared/schema";
import { eq } from "drizzle-orm";

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

  // Get works tree (PDC-based hierarchy)
  app.get("/api/works/tree", async (_req, res) => {
    try {
      const tree = await storage.getWorksTree();
      res.json(tree);
    } catch (err) {
      console.error("Error getting works tree:", err);
      res.status(500).json({ message: "Failed to get works tree" });
    }
  });

  // Get materials for a work item
  app.get("/api/works/:id/materials", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const materials = await storage.getWorkMaterials(id);
      res.json(materials);
    } catch (err) {
      console.error("Error getting work materials:", err);
      res.status(500).json({ message: "Failed to get work materials" });
    }
  });

  // Get material progress for a work item
  app.get("/api/works/:id/material-progress", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const progress = await storage.getWorkMaterialProgress(id);
      res.json(progress);
    } catch (err) {
      console.error("Error getting work material progress:", err);
      res.status(500).json({ message: "Failed to get work material progress" });
    }
  });

  // Validation schema for material progress update
  const updateMaterialProgressSchema = z.object({
    pdcElementId: z.number().int().positive(),
    sectionNumber: z.number().int().positive(),
    quantityClosed: z.string().optional(),
    costClosed: z.string().optional(),
  });

  // Update material progress for a work item
  app.post("/api/works/:id/material-progress", async (req, res) => {
    try {
      const workId = Number(req.params.id);
      const parsed = updateMaterialProgressSchema.parse(req.body);
      
      const progress = await storage.upsertWorkMaterialProgress(
        workId,
        parsed.pdcElementId,
        parsed.sectionNumber,
        { quantityClosed: parsed.quantityClosed, costClosed: parsed.costClosed }
      );
      res.json(progress);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error("Error updating work material progress:", err);
      res.status(500).json({ message: "Failed to update work material progress" });
    }
  });

  // Get material progress history
  app.get("/api/works/:workId/material-progress-history", async (req, res) => {
    try {
      const workId = Number(req.params.workId);
      const pdcElementId = Number(req.query.pdcElementId);
      const sectionNumber = Number(req.query.sectionNumber) || 1;
      
      if (!pdcElementId) {
        return res.status(400).json({ message: "pdcElementId is required" });
      }
      
      const history = await storage.getWorkMaterialProgressHistory(workId, pdcElementId, sectionNumber);
      res.json(history);
    } catch (err) {
      console.error("Error getting material progress history:", err);
      res.status(500).json({ message: "Failed to get material progress history" });
    }
  });

  // Add material progress history entry (and update totals)
  const addHistorySchema = z.object({
    pdcElementId: z.number().int().positive(),
    sectionNumber: z.number().int().positive().default(1),
    type: z.enum(['quantity', 'cost']),
    value: z.string(),
    unit: z.string().optional().nullable(),
  });

  app.post("/api/works/:workId/material-progress-history", async (req, res) => {
    try {
      const workId = Number(req.params.workId);
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const parsed = addHistorySchema.parse(req.body);
      
      // Add history entry
      const history = await storage.addWorkMaterialProgressHistory({
        workId,
        pdcElementId: parsed.pdcElementId,
        sectionNumber: parsed.sectionNumber,
        type: parsed.type,
        value: parsed.value,
        unit: parsed.unit || null,
        userId,
      });
      
      // Get current progress values
      const currentProgress = await storage.getWorkMaterialProgress(workId);
      const existing = currentProgress.find(
        p => p.pdcElementId === parsed.pdcElementId && p.sectionNumber === parsed.sectionNumber
      );
      
      // Calculate new total
      const newValue = parseFloat(parsed.value) || 0;
      let quantityClosed = existing?.quantityClosed || "0";
      let costClosed = existing?.costClosed || "0";
      
      if (parsed.type === 'quantity') {
        quantityClosed = (parseFloat(quantityClosed) + newValue).toString();
      } else {
        costClosed = (parseFloat(costClosed) + newValue).toString();
      }
      
      // Update progress totals
      await storage.upsertWorkMaterialProgress(
        workId,
        parsed.pdcElementId,
        parsed.sectionNumber,
        { quantityClosed, costClosed }
      );
      
      res.status(201).json(history);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error("Error adding material progress history:", err);
      res.status(500).json({ message: "Failed to add material progress history" });
    }
  });

  // Delete material progress history entry (and update totals)
  app.delete("/api/material-progress-history/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Get the history entry before deleting
      const allHistory = await db.select().from(workMaterialProgressHistory).where(eq(workMaterialProgressHistory.id, id));
      if (allHistory.length === 0) {
        return res.status(404).json({ message: "History entry not found" });
      }
      
      const entry = allHistory[0];
      
      // Get the work item to find the project through PDC chain
      const work = await storage.getWork(entry.workId);
      if (!work) {
        return res.status(404).json({ message: "Work not found" });
      }
      
      // Get project ID through PDC chain: work -> pdcGroup -> pdcSection -> pdcBlock -> pdcDocument -> projectId
      let projectId: number | null = null;
      if (work.pdcGroupId) {
        const [pdcGroup] = await db.select().from(pdcGroups).where(eq(pdcGroups.id, work.pdcGroupId));
        if (pdcGroup) {
          const [pdcSection] = await db.select().from(pdcSections).where(eq(pdcSections.id, pdcGroup.sectionId));
          if (pdcSection) {
            const [pdcBlock] = await db.select().from(pdcBlocks).where(eq(pdcBlocks.id, pdcSection.blockId));
            if (pdcBlock) {
              const [pdcDocument] = await db.select().from(pdcDocuments).where(eq(pdcDocuments.id, pdcBlock.documentId));
              if (pdcDocument) {
                projectId = pdcDocument.projectId;
              }
            }
          }
        }
      }
      
      if (!projectId) {
        return res.status(404).json({ message: "Could not determine project for this work" });
      }
      
      // Check if user is project owner
      const isOwner = await storage.isProjectOwner(userId, projectId);
      if (!isOwner) {
        return res.status(403).json({ message: "Only project owner can delete history entries" });
      }
      
      // Subtract value from totals
      const currentProgress = await storage.getWorkMaterialProgress(entry.workId);
      const existing = currentProgress.find(
        p => p.pdcElementId === entry.pdcElementId && p.sectionNumber === entry.sectionNumber
      );
      
      if (existing) {
        let quantityClosed = existing.quantityClosed || "0";
        let costClosed = existing.costClosed || "0";
        const entryValue = parseFloat(entry.value) || 0;
        
        if (entry.type === 'quantity') {
          quantityClosed = Math.max(0, parseFloat(quantityClosed) - entryValue).toString();
        } else {
          costClosed = Math.max(0, parseFloat(costClosed) - entryValue).toString();
        }
        
        await storage.upsertWorkMaterialProgress(
          entry.workId,
          entry.pdcElementId,
          entry.sectionNumber,
          { quantityClosed, costClosed }
        );
      }
      
      // Delete the history entry
      await storage.deleteWorkMaterialProgressHistory(id);
      
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting material progress history:", err);
      res.status(500).json({ message: "Failed to delete material progress history" });
    }
  });

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

  // === Classifier Codes ===

  app.get('/api/classifier-codes', async (_req, res) => {
    const codes = await storage.getClassifierCodes();
    res.json(codes);
  });

  app.get('/api/classifier-codes/:id', async (req, res) => {
    const code = await storage.getClassifierCode(Number(req.params.id));
    if (!code) {
      return res.status(404).json({ message: "Classifier code not found" });
    }
    res.json(code);
  });

  app.post('/api/classifier-codes', requireAuth, async (req, res) => {
    try {
      const code = await storage.createClassifierCode(req.body);
      res.status(201).json(code);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put('/api/classifier-codes/:id', requireAuth, async (req, res) => {
    try {
      const updated = await storage.updateClassifierCode(Number(req.params.id), req.body);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.delete('/api/classifier-codes/:id', requireAuth, async (req, res) => {
    await storage.deleteClassifierCode(Number(req.params.id));
    res.status(204).send();
  });

  app.post('/api/classifier-codes/:id/reorder', requireAuth, async (req, res) => {
    const { direction } = req.body;
    if (direction !== 'up' && direction !== 'down') {
      return res.status(400).json({ message: "Invalid direction" });
    }
    await storage.reorderClassifierCode(Number(req.params.id), direction);
    res.json({ success: true });
  });

  app.post('/api/classifier-codes/:id/duplicate', requireAuth, async (req, res) => {
    const result = await storage.duplicateClassifierCodeWithChildren(Number(req.params.id));
    res.json(result);
  });

  // === Stages (Этапы проекта) ===

  app.get('/api/projects/:projectId/stages', requireAuth, async (req, res) => {
    const stagesList = await storage.getStages(Number(req.params.projectId));
    res.json(stagesList);
  });

  app.post('/api/projects/:projectId/stages', requireAuth, async (req, res) => {
    const user = req.user as any;
    const projectId = Number(req.params.projectId);
    
    // Проверяем права (только Owner/Admin)
    const perm = await storage.getProjectPermission(user.id, projectId);
    if (!perm || (!perm.isOwner && !perm.isAdmin)) {
      return res.status(403).json({ message: "Только владелец или администратор может управлять этапами" });
    }
    
    const stage = await storage.createStage({
      projectId,
      name: req.body.name || "Новый этап"
    });
    res.status(201).json(stage);
  });

  app.put('/api/stages/:id', requireAuth, async (req, res) => {
    const user = req.user as any;
    const stageId = Number(req.params.id);
    
    // Получаем stage чтобы узнать projectId
    const allStages = await db.select().from(stages).where(eq(stages.id, stageId));
    const stage = allStages[0];
    if (!stage) {
      return res.status(404).json({ message: "Этап не найден" });
    }
    
    // Проверяем права (только Owner/Admin)
    const perm = await storage.getProjectPermission(user.id, stage.projectId);
    if (!perm || (!perm.isOwner && !perm.isAdmin)) {
      return res.status(403).json({ message: "Только владелец или администратор может управлять этапами" });
    }
    
    const updated = await storage.updateStage(stageId, req.body);
    res.json(updated);
  });

  app.delete('/api/stages/:id', requireAuth, async (req, res) => {
    const user = req.user as any;
    const stageId = Number(req.params.id);
    
    // Получаем stage чтобы узнать projectId
    const allStages = await db.select().from(stages).where(eq(stages.id, stageId));
    const stage = allStages[0];
    if (!stage) {
      return res.status(404).json({ message: "Этап не найден" });
    }
    
    // Проверяем права (только Owner/Admin)
    const perm = await storage.getProjectPermission(user.id, stage.projectId);
    if (!perm || (!perm.isOwner && !perm.isAdmin)) {
      return res.status(403).json({ message: "Только владелец или администратор может управлять этапами" });
    }
    
    await storage.deleteStage(stageId);
    res.status(204).send();
  });

  // === Executors (Исполнители проекта) ===

  app.get('/api/projects/:projectId/executors', requireAuth, async (req, res) => {
    const executorsList = await storage.getExecutors(Number(req.params.projectId));
    res.json(executorsList);
  });

  app.post('/api/projects/:projectId/executors', requireAuth, async (req, res) => {
    const user = req.user as any;
    const projectId = Number(req.params.projectId);
    
    const perm = await storage.getProjectPermission(user.id, projectId);
    if (!perm || (!perm.isOwner && !perm.isAdmin)) {
      return res.status(403).json({ message: "Только владелец или администратор может управлять исполнителями" });
    }
    
    const executor = await storage.createExecutor({
      projectId,
      name: req.body.name || "Новый исполнитель"
    });
    res.status(201).json(executor);
  });

  app.put('/api/executors/:id', requireAuth, async (req, res) => {
    const user = req.user as any;
    const executorId = Number(req.params.id);
    
    const allExecutors = await db.select().from(executors).where(eq(executors.id, executorId));
    const executor = allExecutors[0];
    if (!executor) {
      return res.status(404).json({ message: "Исполнитель не найден" });
    }
    
    const perm = await storage.getProjectPermission(user.id, executor.projectId);
    if (!perm || (!perm.isOwner && !perm.isAdmin)) {
      return res.status(403).json({ message: "Только владелец или администратор может управлять исполнителями" });
    }
    
    const updated = await storage.updateExecutor(executorId, req.body);
    res.json(updated);
  });

  app.delete('/api/executors/:id', requireAuth, async (req, res) => {
    const user = req.user as any;
    const executorId = Number(req.params.id);
    
    const allExecutors = await db.select().from(executors).where(eq(executors.id, executorId));
    const executor = allExecutors[0];
    if (!executor) {
      return res.status(404).json({ message: "Исполнитель не найден" });
    }
    
    const perm = await storage.getProjectPermission(user.id, executor.projectId);
    if (!perm || (!perm.isOwner && !perm.isAdmin)) {
      return res.status(403).json({ message: "Только владелец или администратор может управлять исполнителями" });
    }
    
    await storage.deleteExecutor(executorId);
    res.status(204).send();
  });

  // === Price Changes (История изменений цен) ===

  app.get('/api/price-history', requireAuth, async (req, res) => {
    const { groupId, elementId, priceType } = req.query;
    
    if (!priceType) {
      return res.status(400).json({ message: "priceType is required" });
    }
    
    const history = await storage.getPriceHistory({
      groupId: groupId ? Number(groupId) : undefined,
      elementId: elementId ? Number(elementId) : undefined,
      priceType: priceType as string,
    });
    
    res.json(history);
  });

  app.post('/api/price-changes', requireAuth, async (req, res) => {
    const user = req.user as any;
    
    const change = await storage.createPriceChange({
      ...req.body,
      userId: user.id,
    });
    
    res.status(201).json(change);
  });

  app.get('/api/initial-prices/:documentId', requireAuth, async (req, res) => {
    const documentId = Number(req.params.documentId);
    const initialPrices = await storage.getInitialPricesForDocument(documentId);
    res.json(initialPrices);
  });

  // === Section Allocations (Распределение по секциям) ===

  app.get('/api/section-allocations', requireAuth, async (req, res) => {
    const groupId = req.query.groupId ? Number(req.query.groupId) : undefined;
    const elementId = req.query.elementId ? Number(req.query.elementId) : undefined;
    
    const allocations = await storage.getSectionAllocations({ groupId, elementId });
    res.json(allocations);
  });

  app.post('/api/section-allocations', requireAuth, async (req, res) => {
    const { allocations } = req.body;
    
    if (!Array.isArray(allocations)) {
      return res.status(400).json({ error: 'allocations must be an array' });
    }
    
    // Sanitize allocations: replace empty strings with "0"
    const sanitized = allocations.map((a: any) => ({
      ...a,
      coefficient: a.coefficient === "" || a.coefficient === null || a.coefficient === undefined ? "0" : String(a.coefficient),
      quantity: a.quantity === "" || a.quantity === null || a.quantity === undefined ? "0" : String(a.quantity),
    }));
    
    await storage.upsertSectionAllocations(sanitized);
    res.status(200).json({ success: true });
  });

  app.delete('/api/section-allocations', requireAuth, async (req, res) => {
    const groupId = req.query.groupId ? Number(req.query.groupId) : undefined;
    const elementId = req.query.elementId ? Number(req.query.elementId) : undefined;
    const sectionNumber = req.query.sectionNumber ? Number(req.query.sectionNumber) : undefined;
    
    await storage.deleteSectionAllocations({ groupId, elementId, sectionNumber });
    res.status(200).json({ success: true });
  });

  // === Work Dependencies (Зависимости между работами) ===

  app.get('/api/work-dependencies', requireAuth, async (_req, res) => {
    const dependencies = await storage.getAllDependencies();
    res.json(dependencies);
  });

  app.get('/api/work-dependencies/:workId', requireAuth, async (req, res) => {
    const workId = Number(req.params.workId);
    const dependencies = await storage.getWorkDependencies(workId);
    res.json(dependencies);
  });

  app.get('/api/work-dependencies/:workId/predecessors', requireAuth, async (req, res) => {
    const workId = Number(req.params.workId);
    const predecessors = await storage.getWorkPredecessors(workId);
    res.json(predecessors);
  });

  app.get('/api/work-dependencies/:workId/successors', requireAuth, async (req, res) => {
    const workId = Number(req.params.workId);
    const successors = await storage.getWorkSuccessors(workId);
    res.json(successors);
  });

  app.post('/api/work-dependencies', requireAuth, async (req, res) => {
    const { workId, dependsOnWorkId, dependencyType, lagDays } = req.body;
    
    if (!workId || !dependsOnWorkId) {
      return res.status(400).json({ error: 'workId and dependsOnWorkId are required' });
    }
    
    if (workId === dependsOnWorkId) {
      return res.status(400).json({ error: 'Работа не может зависеть от самой себя' });
    }
    
    // Check for cyclic dependency
    const hasCycle = await storage.hasCyclicDependency(workId, dependsOnWorkId);
    if (hasCycle) {
      return res.status(400).json({ error: 'Добавление этой зависимости создаст циклическую связь' });
    }
    
    const dependency = await storage.createWorkDependency({
      workId,
      dependsOnWorkId,
      dependencyType: dependencyType || 'FS',
      lagDays: lagDays || 0,
    });
    res.status(201).json(dependency);
  });

  app.put('/api/work-dependencies/:id', requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const { dependencyType, lagDays } = req.body;
    
    const updated = await storage.updateWorkDependency(id, {
      ...(dependencyType !== undefined && { dependencyType }),
      ...(lagDays !== undefined && { lagDays }),
    });
    res.json(updated);
  });

  app.delete('/api/work-dependencies/:id', requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    await storage.deleteWorkDependency(id);
    res.status(204).send();
  });

  app.get('/api/work-dependencies/:workId/constraints', requireAuth, async (req, res) => {
    const workId = Number(req.params.workId);
    const predecessors = await storage.getWorkPredecessors(workId);
    
    const constraints = [];
    for (const pred of predecessors) {
      const work = await storage.getWork(pred.dependsOnWorkId);
      if (work) {
        constraints.push({
          dependencyType: pred.dependencyType as 'FS' | 'SS' | 'FF' | 'SF',
          lagDays: pred.lagDays,
          predecessorWorkId: pred.dependsOnWorkId,
          predecessorDates: {
            workId: work.id,
            planStartDate: work.planStartDate,
            planEndDate: work.planEndDate,
            actualStartDate: work.actualStartDate,
            actualEndDate: work.actualEndDate,
          },
        });
      }
    }
    
    res.json(constraints);
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

  // === Budget Row Codes (связь строк бюджета с кодами классификатора) ===

  app.get('/api/budget-rows/:rowId/codes', async (req, res) => {
    const codes = await storage.getBudgetRowCodes(Number(req.params.rowId));
    res.json(codes);
  });

  app.post('/api/budget-rows/:rowId/codes', async (req, res) => {
    const { codeId } = req.body;
    const code = await storage.addBudgetRowCode(Number(req.params.rowId), codeId);
    res.status(201).json(code);
  });

  app.delete('/api/budget-rows/:rowId/codes/:codeId', async (req, res) => {
    await storage.removeBudgetRowCode(Number(req.params.rowId), Number(req.params.codeId));
    res.status(204).send();
  });

  app.put('/api/budget-rows/:rowId/codes', async (req, res) => {
    const { codeIds } = req.body;
    const codes = await storage.setBudgetRowCodes(Number(req.params.rowId), codeIds || []);
    res.json(codes);
  });

  // === Budget PDC Actual Costs (расчёт фактической стоимости из ПДЦ) ===

  app.get('/api/budget-actual-costs/:projectId', async (req, res) => {
    const projectId = Number(req.params.projectId);
    const actualCosts = await storage.calculateBudgetActualCosts(projectId);
    res.json(actualCosts);
  });

  // === PDC Documents ===

  app.get('/api/pdc-documents', async (_req, res) => {
    const documents = await storage.getPdcDocuments();
    res.json(documents);
  });

  app.get('/api/pdc-documents/:id', async (req, res) => {
    const document = await storage.getPdcDocumentWithData(Number(req.params.id));
    if (!document) {
      return res.status(404).json({ message: "PDC document not found" });
    }
    res.json(document);
  });

  app.post('/api/pdc-documents', async (req, res) => {
    try {
      const document = await storage.createPdcDocument(req.body);
      res.status(201).json(document);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put('/api/pdc-documents/:id', async (req, res) => {
    try {
      const updated = await storage.updatePdcDocument(Number(req.params.id), req.body);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.delete('/api/pdc-documents/:id', async (req, res) => {
    await storage.deletePdcDocument(Number(req.params.id));
    res.status(204).send();
  });

  app.put('/api/pdc-documents/:id/reorder', async (req, res) => {
    try {
      const direction = req.body.direction as 'up' | 'down';
      await storage.reorderPdcDocument(Number(req.params.id), direction);
      res.status(200).json({ success: true });
    } catch (err) {
      throw err;
    }
  });

  // === PDC Blocks ===

  app.post('/api/pdc-blocks', async (req, res) => {
    try {
      const block = await storage.createPdcBlock(req.body);
      res.status(201).json(block);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put('/api/pdc-blocks/:id', async (req, res) => {
    try {
      const updated = await storage.updatePdcBlock(Number(req.params.id), req.body);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put('/api/pdc-blocks/:id/reorder', async (req, res) => {
    try {
      const direction = req.body.direction as 'up' | 'down';
      await storage.reorderPdcBlock(Number(req.params.id), direction);
      res.status(200).json({ success: true });
    } catch (err) {
      throw err;
    }
  });

  app.delete('/api/pdc-blocks/:id', async (req, res) => {
    await storage.deletePdcBlock(Number(req.params.id));
    res.status(204).send();
  });

  // === PDC Sections ===

  app.post('/api/pdc-sections', async (req, res) => {
    try {
      const section = await storage.createPdcSection(req.body);
      res.status(201).json(section);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put('/api/pdc-sections/:id', async (req, res) => {
    try {
      const updated = await storage.updatePdcSection(Number(req.params.id), req.body);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put('/api/pdc-sections/:id/reorder', async (req, res) => {
    try {
      const direction = req.body.direction as 'up' | 'down';
      await storage.reorderPdcSection(Number(req.params.id), direction);
      res.status(200).json({ success: true });
    } catch (err) {
      throw err;
    }
  });

  app.delete('/api/pdc-sections/:id', async (req, res) => {
    await storage.deletePdcSection(Number(req.params.id));
    res.status(204).send();
  });

  // === PDC Groups ===

  app.post('/api/pdc-groups', async (req, res) => {
    try {
      const group = await storage.createPdcGroup(req.body);
      res.status(201).json(group);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put('/api/pdc-groups/:id', async (req, res) => {
    try {
      const updated = await storage.updatePdcGroup(Number(req.params.id), req.body);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put('/api/pdc-groups/:id/reorder', async (req, res) => {
    try {
      const direction = req.body.direction as 'up' | 'down';
      await storage.reorderPdcGroup(Number(req.params.id), direction);
      res.status(200).json({ success: true });
    } catch (err) {
      throw err;
    }
  });

  app.delete('/api/pdc-groups/:id', async (req, res) => {
    await storage.deletePdcGroup(Number(req.params.id));
    res.status(204).send();
  });

  // === PDC Elements ===

  app.post('/api/pdc-elements', async (req, res) => {
    try {
      const element = await storage.createPdcElement(req.body);
      res.status(201).json(element);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put('/api/pdc-elements/:id', async (req, res) => {
    try {
      const updated = await storage.updatePdcElement(Number(req.params.id), req.body);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put('/api/pdc-elements/:id/reorder', async (req, res) => {
    try {
      const direction = req.body.direction as 'up' | 'down';
      await storage.reorderPdcElement(Number(req.params.id), direction);
      res.status(200).json({ success: true });
    } catch (err) {
      throw err;
    }
  });

  app.delete('/api/pdc-elements/:id', async (req, res) => {
    await storage.deletePdcElement(Number(req.params.id));
    res.status(204).send();
  });

  // === Work People (Люди) ===

  app.get('/api/work-people', async (_req, res) => {
    const data = await storage.getWorkPeople();
    res.json(data);
  });

  app.get('/api/work-people/work/:workId', async (req, res) => {
    const data = await storage.getWorkPeopleByWorkId(Number(req.params.workId));
    res.json(data);
  });

  app.get('/api/work-people/work/:workId/section/:sectionNumber', async (req, res) => {
    const data = await storage.getWorkPeopleBySection(
      Number(req.params.workId),
      Number(req.params.sectionNumber)
    );
    res.json(data);
  });

  app.post('/api/work-people', async (req, res) => {
    try {
      const { workId, date, count, sectionNumber } = req.body;
      if (!workId || !date || count === undefined) {
        return res.status(400).json({ message: "workId, date и count обязательны" });
      }
      const numCount = Number(count);
      if (!Number.isInteger(numCount) || numCount < 0 || numCount > 9999) {
        return res.status(400).json({ message: "count должен быть целым числом от 0 до 9999" });
      }
      const numSection = sectionNumber !== undefined && sectionNumber !== null 
        ? Number(sectionNumber) 
        : null;
      if (numSection !== null && (numSection < 1 || numSection > 10)) {
        return res.status(400).json({ message: "sectionNumber должен быть от 1 до 10" });
      }
      const result = await storage.upsertWorkPeople(Number(workId), date, numCount, numSection);
      res.status(200).json(result);
    } catch (err) {
      throw err;
    }
  });

  app.delete('/api/work-people/:id', async (req, res) => {
    await storage.deleteWorkPeople(Number(req.params.id));
    res.status(204).send();
  });

  // API for work people summary (today count and average)
  app.get('/api/work-people/summary', async (_req, res) => {
    try {
      const allWorkPeople = await storage.getWorkPeople();
      const allWorks = await storage.getAllWorks();
      const holidays = await storage.getHolidays();
      const holidaySet = new Set(holidays.map(h => h.date));
      
      // Use UTC+3 timezone for project
      const now = new Date();
      const utcPlus3 = new Date(now.getTime() + 3 * 60 * 60 * 1000);
      const todayStr = utcPlus3.toISOString().split('T')[0];
      const today = new Date(todayStr);
      today.setHours(0, 0, 0, 0);
      
      // Create work map for date lookup from all works
      const workMap = new Map<number, { planStartDate: string | null; actualStartDate: string | null; actualEndDate: string | null }>();
      allWorks.forEach(w => {
        workMap.set(w.id, { 
          planStartDate: w.planStartDate, 
          actualStartDate: w.actualStartDate,
          actualEndDate: w.actualEndDate
        });
      });
      
      // Group by workId
      const workPeopleByWork = new Map<number, { date: string; count: number }[]>();
      allWorkPeople.forEach(wp => {
        if (!workPeopleByWork.has(wp.workId)) {
          workPeopleByWork.set(wp.workId, []);
        }
        workPeopleByWork.get(wp.workId)!.push({ date: wp.date, count: wp.count });
      });
      
      const result: Record<number, { actualToday: number; averageActual: number; weekendHolidayWorkedDays: number }> = {};
      
      workPeopleByWork.forEach((entries, workId) => {
        // Get today's actual count - sum all sections for today
        const actualToday = entries
          .filter(e => e.date === todayStr)
          .reduce((sum, e) => sum + e.count, 0);
        
        // Get work's dates
        const workInfo = workMap.get(workId);
        const planStartDateStr = workInfo?.planStartDate;
        const actualStartDateStr = workInfo?.actualStartDate;
        const actualEndDateStr = workInfo?.actualEndDate;
        
        // Create a map for quick lookup - sum counts by date (across all sections)
        const entryMap = new Map<string, number>();
        entries.forEach(e => {
          entryMap.set(e.date, (entryMap.get(e.date) || 0) + e.count);
        });
        
        // Calculate weekendHolidayWorkedDays for actual period
        let weekendHolidayWorkedDays = 0;
        if (actualStartDateStr && actualEndDateStr) {
          const actualStart = new Date(actualStartDateStr);
          const actualEnd = new Date(actualEndDateStr);
          actualStart.setHours(0, 0, 0, 0);
          actualEnd.setHours(0, 0, 0, 0);
          
          const currentActual = new Date(actualStart);
          while (currentActual <= actualEnd) {
            const dateStr = currentActual.toISOString().split('T')[0];
            const dayOfWeek = currentActual.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isHoliday = holidaySet.has(dateStr);
            const entryCount = entryMap.get(dateStr) ?? 0;
            
            // Count days where worked on weekend/holiday
            if ((isWeekend || isHoliday) && entryCount > 0) {
              weekendHolidayWorkedDays++;
            }
            
            currentActual.setDate(currentActual.getDate() + 1);
          }
        }
        
        if (!planStartDateStr) {
          // No planned start date - use entries only if they exist
          if (entries.length === 0) {
            result[workId] = { actualToday, averageActual: 0, weekendHolidayWorkedDays };
          } else {
            const totalCount = entries.reduce((sum, e) => sum + e.count, 0);
            const averageActual = Math.round((totalCount / entries.length) * 10) / 10;
            result[workId] = { actualToday, averageActual, weekendHolidayWorkedDays };
          }
          return;
        }
        
        // Calculate from plannedStartDate to today
        const startDate = new Date(planStartDateStr);
        startDate.setHours(0, 0, 0, 0);
        
        // If today is before start date, average is 0
        if (today < startDate) {
          result[workId] = { actualToday, averageActual: 0, weekendHolidayWorkedDays };
          return;
        }
        
        let totalCount = 0;
        let countableDays = 0;
        
        // Iterate from plannedStartDate to today
        const currentDate = new Date(startDate);
        while (currentDate <= today) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const dayOfWeek = currentDate.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const isHoliday = holidaySet.has(dateStr);
          const hasEntry = entryMap.has(dateStr);
          
          const entryCount = entryMap.get(dateStr) ?? 0;
          const isNonWorkingDay = isWeekend || isHoliday;
          
          if (isNonWorkingDay) {
            // Weekends/holidays only count if someone actually worked (count > 0)
            if (hasEntry && entryCount > 0) {
              totalCount += entryCount;
              countableDays++;
            }
            // Skip weekends/holidays with 0 or no entry
          } else {
            // Regular workday - always counts
            totalCount += entryCount;
            countableDays++;
          }
          
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        const averageActual = countableDays > 0 ? Math.round((totalCount / countableDays) * 10) / 10 : 0;
        result[workId] = { actualToday, averageActual, weekendHolidayWorkedDays };
      });
      
      res.json(result);
    } catch (err) {
      throw err;
    }
  });

  // API for section-level people summary with workload calculation
  app.get('/api/work-people/sections/:workId', async (req, res) => {
    try {
      const workId = Number(req.params.workId);
      const allWorkPeople = await storage.getWorkPeopleByWorkId(workId);
      const sectionProgress = await storage.getWorkSectionProgress(workId);
      const holidays = await storage.getHolidays();
      const holidaySet = new Set(holidays.map(h => h.date));
      
      const now = new Date();
      const utcPlus3 = new Date(now.getTime() + 3 * 60 * 60 * 1000);
      const todayStr = utcPlus3.toISOString().split('T')[0];
      const today = new Date(todayStr);
      today.setHours(0, 0, 0, 0);
      
      // Group people entries by section
      const sectionPeopleMap = new Map<number, { date: string; count: number }[]>();
      allWorkPeople.forEach(wp => {
        const secNum = wp.sectionNumber ?? 0; // 0 = no section (aggregated)
        if (!sectionPeopleMap.has(secNum)) {
          sectionPeopleMap.set(secNum, []);
        }
        sectionPeopleMap.get(secNum)!.push({ date: wp.date, count: wp.count });
      });
      
      // Create section dates map from section_progress
      const sectionDatesMap = new Map<number, { 
        planStartDate: string | null; 
        planEndDate: string | null;
        actualStartDate: string | null; 
        actualEndDate: string | null;
        plannedPeople: number;
      }>();
      sectionProgress.forEach(sp => {
        sectionDatesMap.set(sp.sectionNumber, {
          planStartDate: sp.planStartDate,
          planEndDate: sp.planEndDate,
          actualStartDate: sp.actualStartDate,
          actualEndDate: sp.actualEndDate,
          plannedPeople: sp.plannedPeople
        });
      });
      
      // Helper to calculate days breakdown
      const calculateDaysBreakdown = (startStr: string | null, endStr: string | null, hSet: Set<string>) => {
        if (!startStr || !endStr) return { calendar: 0, working: 0, weekend: 0 };
        const start = new Date(startStr);
        const end = new Date(endStr);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        if (end < start) return { calendar: 0, working: 0, weekend: 0 };
        
        let calendar = 0, working = 0, weekend = 0;
        const current = new Date(start);
        while (current <= end) {
          calendar++;
          const dow = current.getDay();
          const dateStr = current.toISOString().split('T')[0];
          const isWeekend = dow === 0 || dow === 6;
          const isHoliday = hSet.has(dateStr);
          if (isWeekend || isHoliday) {
            weekend++;
          } else {
            working++;
          }
          current.setDate(current.getDate() + 1);
        }
        return { calendar, working, weekend };
      };
      
      interface SectionSummary {
        sectionNumber: number;
        actualToday: number;
        averageActual: number;
        plannedPeople: number;
        weekendHolidayWorkedDays: number;
        totalWorkedDays: number;
        workload: number;
        planCalendarDays: number;
        planWorkingDays: number;
        planWeekendDays: number;
        actualCalendarDays: number;
        actualWorkingDays: number;
        actualWeekendDays: number;
      }
      
      const result: SectionSummary[] = [];
      
      sectionPeopleMap.forEach((entries, secNum) => {
        // Skip legacy entries without section assignment (secNum = 0)
        if (secNum === 0) return;
        
        const entryMap = new Map<string, number>();
        entries.forEach(e => entryMap.set(e.date, e.count));
        
        const todayEntry = entries.find(e => e.date === todayStr);
        const actualToday = todayEntry ? todayEntry.count : 0;
        
        const sectionDates = sectionDatesMap.get(secNum);
        const planStartDateStr = sectionDates?.planStartDate;
        const planEndDateStr = sectionDates?.planEndDate;
        const actualStartDateStr = sectionDates?.actualStartDate;
        const actualEndDateStr = sectionDates?.actualEndDate;
        const plannedPeople = sectionDates?.plannedPeople ?? 0;
        
        // Calculate plan/actual days breakdown
        const planDays = calculateDaysBreakdown(planStartDateStr || null, planEndDateStr || null, holidaySet);
        const actualDays = calculateDaysBreakdown(actualStartDateStr || null, actualEndDateStr || null, holidaySet);
        
        // Calculate workload from all entries (not dependent on actualStartDate)
        let weekendHolidayWorkedDays = 0;
        let totalWorkedDays = 0;
        let workload = 0;
        
        // Calculate workload from all actual entries regardless of dates
        entries.forEach(entry => {
          if (entry.count > 0) {
            const entryDate = new Date(entry.date);
            const dayOfWeek = entryDate.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isHoliday = holidaySet.has(entry.date);
            
            totalWorkedDays++;
            workload += entry.count;
            if (isWeekend || isHoliday) {
              weekendHolidayWorkedDays++;
            }
          }
        });
        
        // Calculate average
        let averageActual = 0;
        if (planStartDateStr) {
          const startDate = new Date(planStartDateStr);
          startDate.setHours(0, 0, 0, 0);
          
          if (today >= startDate) {
            let totalCount = 0;
            let countableDays = 0;
            const currentDate = new Date(startDate);
            
            while (currentDate <= today) {
              const dateStr = currentDate.toISOString().split('T')[0];
              const dayOfWeek = currentDate.getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              const isHoliday = holidaySet.has(dateStr);
              const entryCount = entryMap.get(dateStr) ?? 0;
              const isNonWorkingDay = isWeekend || isHoliday;
              
              if (isNonWorkingDay) {
                if (entryCount > 0) {
                  totalCount += entryCount;
                  countableDays++;
                }
              } else {
                totalCount += entryCount;
                countableDays++;
              }
              
              currentDate.setDate(currentDate.getDate() + 1);
            }
            
            averageActual = countableDays > 0 ? Math.round((totalCount / countableDays) * 10) / 10 : 0;
          }
        } else if (entries.length > 0) {
          const totalCount = entries.reduce((sum, e) => sum + e.count, 0);
          averageActual = Math.round((totalCount / entries.length) * 10) / 10;
        }
        
        result.push({
          sectionNumber: secNum,
          actualToday,
          averageActual,
          plannedPeople,
          weekendHolidayWorkedDays,
          totalWorkedDays,
          workload,
          planCalendarDays: planDays.calendar,
          planWorkingDays: planDays.working,
          planWeekendDays: planDays.weekend,
          actualCalendarDays: actualDays.calendar,
          actualWorkingDays: actualDays.working,
          actualWeekendDays: actualDays.weekend
        });
      });
      
      // Add empty entries for sections without people data
      sectionProgress.forEach(sp => {
        if (!sectionPeopleMap.has(sp.sectionNumber)) {
          const planDays = calculateDaysBreakdown(sp.planStartDate || null, sp.planEndDate || null, holidaySet);
          const actualDays = calculateDaysBreakdown(sp.actualStartDate || null, sp.actualEndDate || null, holidaySet);
          result.push({
            sectionNumber: sp.sectionNumber,
            actualToday: 0,
            averageActual: 0,
            plannedPeople: sp.plannedPeople,
            weekendHolidayWorkedDays: 0,
            totalWorkedDays: 0,
            workload: 0,
            planCalendarDays: planDays.calendar,
            planWorkingDays: planDays.working,
            planWeekendDays: planDays.weekend,
            actualCalendarDays: actualDays.calendar,
            actualWorkingDays: actualDays.working,
            actualWeekendDays: actualDays.weekend
          });
        }
      });
      
      result.sort((a, b) => a.sectionNumber - b.sectionNumber);
      res.json(result);
    } catch (err) {
      throw err;
    }
  });

  // === Progress Submissions (Согласование прогресса) ===

  // Submit progress for approval (requires can_set_progress permission or admin)
  app.post('/api/progress/submit', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Не авторизован" });
      }
      const user = req.user as any;
      const userId = user.id;
      
      // Check if user is admin or has can_set_progress permission
      if (!user.isAdmin) {
        const canSetProgress = await storage.hasPermission(userId, "edit_data", "progress");
        if (!canSetProgress) {
          return res.status(403).json({ message: "Нет прав на изменение прогресса" });
        }
      }
      
      const { workId, percent, sectionNumber } = req.body;
      if (typeof workId !== 'number' || typeof percent !== 'number') {
        return res.status(400).json({ message: "workId и percent обязательны" });
      }
      const submission = await storage.submitProgress(workId, percent, userId, sectionNumber || null);
      res.status(201).json(submission);
    } catch (err) {
      throw err;
    }
  });

  // Approve progress (admin only)
  app.post('/api/progress/:id/approve', requireAdmin, async (req, res) => {
    try {
      const submissionId = Number(req.params.id);
      const approverId = (req.user as any).id;
      const submission = await storage.approveProgress(submissionId, approverId);
      res.json(submission);
    } catch (err) {
      throw err;
    }
  });

  // Reject progress (admin only)
  app.post('/api/progress/:id/reject', requireAdmin, async (req, res) => {
    try {
      const submissionId = Number(req.params.id);
      const approverId = (req.user as any).id;
      const submission = await storage.rejectProgress(submissionId, approverId);
      res.json(submission);
    } catch (err) {
      throw err;
    }
  });

  // Get progress history for a work
  app.get('/api/progress/history/:workId', async (req, res) => {
    try {
      const workId = Number(req.params.workId);
      const sectionNumber = req.query.sectionNumber ? Number(req.query.sectionNumber) : undefined;
      const history = await storage.getProgressHistory(workId, sectionNumber);
      res.json(history);
    } catch (err) {
      throw err;
    }
  });

  // Get latest submission for a work
  app.get('/api/progress/latest/:workId', async (req, res) => {
    try {
      const workId = Number(req.params.workId);
      const sectionNumber = req.query.sectionNumber ? Number(req.query.sectionNumber) : undefined;
      const submission = await storage.getLatestSubmission(workId, sectionNumber);
      res.json(submission || null);
    } catch (err) {
      throw err;
    }
  });

  // Get all latest submissions for works (for batch fetching)
  app.get('/api/progress/latest-all', async (_req, res) => {
    try {
      const allWorks = await storage.getAllWorks();
      const result: Record<number, any> = {};
      
      for (const work of allWorks) {
        const submission = await storage.getLatestSubmission(work.id);
        if (submission) {
          result[work.id] = submission;
        }
      }
      
      res.json(result);
    } catch (err) {
      throw err;
    }
  });

  // Get latest section submissions for a work (all sections)
  app.get('/api/progress/section-latest/:workId', async (req, res) => {
    try {
      const workId = Number(req.params.workId);
      const submissions = await storage.getLatestSectionSubmissions(workId);
      res.json(submissions);
    } catch (err) {
      throw err;
    }
  });

  // === Work Section Progress ===

  // Get section progress for a work
  app.get('/api/works/:workId/section-progress', async (req, res) => {
    try {
      const workId = Number(req.params.workId);
      const sectionProgress = await storage.getWorkSectionProgress(workId);
      res.json(sectionProgress);
    } catch (err) {
      throw err;
    }
  });

  // Update section progress for a work (upsert)
  app.post('/api/works/:workId/section-progress', requireAuth, async (req, res) => {
    try {
      const workId = Number(req.params.workId);
      const { 
        sectionNumber, 
        progressPercentage, 
        volumeActual, 
        costActual,
        planStartDate,
        actualStartDate,
        planEndDate,
        actualEndDate,
        plannedPeople
      } = req.body;
      
      if (typeof sectionNumber !== 'number' || sectionNumber < 1 || sectionNumber > 10) {
        return res.status(400).json({ message: "sectionNumber должен быть числом от 1 до 10" });
      }
      
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const validateDate = (val: any): string | null => {
        if (val === null || val === undefined || val === '') return null;
        if (typeof val === 'string' && dateRegex.test(val)) return val;
        throw new Error(`Неверный формат даты: ${val}. Ожидается YYYY-MM-DD`);
      };
      
      const data: Record<string, any> = {};
      
      if (progressPercentage !== undefined) {
        data.progressPercentage = Math.min(100, Math.max(0, Number(progressPercentage) || 0));
      }
      if (volumeActual !== undefined) {
        data.volumeActual = Math.max(0, Number(volumeActual) || 0);
      }
      if (costActual !== undefined) {
        data.costActual = Math.max(0, Number(costActual) || 0);
      }
      if (planStartDate !== undefined) {
        data.planStartDate = validateDate(planStartDate);
      }
      if (actualStartDate !== undefined) {
        data.actualStartDate = validateDate(actualStartDate);
      }
      if (planEndDate !== undefined) {
        data.planEndDate = validateDate(planEndDate);
      }
      if (actualEndDate !== undefined) {
        data.actualEndDate = validateDate(actualEndDate);
      }
      if (plannedPeople !== undefined) {
        data.plannedPeople = Math.max(0, Number(plannedPeople) || 0);
      }
      
      if (Object.keys(data).length === 0) {
        return res.status(400).json({ message: "Необходимо указать хотя бы одно поле для обновления" });
      }
      
      const progress = await storage.upsertWorkSectionProgress(workId, sectionNumber, data);
      res.json(progress);
    } catch (err: any) {
      if (err.message?.includes('Неверный формат даты')) {
        return res.status(400).json({ message: err.message });
      }
      throw err;
    }
  });

  // Delete section progress
  app.delete('/api/works/:workId/section-progress/:sectionNumber', requireAuth, async (req, res) => {
    try {
      const workId = Number(req.params.workId);
      const sectionNumber = Number(req.params.sectionNumber);
      await storage.deleteWorkSectionProgress(workId, sectionNumber);
      res.status(204).send();
    } catch (err) {
      throw err;
    }
  });

  // Get all section progress for all works (batch fetching)
  app.get('/api/work-section-progress/all', async (_req, res) => {
    try {
      const allWorks = await storage.getAllWorks();
      const result: Record<number, any[]> = {};
      
      for (const work of allWorks) {
        const sectionProgress = await storage.getWorkSectionProgress(work.id);
        if (sectionProgress.length > 0) {
          result[work.id] = sectionProgress;
        }
      }
      
      res.json(result);
    } catch (err) {
      throw err;
    }
  });

  // === User Management (Admin only, or project owners/admins for listing) ===

  app.get('/api/users', requireAuth, async (req, res) => {
    const user = req.user as any;
    if (!user) {
      return res.status(401).json({ message: "Не авторизован" });
    }
    
    if (!user.isAdmin) {
      const projectPermissions = await storage.getProjectPermissionsForUser(user.id);
      const canManageAnyProject = projectPermissions.some(p => p.isOwner || p.isAdmin);
      if (!canManageAnyProject) {
        return res.status(403).json({ message: "Нет прав" });
      }
    }
    
    const users = await storage.getUsers();
    res.json(users);
  });

  app.get('/api/users/:id', requireAdmin, async (req, res) => {
    const user = await storage.getUserWithPermissions(Number(req.params.id));
    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }
    res.json(user);
  });

  app.post('/api/users', requireAdmin, async (req, res) => {
    try {
      const { username, password, isAdmin } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Логин и пароль обязательны" });
      }
      
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ message: "Пользователь с таким логином уже существует" });
      }
      
      const adminId = (req.user as any)?.id;
      const user = await storage.createUser(username, password, isAdmin || false, adminId);
      res.status(201).json(user);
    } catch (err) {
      throw err;
    }
  });

  app.put('/api/users/:id/password', requireAdmin, async (req, res) => {
    try {
      const { password } = req.body;
      if (!password) {
        return res.status(400).json({ message: "Пароль обязателен" });
      }
      await storage.updateUserPassword(Number(req.params.id), password);
      res.json({ message: "Пароль изменён" });
    } catch (err) {
      throw err;
    }
  });

  app.delete('/api/users/:id', requireAdmin, async (req, res) => {
    const userId = Number(req.params.id);
    const adminId = (req.user as any)?.id;
    
    if (userId === adminId) {
      return res.status(400).json({ message: "Нельзя удалить себя" });
    }
    
    await storage.deleteUser(userId);
    res.status(204).send();
  });

  // === Permission Management ===

  app.get('/api/users/:id/permissions', requireAdmin, async (req, res) => {
    const permissions = await storage.getPermissions(Number(req.params.id));
    res.json(permissions);
  });

  app.post('/api/users/:id/permissions', requireAdmin, async (req, res) => {
    try {
      const { permissionType, resource, allowed } = req.body;
      if (!permissionType || !resource) {
        return res.status(400).json({ message: "Тип разрешения и ресурс обязательны" });
      }
      
      const permission = await storage.setPermission(
        Number(req.params.id),
        permissionType,
        resource,
        allowed !== false
      );
      res.status(201).json(permission);
    } catch (err) {
      throw err;
    }
  });

  app.delete('/api/permissions/:id', requireAdmin, async (req, res) => {
    await storage.deletePermission(Number(req.params.id));
    res.status(204).send();
  });

  // === Projects ===

  app.get('/api/projects', requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const projectsList = await storage.getProjectsForUser(userId);
      res.json(projectsList);
    } catch (err) {
      console.error("Error getting projects:", err);
      res.status(500).json({ message: "Failed to get projects" });
    }
  });

  app.get('/api/projects/deleted', requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const deletedProjects = await storage.getDeletedProjectsForUser(userId);
      res.json(deletedProjects);
    } catch (err) {
      console.error("Error getting deleted projects:", err);
      res.status(500).json({ message: "Failed to get deleted projects" });
    }
  });

  app.get('/api/projects/:id', requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Проект не найден" });
      }
      res.json(project);
    } catch (err) {
      console.error("Error getting project:", err);
      res.status(500).json({ message: "Failed to get project" });
    }
  });

  app.post('/api/projects', requireAuth, async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Название проекта обязательно" });
      }
      const userId = (req.user as any).id;
      const project = await storage.createProject(name, userId);
      res.status(201).json(project);
    } catch (err) {
      console.error("Error creating project:", err);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.put('/api/projects/:id', requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const userId = (req.user as any).id;
      const { name } = req.body;
      
      const isAdmin = await storage.isProjectAdmin(userId, id);
      if (!isAdmin) {
        return res.status(403).json({ message: "Нет прав на редактирование проекта" });
      }
      
      const updated = await storage.updateProject(id, name);
      res.json(updated);
    } catch (err) {
      console.error("Error updating project:", err);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete('/api/projects/:id', requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const userId = (req.user as any).id;
      
      const isOwner = await storage.isProjectOwner(userId, id);
      if (!isOwner) {
        return res.status(403).json({ message: "Только владелец может удалить проект" });
      }
      
      await storage.softDeleteProject(id);
      res.status(204).send();
    } catch (err) {
      console.error("Error deleting project:", err);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  app.post('/api/projects/:id/restore', requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const userId = (req.user as any).id;
      
      const isOwner = await storage.isProjectOwner(userId, id);
      if (!isOwner) {
        return res.status(403).json({ message: "Только владелец может восстановить проект" });
      }
      
      await storage.restoreProject(id);
      res.status(200).json({ message: "Проект восстановлен" });
    } catch (err) {
      console.error("Error restoring project:", err);
      res.status(500).json({ message: "Failed to restore project" });
    }
  });

  app.post('/api/projects/:id/duplicate', requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const userId = (req.user as any).id;
      
      const perm = await storage.getProjectPermission(userId, id);
      if (!perm) {
        return res.status(403).json({ message: "Нет доступа к проекту" });
      }
      
      const sourceProject = await storage.getProject(id);
      const newName = `${sourceProject?.name} (копия)`;
      const newProject = await storage.duplicateProject(id, newName, userId);
      res.status(201).json(newProject);
    } catch (err) {
      console.error("Error duplicating project:", err);
      res.status(500).json({ message: "Failed to duplicate project" });
    }
  });

  // === Project Permissions ===

  app.get('/api/projects/:id/permissions', requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const userId = (req.user as any).id;
      
      const isAdmin = await storage.isProjectAdmin(userId, id);
      if (!isAdmin) {
        return res.status(403).json({ message: "Нет прав на просмотр разрешений" });
      }
      
      const permissions = await storage.getProjectPermissions(id);
      res.json(permissions);
    } catch (err) {
      console.error("Error getting project permissions:", err);
      res.status(500).json({ message: "Failed to get project permissions" });
    }
  });

  app.get('/api/projects/:id/my-permission', requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const userId = (req.user as any).id;
      const permission = await storage.getProjectPermission(userId, id);
      res.json(permission || null);
    } catch (err) {
      console.error("Error getting my permission:", err);
      res.status(500).json({ message: "Failed to get permission" });
    }
  });

  app.post('/api/projects/:id/permissions', requireAuth, async (req, res) => {
    try {
      const projectId = Number(req.params.id);
      const userId = (req.user as any).id;
      
      const isAdmin = await storage.isProjectAdmin(userId, projectId);
      if (!isAdmin) {
        return res.status(403).json({ message: "Нет прав на управление разрешениями" });
      }
      
      const permission = await storage.setProjectPermission({ ...req.body, projectId });
      
      await storage.createNotification({
        userId: req.body.userId,
        projectId,
        type: "added_to_project",
        message: `Вас добавили в проект`,
        isRead: false
      });
      
      res.status(201).json(permission);
    } catch (err) {
      console.error("Error setting project permission:", err);
      res.status(500).json({ message: "Failed to set project permission" });
    }
  });

  app.put('/api/project-permissions/:id', requireAuth, async (req, res) => {
    try {
      const permId = Number(req.params.id);
      const userId = (req.user as any).id;
      
      const updated = await storage.updateProjectPermission(permId, req.body);
      
      await storage.createNotification({
        userId: updated.userId,
        projectId: updated.projectId,
        type: "permissions_changed",
        message: `Ваши права в проекте изменены`,
        isRead: false
      });
      
      res.json(updated);
    } catch (err) {
      console.error("Error updating project permission:", err);
      res.status(500).json({ message: "Failed to update project permission" });
    }
  });

  app.delete('/api/projects/:projectId/permissions/:userId', requireAuth, async (req, res) => {
    try {
      const projectId = Number(req.params.projectId);
      const targetUserId = Number(req.params.userId);
      const currentUserId = (req.user as any).id;
      
      const isAdmin = await storage.isProjectAdmin(currentUserId, projectId);
      const targetIsOwner = await storage.isProjectOwner(targetUserId, projectId);
      
      if (!isAdmin) {
        return res.status(403).json({ message: "Нет прав на удаление пользователя из проекта" });
      }
      
      if (targetIsOwner) {
        return res.status(403).json({ message: "Нельзя удалить владельца проекта" });
      }
      
      await storage.deleteProjectPermission(targetUserId, projectId);
      
      const project = await storage.getProject(projectId);
      await storage.createNotification({
        userId: targetUserId,
        projectId,
        type: "removed_from_project",
        message: `Вас удалили из проекта '${project?.name}'`,
        isRead: false
      });
      
      res.status(204).send();
    } catch (err) {
      console.error("Error deleting project permission:", err);
      res.status(500).json({ message: "Failed to delete project permission" });
    }
  });

  // === Transfer Ownership ===
  
  app.post('/api/projects/:id/transfer-ownership', requireAuth, async (req, res) => {
    try {
      const projectId = Number(req.params.id);
      const currentUserId = (req.user as any).id;
      const { toUserId } = req.body;
      
      const isOwner = await storage.isProjectOwner(currentUserId, projectId);
      if (!isOwner) {
        return res.status(403).json({ message: "Только владелец может передать права" });
      }
      
      await storage.transferOwnership(projectId, currentUserId, toUserId);
      
      const project = await storage.getProject(projectId);
      await storage.createNotification({
        userId: toUserId,
        projectId,
        type: "made_owner",
        message: `Вам переданы права владельца проекта '${project?.name}'`,
        isRead: false
      });
      
      res.json({ message: "Права владельца переданы" });
    } catch (err) {
      console.error("Error transferring ownership:", err);
      res.status(500).json({ message: "Failed to transfer ownership" });
    }
  });

  // === Notifications ===

  app.get('/api/notifications', requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const notificationsList = await storage.getNotifications(userId);
      res.json(notificationsList);
    } catch (err) {
      console.error("Error getting notifications:", err);
      res.status(500).json({ message: "Failed to get notifications" });
    }
  });

  app.get('/api/notifications/unread-count', requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (err) {
      console.error("Error getting unread count:", err);
      res.status(500).json({ message: "Failed to get unread count" });
    }
  });

  app.post('/api/notifications/mark-read', requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      await storage.markNotificationsAsRead(userId);
      res.status(200).json({ message: "Уведомления прочитаны" });
    } catch (err) {
      console.error("Error marking notifications as read:", err);
      res.status(500).json({ message: "Failed to mark notifications as read" });
    }
  });

  // Cleanup expired owners and old notifications periodically
  setInterval(async () => {
    try {
      await storage.processExpiredOwners();
      await storage.cleanupOldNotifications();
      await storage.cleanupDeletedProjects();
    } catch (err) {
      console.error("Error in cleanup job:", err);
    }
  }, 60 * 60 * 1000); // Run every hour

  // Seed Data
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const groups = await storage.getWorkGroupsWithWorks();
  // Check if we need to reinitialize order values for existing data
  const needsReorder = groups.some(g => g.works.some(w => w.order === 0) && g.works.length > 1);
  
  // Reinitialize PDC documents order if all have order 0
  const pdcDocs = await storage.getPdcDocuments();
  const allPdcDocsZeroOrder = pdcDocs.length > 1 && pdcDocs.every(d => d.order === 0);
  if (allPdcDocsZeroOrder) {
    console.log("Reinitializing PDC documents order values...");
    for (let i = 0; i < pdcDocs.length; i++) {
      await storage.updatePdcDocument(pdcDocs[i].id, { order: i });
    }
    console.log("PDC documents order values reinitialized!");
  }
  
  if (groups.length === 0) {
    console.log("Seeding database...");
    
    const group1 = await storage.createWorkGroup({ name: "Подготовительные работы" });
    await storage.createWork({
      groupId: group1.id,
      name: "Ограждение территории",
      daysEstimated: 5,
      volumeAmount: 150,
      volumeUnit: "п.м",
      daysActual: 0,
      volumeActual: 0,
      costPlan: 0,
      costActual: 0,
      progressPercentage: 100,
      plannedPeople: 5,
      responsiblePerson: "Иванов И.И."
    });
    await storage.createWork({
      groupId: group1.id,
      name: "Устройство бытового городка",
      daysEstimated: 3,
      volumeAmount: 1,
      volumeUnit: "компл",
      daysActual: 0,
      volumeActual: 0,
      costPlan: 0,
      costActual: 0,
      progressPercentage: 80,
      plannedPeople: 3,
      responsiblePerson: "Петров П.П."
    });

    const group2 = await storage.createWorkGroup({ name: "Земляные работы" });
    await storage.createWork({
      groupId: group2.id,
      name: "Разработка грунта экскаватором",
      daysEstimated: 10,
      volumeAmount: 500,
      volumeUnit: "м3",
      daysActual: 0,
      volumeActual: 0,
      costPlan: 0,
      costActual: 0,
      progressPercentage: 45,
      plannedPeople: 8,
      responsiblePerson: "Сидоров С.С."
    });
    await storage.createWork({
      groupId: group2.id,
      name: "Ручная доработка грунта",
      daysEstimated: 4,
      volumeAmount: 50,
      volumeUnit: "м3",
      daysActual: 0,
      volumeActual: 0,
      costPlan: 0,
      costActual: 0,
      progressPercentage: 10,
      plannedPeople: 4,
      responsiblePerson: "Сидоров С.С."
    });

    const group3 = await storage.createWorkGroup({ name: "Фундамент" });
    await storage.createWork({
      groupId: group3.id,
      name: "Устройство бетонной подготовки",
      daysEstimated: 6,
      volumeAmount: 120,
      volumeUnit: "м2",
      daysActual: 0,
      volumeActual: 0,
      costPlan: 0,
      costActual: 0,
      progressPercentage: 0,
      plannedPeople: 6,
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
