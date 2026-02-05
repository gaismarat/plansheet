import { useState, useMemo, useRef, useEffect, createContext, useContext } from "react";
import { useWorksTree, useUpdateWorkDates, useUpdateSectionDates, useDependencyConstraints, useAllDependencies } from "@/hooks/use-construction";
import { useSyncedRowHeights } from "@/hooks/use-synced-row-heights";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, CalendarDays, ChevronRight, ChevronDown, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { addDays, startOfWeek, endOfWeek, format, parseISO, differenceInDays, eachDayOfInterval, eachWeekOfInterval, isWithinInterval, isBefore, isAfter, startOfDay, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { DatePickerCell } from "@/components/date-picker-cell";
import { DependencyDialog } from "@/components/dependency-dialog";
import { DependencyArrows, DEPENDENCY_COLORS, DEPENDENCY_LABELS } from "@/components/dependency-arrows";
import { calculateMinActualStartDate, getDisabledDays } from "@/lib/dependency-utils";

interface RowHeightsContextType {
  registerLeftRow: (key: string, el: HTMLTableRowElement | null) => void;
  getRowHeight: (key: string) => number | undefined;
}

const RowHeightsContext = createContext<RowHeightsContextType | null>(null);

function useRowHeights() {
  const ctx = useContext(RowHeightsContext);
  if (!ctx) throw new Error("RowHeightsContext not found");
  return ctx;
}

type ViewMode = "days" | "weeks";

interface BuildingSectionData {
  sectionNumber: number;
  planStartDate: string | null;
  planEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
}

interface WorkTreeItem {
  id: number;
  planStartDate: string | null;
  planEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  sectionsCount?: number;
  buildingSections?: BuildingSectionData[];
}

interface GroupNode {
  id: number;
  pdcGroupId: number;
  number: string;
  name: string;
  works: WorkTreeItem[];
}

interface SectionNode {
  id: number;
  pdcSectionId: number;
  number: string;
  name: string;
  groups: GroupNode[];
}

interface BlockNode {
  id: number;
  pdcBlockId: number;
  number: string;
  name: string;
  sections: SectionNode[];
}

interface DocumentNode {
  id: number;
  pdcDocumentId: number;
  name: string;
  blocks: BlockNode[];
}

function CurrentDateLine({ viewMode, today, unit }: { viewMode: ViewMode; today: Date; unit: Date }) {
  let leftPercent = 50;
  
  if (viewMode === "weeks") {
    const weekStart = startOfDay(unit);
    const weekEnd = endOfWeek(unit, { weekStartsOn: 1 });
    const totalDays = differenceInDays(weekEnd, weekStart) + 1;
    const daysFromStart = differenceInDays(today, weekStart);
    leftPercent = ((daysFromStart + 0.5) / totalDays) * 100;
  }

  return (
    <div 
      className="absolute top-0 bottom-0 w-0 border-l-2 border-dashed border-primary z-20 pointer-events-none"
      style={{ left: `${leftPercent}%` }}
    />
  );
}

function getGroupDates(group: GroupNode) {
  let planStart: Date | null = null;
  let planEnd: Date | null = null;
  let actualStart: Date | null = null;
  let actualEnd: Date | null = null;

  group.works?.forEach(work => {
    if (work.planStartDate) {
      const d = parseISO(work.planStartDate);
      if (!planStart || isBefore(d, planStart)) planStart = d;
    }
    if (work.planEndDate) {
      const d = parseISO(work.planEndDate);
      if (!planEnd || isAfter(d, planEnd)) planEnd = d;
    }
    if (work.actualStartDate) {
      const d = parseISO(work.actualStartDate);
      if (!actualStart || isBefore(d, actualStart)) actualStart = d;
    }
    if (work.actualEndDate) {
      const d = parseISO(work.actualEndDate);
      if (!actualEnd || isAfter(d, actualEnd)) actualEnd = d;
    }
  });

  return { planStart, planEnd, actualStart, actualEnd };
}

async function exportToExcel(
  documents: DocumentNode[],
  timeUnits: Date[],
  viewMode: ViewMode,
  dateRange: { start: Date; end: Date }
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('КСП');

  // Enable row grouping (outline) - summary rows above detail rows
  worksheet.properties.outlineProperties = {
    summaryBelow: false,  // Summary (parent) rows are above details
    summaryRight: false
  };

  // Freeze panes: first 7 columns (name + dates + durations) and header rows (1+hidden row 2)
  worksheet.views = [
    {
      state: 'frozen',
      xSplit: 7,  // Freeze first 7 columns
      ySplit: 2,  // Freeze header row + hidden dates row
      topLeftCell: 'H3',  // First scrollable cell
      activeCell: 'H3'
    }
  ];

  // Excel colors (ARGB format without #)
  const COLORS = {
    plan: 'FF3B82F6',       // blue-500
    actual: 'FFC8A2C8',     // lilac
    delay: 'FFEF4444',      // red-500
    ahead: 'FF22C55E',      // green-500
    docHeader: 'FFE0E7FF',  // primary/20
    blockHeader: 'FFF0F4FF', // primary/10
    sectionHeader: 'FFF5F5F5', // secondary/30
    todayBg: 'FFFEF3C7',    // yellow-100
  };

  // Helper to check cell content for timeline
  const getCellContent = (
    unit: Date,
    planStart: Date | null,
    planEnd: Date | null,
    actualStart: Date | null,
    actualEnd: Date | null
  ) => {
    const unitEnd = viewMode === "weeks" ? endOfWeek(unit, { weekStartsOn: 1 }) : unit;
    const unitStart = startOfDay(unit);

    const isInPlanRange = planStart && planEnd && (
      isWithinInterval(unitStart, { start: startOfDay(planStart), end: startOfDay(planEnd) }) ||
      isWithinInterval(unitEnd, { start: startOfDay(planStart), end: startOfDay(planEnd) }) ||
      (isBefore(unitStart, planStart) && isAfter(unitEnd, planEnd))
    );

    const isInActualRange = actualStart && actualEnd && (
      isWithinInterval(unitStart, { start: startOfDay(actualStart), end: startOfDay(actualEnd) }) ||
      isWithinInterval(unitEnd, { start: startOfDay(actualStart), end: startOfDay(actualEnd) }) ||
      (isBefore(unitStart, actualStart) && isAfter(unitEnd, actualEnd))
    );

    const isDelay = planEnd && actualEnd && isAfter(startOfDay(actualEnd), startOfDay(planEnd)) &&
      isWithinInterval(unitStart, { start: startOfDay(planEnd), end: startOfDay(actualEnd) });

    const isAhead = planEnd && actualEnd && isBefore(startOfDay(actualEnd), startOfDay(planEnd)) &&
      isWithinInterval(unitStart, { start: startOfDay(actualEnd), end: startOfDay(planEnd) });

    return { isInPlanRange, isInActualRange, isDelay, isAhead };
  };

  // Setup columns with date style for date columns
  const dateStyle: Partial<ExcelJS.Column> = { width: 12, style: { numFmt: 'DD.MM.YY' } };
  const columns: Partial<ExcelJS.Column>[] = [
    { header: 'Наименование', key: 'name', width: 50 },
    { header: 'Начало план', key: 'planStart', ...dateStyle },
    { header: 'Начало факт', key: 'actualStart', ...dateStyle },
    { header: 'Конец план', key: 'planEnd', ...dateStyle },
    { header: 'Конец факт', key: 'actualEnd', ...dateStyle },
    { header: 'Длит. план', key: 'planDuration', width: 10 },
    { header: 'Длит. факт', key: 'actualDuration', width: 10 },
  ];

  // Add time unit columns with Date values in header for formula references
  timeUnits.forEach((unit, idx) => {
    const header = viewMode === "days" 
      ? format(unit, "dd.MM", { locale: ru })
      : `Н${format(unit, "w", { locale: ru })} ${format(unit, "dd.MM", { locale: ru })}`;
    columns.push({ header, key: `t${idx}`, width: 8 });
  });

  worksheet.columns = columns;
  
  // Store actual Date values in header row for timeline columns (for formula references)
  // We'll add a hidden row 2 with dates, and shift all data down
  // Actually, let's put dates in a way formulas can reference them

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 10 };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E7EB' }
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  const formatDateExcel = (date: Date | null) => date ? format(date, "dd.MM.yy", { locale: ru }) : "—";
  const today = startOfDay(new Date());
  const startCol = 8; // First timeline column (after 7 data columns)

  // Add hidden row 2 with actual Date values for conditional formatting formulas
  const datesRow = worksheet.addRow({});
  datesRow.hidden = true;
  timeUnits.forEach((unit, idx) => {
    datesRow.getCell(startCol + idx).value = unit; // Store as Date for formulas
  });
  const lastTimelineCol = startCol + timeUnits.length - 1;
  
  // Helper to get Excel column letter from number
  const getColLetter = (colNum: number): string => {
    let letter = '';
    while (colNum > 0) {
      const mod = (colNum - 1) % 26;
      letter = String.fromCharCode(65 + mod) + letter;
      colNum = Math.floor((colNum - 1) / 26);
    }
    return letter;
  };
  
  const firstTimelineColLetter = getColLetter(startCol);
  const lastTimelineColLetter = getColLetter(lastTimelineCol);

  // Helper to aggregate dates from groups
  const getAggregatedDates = (groups: GroupNode[]) => {
    let planStart: Date | null = null;
    let planEnd: Date | null = null;
    let actualStart: Date | null = null;
    let actualEnd: Date | null = null;
    
    groups.forEach(group => {
      const dates = getGroupDates(group);
      if (dates.planStart && (!planStart || isBefore(dates.planStart, planStart))) planStart = dates.planStart;
      if (dates.planEnd && (!planEnd || isAfter(dates.planEnd, planEnd))) planEnd = dates.planEnd;
      if (dates.actualStart && (!actualStart || isBefore(dates.actualStart, actualStart))) actualStart = dates.actualStart;
      if (dates.actualEnd && (!actualEnd || isAfter(dates.actualEnd, actualEnd))) actualEnd = dates.actualEnd;
    });
    
    return { planStart, planEnd, actualStart, actualEnd };
  };

  // Helper to add timeline cells to a row (just borders, conditional formatting handles colors)
  const addTimelineCells = (
    row: ExcelJS.Row, 
    bgColor: string
  ) => {
    // Fill frozen columns (1-7) with background color for grouping rows
    for (let col = 1; col <= 7; col++) {
      row.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    }

    // Add borders to timeline cells (colors handled by conditional formatting)
    timeUnits.forEach((_, idx) => {
      const cell = row.getCell(startCol + idx);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };
    });
  };

  // Process documents
  documents.forEach(doc => {
    // Aggregate dates for document
    const allDocGroups: GroupNode[] = [];
    doc.blocks?.forEach(block => {
      block.sections?.forEach(section => {
        section.groups?.forEach(group => allDocGroups.push(group));
      });
    });
    const docDates = getAggregatedDates(allDocGroups);
    const docPlanDur = docDates.planStart && docDates.planEnd ? differenceInDays(docDates.planEnd, docDates.planStart) + 1 : null;
    const docActualDur = docDates.actualStart && docDates.actualEnd ? differenceInDays(docDates.actualEnd, docDates.actualStart) + 1 : null;

    // Document plan row (level 0 - top level parent)
    // Store Date objects for conditional formatting formulas, all 4 dates in every row
    const docPlanRow = worksheet.addRow({
      name: `${doc.name} — план`,
      planStart: docDates.planStart || null,
      actualStart: docDates.actualStart || null,
      planEnd: docDates.planEnd || null,
      actualEnd: docDates.actualEnd || null,
      planDuration: docPlanDur ?? '—',
      actualDuration: '',
    });
    docPlanRow.outlineLevel = 0;
    docPlanRow.font = { bold: true, size: 11 };
    docPlanRow.getCell('name').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.docHeader } };
    addTimelineCells(docPlanRow, COLORS.docHeader);

    // Document actual row (level 0 - top level parent)
    const docActualRow = worksheet.addRow({
      name: `${doc.name} — факт`,
      planStart: docDates.planStart || null,
      actualStart: docDates.actualStart || null,
      planEnd: docDates.planEnd || null,
      actualEnd: docDates.actualEnd || null,
      planDuration: '',
      actualDuration: docActualDur ?? '—',
    });
    docActualRow.outlineLevel = 0;
    docActualRow.font = { bold: true, size: 11 };
    docActualRow.getCell('name').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.docHeader } };
    addTimelineCells(docActualRow, COLORS.docHeader);

    // Process blocks
    doc.blocks?.forEach(block => {
      // Aggregate dates for block
      const allBlockGroups: GroupNode[] = [];
      block.sections?.forEach(section => {
        section.groups?.forEach(group => allBlockGroups.push(group));
      });
      const blockDates = getAggregatedDates(allBlockGroups);
      const blockPlanDur = blockDates.planStart && blockDates.planEnd ? differenceInDays(blockDates.planEnd, blockDates.planStart) + 1 : null;
      const blockActualDur = blockDates.actualStart && blockDates.actualEnd ? differenceInDays(blockDates.actualEnd, blockDates.actualStart) + 1 : null;

      // Block plan row (level 1)
      const blockPlanRow = worksheet.addRow({
        name: `  ${block.number} ${block.name} — план`,
        planStart: blockDates.planStart || null,
        actualStart: blockDates.actualStart || null,
        planEnd: blockDates.planEnd || null,
        actualEnd: blockDates.actualEnd || null,
        planDuration: blockPlanDur ?? '—',
        actualDuration: '',
      });
      blockPlanRow.outlineLevel = 1;
      blockPlanRow.font = { bold: true, size: 10 };
      blockPlanRow.getCell('name').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.blockHeader } };
      addTimelineCells(blockPlanRow, COLORS.blockHeader);

      // Block actual row (level 1)
      const blockActualRow = worksheet.addRow({
        name: `  ${block.number} ${block.name} — факт`,
        planStart: blockDates.planStart || null,
        actualStart: blockDates.actualStart || null,
        planEnd: blockDates.planEnd || null,
        actualEnd: blockDates.actualEnd || null,
        planDuration: '',
        actualDuration: blockActualDur ?? '—',
      });
      blockActualRow.outlineLevel = 1;
      blockActualRow.font = { bold: true, size: 10 };
      blockActualRow.getCell('name').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.blockHeader } };
      addTimelineCells(blockActualRow, COLORS.blockHeader);

      // Process sections
      block.sections?.forEach(section => {
        // Aggregate dates for section
        const sectionDates = getAggregatedDates(section.groups || []);
        const sectionPlanDur = sectionDates.planStart && sectionDates.planEnd ? differenceInDays(sectionDates.planEnd, sectionDates.planStart) + 1 : null;
        const sectionActualDur = sectionDates.actualStart && sectionDates.actualEnd ? differenceInDays(sectionDates.actualEnd, sectionDates.actualStart) + 1 : null;

        // Section plan row (level 2)
        const sectionPlanRow = worksheet.addRow({
          name: `    ${section.number} ${section.name} — план`,
          planStart: sectionDates.planStart || null,
          actualStart: sectionDates.actualStart || null,
          planEnd: sectionDates.planEnd || null,
          actualEnd: sectionDates.actualEnd || null,
          planDuration: sectionPlanDur ?? '—',
          actualDuration: '',
        });
        sectionPlanRow.outlineLevel = 2;
        sectionPlanRow.font = { bold: true, size: 10 };
        sectionPlanRow.getCell('name').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.sectionHeader } };
        addTimelineCells(sectionPlanRow, COLORS.sectionHeader);

        // Section actual row (level 2)
        const sectionActualRow = worksheet.addRow({
          name: `    ${section.number} ${section.name} — факт`,
          planStart: sectionDates.planStart || null,
          actualStart: sectionDates.actualStart || null,
          planEnd: sectionDates.planEnd || null,
          actualEnd: sectionDates.actualEnd || null,
          planDuration: '',
          actualDuration: sectionActualDur ?? '—',
        });
        sectionActualRow.outlineLevel = 2;
        sectionActualRow.font = { bold: true, size: 10 };
        sectionActualRow.getCell('name').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.sectionHeader } };
        addTimelineCells(sectionActualRow, COLORS.sectionHeader);

        // Process groups (works)
        section.groups?.forEach(group => {
          const { planStart, planEnd, actualStart, actualEnd } = getGroupDates(group);
          const planDuration = planStart && planEnd ? differenceInDays(planEnd, planStart) + 1 : null;
          const actualDuration = actualStart && actualEnd ? differenceInDays(actualEnd, actualStart) + 1 : null;

          // Row 1: Plan row - level 3
          const planRow = worksheet.addRow({
            name: `      ${group.number} ${group.name} — план`,
            planStart: planStart || null,
            actualStart: actualStart || null,
            planEnd: planEnd || null,
            actualEnd: actualEnd || null,
            planDuration: planDuration ?? '—',
            actualDuration: '',
          });
          planRow.outlineLevel = 3;
          planRow.font = { size: 10 };
          planRow.height = 15;
          // Add borders to timeline cells
          timeUnits.forEach((_, idx) => {
            planRow.getCell(startCol + idx).border = {
              top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
              left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
              bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
              right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
            };
          });

          // Row 2: Actual row - level 3
          const actualRow = worksheet.addRow({
            name: `      ${group.number} ${group.name} — факт`,
            planStart: planStart || null,
            actualStart: actualStart || null,
            planEnd: planEnd || null,
            actualEnd: actualEnd || null,
            planDuration: '',
            actualDuration: actualDuration ?? '—',
          });
          actualRow.outlineLevel = 3;
          actualRow.font = { size: 10 };
          actualRow.height = 15;
          // Add borders to timeline cells
          timeUnits.forEach((_, idx) => {
            actualRow.getCell(startCol + idx).border = {
              top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
              left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
              bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
              right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
            };
          });

          // Export building sections if present
          const work = group.works?.[0];
          const sectionsCount = work?.sectionsCount || 1;
          const buildingSections = work?.buildingSections || [];

          if (sectionsCount > 1 && buildingSections.length > 0) {
            buildingSections.forEach(bldSection => {
              const secPlanStart = bldSection.planStartDate ? parseISO(bldSection.planStartDate) : null;
              const secPlanEnd = bldSection.planEndDate ? parseISO(bldSection.planEndDate) : null;
              const secActualStart = bldSection.actualStartDate ? parseISO(bldSection.actualStartDate) : null;
              const secActualEnd = bldSection.actualEndDate ? parseISO(bldSection.actualEndDate) : null;
              const secPlanDur = secPlanStart && secPlanEnd ? differenceInDays(secPlanEnd, secPlanStart) + 1 : null;
              const secActualDur = secActualStart && secActualEnd ? differenceInDays(secActualEnd, secActualStart) + 1 : null;

              // Building section plan row - level 4
              const secPlanRow = worksheet.addRow({
                name: `        ${group.number}-${bldSection.sectionNumber}с — план`,
                planStart: secPlanStart || null,
                actualStart: secActualStart || null,
                planEnd: secPlanEnd || null,
                actualEnd: secActualEnd || null,
                planDuration: secPlanDur ?? '—',
                actualDuration: '',
              });
              secPlanRow.outlineLevel = 4;
              secPlanRow.font = { size: 9, color: { argb: 'FF6B7280' } };
              secPlanRow.height = 13;
              timeUnits.forEach((_, idx) => {
                secPlanRow.getCell(startCol + idx).border = {
                  top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                  left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                  bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                  right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
                };
              });

              // Building section actual row - level 4
              const secActualRow = worksheet.addRow({
                name: `        ${group.number}-${bldSection.sectionNumber}с — факт`,
                planStart: secPlanStart || null,
                actualStart: secActualStart || null,
                planEnd: secPlanEnd || null,
                actualEnd: secActualEnd || null,
                planDuration: '',
                actualDuration: secActualDur ?? '—',
              });
              secActualRow.outlineLevel = 4;
              secActualRow.font = { size: 9, color: { argb: 'FF6B7280' } };
              secActualRow.height = 13;
              timeUnits.forEach((_, idx) => {
                secActualRow.getCell(startCol + idx).border = {
                  top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                  left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                  bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                  right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
                };
              });
            });
          }
        });
      });
    });
  });

  // Add borders to all cells
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      if (!cell.border) {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        };
      }
    });
  });

  // Add conditional formatting for dynamic timeline colors
  const dataEndRow = worksheet.rowCount;
  const timelineRef = `${firstTimelineColLetter}3:${lastTimelineColLetter}${dataEndRow}`;
  
  // Helper function to create cell-based formula (each cell compares its column date with row dates)
  // Row 2 contains timeline dates, columns B-E contain plan/actual start/end dates
  // Formulas use relative column (no $) for timeline date and fixed row reference ($2) for dates row
  
  // Rule 1: Blue (plan) - for plan rows, timeline date is within plan range
  // Formula: If name contains "план" AND timeline_date >= planStart AND timeline_date <= planEnd
  worksheet.addConditionalFormatting({
    ref: timelineRef,
    rules: [{
      type: 'expression',
      formulae: [`AND(ISNUMBER(FIND("план",$A3)), ${firstTimelineColLetter}$2>=$B3, ${firstTimelineColLetter}$2<=$D3, NOT(ISBLANK($B3)), NOT(ISBLANK($D3)))`],
      style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: COLORS.plan } } },
      priority: 4
    }]
  });

  // Rule 2: Red (delay) - for actual rows, timeline date is after plan end but within actual range
  // Formula: If name contains "факт" AND timeline_date > planEnd AND timeline_date <= actualEnd
  worksheet.addConditionalFormatting({
    ref: timelineRef,
    rules: [{
      type: 'expression',
      formulae: [`AND(ISNUMBER(FIND("факт",$A3)), ${firstTimelineColLetter}$2>$D3, ${firstTimelineColLetter}$2<=$E3, NOT(ISBLANK($D3)), NOT(ISBLANK($E3)))`],
      style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: COLORS.delay } } },
      priority: 1
    }]
  });

  // Rule 3: Green (ahead) - for actual rows, timeline date is before plan start but within actual range
  // Formula: If name contains "факт" AND timeline_date >= actualStart AND timeline_date < planStart
  worksheet.addConditionalFormatting({
    ref: timelineRef,
    rules: [{
      type: 'expression',
      formulae: [`AND(ISNUMBER(FIND("факт",$A3)), ${firstTimelineColLetter}$2>=$C3, ${firstTimelineColLetter}$2<$B3, NOT(ISBLANK($B3)), NOT(ISBLANK($C3)))`],
      style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: COLORS.ahead } } },
      priority: 2
    }]
  });

  // Rule 4: Lilac (actual on-time) - for actual rows, timeline date is within actual range and within plan range
  // Formula: If name contains "факт" AND timeline_date >= actualStart AND timeline_date <= actualEnd AND within plan
  worksheet.addConditionalFormatting({
    ref: timelineRef,
    rules: [{
      type: 'expression',
      formulae: [`AND(ISNUMBER(FIND("факт",$A3)), ${firstTimelineColLetter}$2>=$C3, ${firstTimelineColLetter}$2<=$E3, ${firstTimelineColLetter}$2>=$B3, ${firstTimelineColLetter}$2<=$D3, NOT(ISBLANK($C3)), NOT(ISBLANK($E3)))`],
      style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: COLORS.actual } } },
      priority: 3
    }]
  });

  // Add legend at the bottom
  const legendStartRow = worksheet.rowCount + 2;
  worksheet.getCell(legendStartRow, 1).value = 'Легенда:';
  worksheet.getCell(legendStartRow, 1).font = { bold: true };
  
  const legendItems = [
    { color: COLORS.plan, label: 'План' },
    { color: COLORS.actual, label: 'Факт' },
    { color: COLORS.delay, label: 'Отставание' },
    { color: COLORS.ahead, label: 'Опережение' },
  ];

  legendItems.forEach((item, idx) => {
    const row = legendStartRow + idx + 1;
    worksheet.getCell(row, 1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: item.color }
    };
    worksheet.getCell(row, 2).value = item.label;
  });

  // Generate file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const filename = `КСП_${format(new Date(), 'yyyy-MM-dd_HH-mm', { locale: ru })}.xlsx`;
  saveAs(blob, filename);
}

export default function KSP() {
  const { data: worksTree, isLoading } = useWorksTree();
  const [viewMode, setViewMode] = useState<ViewMode>("weeks");
  const [expandedDocs, setExpandedDocs] = useState<Set<number>>(new Set());
  const [expandedBlocks, setExpandedBlocks] = useState<Set<number>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const todayColumnRef = useRef<HTMLTableCellElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);
  const { registerLeftRow, getRowHeight } = useSyncedRowHeights();

  const documents = (worksTree || []) as DocumentNode[];
  const today = useMemo(() => startOfDay(new Date()), []);

  const allWorks = useMemo(() => {
    const works: WorkTreeItem[] = [];
    documents.forEach(doc => {
      doc.blocks?.forEach(block => {
        block.sections?.forEach(section => {
          section.groups?.forEach(group => {
            group.works?.forEach(work => works.push(work));
          });
        });
      });
    });
    return works;
  }, [documents]);

  const allWorksForDependencies = useMemo((): AllWorkItem[] => {
    const items: AllWorkItem[] = [];
    documents.forEach(doc => {
      doc.blocks?.forEach(block => {
        block.sections?.forEach(section => {
          section.groups?.forEach(group => {
            const work = group.works?.[0];
            if (work) {
              items.push({
                id: work.id,
                groupNumber: group.number,
                groupName: group.name,
              });
            }
          });
        });
      });
    });
    return items;
  }, [documents]);

  const dateRange = useMemo(() => {
    if (allWorks.length === 0) {
      return {
        start: startOfWeek(today, { weekStartsOn: 1 }),
        end: endOfWeek(addDays(today, 60), { weekStartsOn: 1 })
      };
    }

    let minDate = new Date();
    let maxDate = new Date();
    let hasValidDate = false;

    allWorks.forEach(work => {
      const dates = [work.planStartDate, work.planEndDate, work.actualStartDate, work.actualEndDate]
        .filter(d => d && d.trim() !== "")
        .map(d => parseISO(d!));

      dates.forEach(date => {
        if (!hasValidDate) {
          minDate = date;
          maxDate = date;
          hasValidDate = true;
        } else {
          if (isBefore(date, minDate)) minDate = date;
          if (isAfter(date, maxDate)) maxDate = date;
        }
      });
    });

    if (!hasValidDate) {
      return {
        start: startOfWeek(today, { weekStartsOn: 1 }),
        end: endOfWeek(addDays(today, 60), { weekStartsOn: 1 })
      };
    }

    return {
      start: startOfWeek(addDays(minDate, -7), { weekStartsOn: 1 }),
      end: endOfWeek(addDays(maxDate, 14), { weekStartsOn: 1 })
    };
  }, [allWorks, today]);

  const timeUnits = useMemo(() => {
    if (viewMode === "days") {
      return eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    } else {
      return eachWeekOfInterval({ start: dateRange.start, end: dateRange.end }, { weekStartsOn: 1 });
    }
  }, [dateRange, viewMode]);

  const todayIndex = useMemo(() => {
    return timeUnits.findIndex(unit => {
      if (viewMode === "days") {
        return isSameDay(unit, today);
      } else {
        return isWithinInterval(today, { start: unit, end: endOfWeek(unit, { weekStartsOn: 1 }) });
      }
    });
  }, [timeUnits, today, viewMode]);

  useEffect(() => {
    if (!hasScrolled && !isLoading && todayIndex >= 0 && todayColumnRef.current) {
      const timer = setTimeout(() => {
        todayColumnRef.current?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'instant' });
        setHasScrolled(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [hasScrolled, isLoading, todayIndex]);

  const toggleDoc = (id: number) => {
    const newDocsSet = new Set(expandedDocs);
    const isExpanding = !newDocsSet.has(id);
    
    if (isExpanding) {
      newDocsSet.add(id);
      // Find the document and expand all its blocks and sections
      const doc = documents.find(d => d.id === id);
      if (doc?.blocks) {
        const newBlocksSet = new Set(expandedBlocks);
        const newSectionsSet = new Set(expandedSections);
        doc.blocks.forEach(block => {
          newBlocksSet.add(block.id);
          block.sections?.forEach(section => {
            newSectionsSet.add(section.id);
          });
        });
        setExpandedBlocks(newBlocksSet);
        setExpandedSections(newSectionsSet);
      }
    } else {
      newDocsSet.delete(id);
    }
    setExpandedDocs(newDocsSet);
  };

  const toggleBlock = (id: number) => {
    const newSet = new Set(expandedBlocks);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedBlocks(newSet);
  };

  const toggleSection = (id: number) => {
    const newSet = new Set(expandedSections);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedSections(newSet);
  };

  const toggleGroup = (id: number) => {
    const newSet = new Set(expandedGroups);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedGroups(newSet);
  };

  const expandAll = () => {
    setExpandedDocs(new Set(documents.map(d => d.id)));
    const allBlockIds = documents.flatMap(d => d.blocks?.map(b => b.id) || []);
    setExpandedBlocks(new Set(allBlockIds));
    const allSectionIds = documents.flatMap(d => 
      d.blocks?.flatMap(b => b.sections?.map(s => s.id) || []) || []
    );
    setExpandedSections(new Set(allSectionIds));
    // Also expand all groups that have building sections
    const allGroupIds = documents.flatMap(d => 
      d.blocks?.flatMap(b => 
        b.sections?.flatMap(s => 
          s.groups?.filter(g => g.works?.some(w => (w.sectionsCount || 1) > 1)).map(g => g.id) || []
        ) || []
      ) || []
    );
    setExpandedGroups(new Set(allGroupIds));
  };

  const collapseAll = () => {
    setExpandedDocs(new Set());
    setExpandedBlocks(new Set());
    setExpandedSections(new Set());
    setExpandedGroups(new Set());
  };

  // Drag-to-pan state for chart area
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ x: 0, y: 0 });
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);

  // Handle window-level mouseup to prevent stuck dragging state
  useEffect(() => {
    const handleWindowMouseUp = () => {
      setIsDragging(false);
    };
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => window.removeEventListener('mouseup', handleWindowMouseUp);
  }, []);

  const hasExpanded = expandedDocs.size > 0 || expandedBlocks.size > 0 || expandedSections.size > 0 || expandedGroups.size > 0;
  
  const COL_NAME_WIDTH = hasExpanded ? 540 : 270;
  const COL_START_WIDTH = 70;
  const COL_END_WIDTH = 70;
  const COL_DURATION_WIDTH = 65;
  const leftTableWidth = COL_NAME_WIDTH + COL_START_WIDTH + COL_END_WIDTH + COL_DURATION_WIDTH;
  
  const CELL_WIDTH = viewMode === 'days' ? 40 : 60;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background/50 p-6">
        <Skeleton className="h-12 w-full mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (chartContainerRef.current && leftPanelRef.current) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setScrollStart({ 
        x: chartContainerRef.current.scrollLeft, 
        y: leftPanelRef.current.scrollTop 
      });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !chartContainerRef.current || !leftPanelRef.current) return;
    const deltaX = dragStart.x - e.clientX;
    const deltaY = dragStart.y - e.clientY;
    chartContainerRef.current.scrollLeft = scrollStart.x + deltaX;
    leftPanelRef.current.scrollTop = scrollStart.y + deltaY;
    // Sync header horizontal scroll
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = scrollStart.x + deltaX;
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // Sync header horizontal scroll with chart body scroll
  const handleChartScroll = () => {
    if (headerScrollRef.current && chartContainerRef.current) {
      headerScrollRef.current.scrollLeft = chartContainerRef.current.scrollLeft;
    }
  };

  const HEADER_HEIGHT = 64; // h-16 = 64px

  return (
    <div className="h-screen bg-background/50 flex flex-col overflow-hidden">
      <header className="bg-card border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-card/80 flex-shrink-0">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="bg-primary text-primary-foreground p-2 rounded-lg">
              <CalendarDays className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold font-display tracking-tight text-foreground">
              Календарно-сетевое планирование
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              variant={viewMode === "weeks" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setViewMode("weeks")}
              data-testid="button-view-weeks"
            >
              По неделям
            </Button>
            <Button 
              variant={viewMode === "days" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setViewMode("days")}
              data-testid="button-view-days"
            >
              По дням
            </Button>
            <Button variant="ghost" size="sm" onClick={expandAll} data-testid="button-expand-all">
              Развернуть все
            </Button>
            <Button variant="ghost" size="sm" onClick={collapseAll} data-testid="button-collapse-all">
              Свернуть все
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => exportToExcel(documents, timeUnits, viewMode, dateRange)}
              data-testid="button-export-excel"
            >
              <Download className="w-4 h-4 mr-2" />
              Выгрузка
            </Button>
          </div>
        </div>
      </header>
      <RowHeightsContext.Provider value={{ registerLeftRow, getRowHeight }}>
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Fixed Header Row */}
          <div className="flex flex-shrink-0 bg-card z-30">
            {/* Left Header */}
            <div 
              className="flex-shrink-0 border-r border-border bg-card" 
              style={{ width: leftTableWidth }}
            >
              <table className="w-full border-collapse text-sm" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: COL_NAME_WIDTH }} />
                  <col style={{ width: COL_START_WIDTH }} />
                  <col style={{ width: COL_END_WIDTH }} />
                  <col style={{ width: COL_DURATION_WIDTH }} />
                </colgroup>
                <thead>
                  <tr className="h-12">
                    <th className="border-b border-r border-border bg-muted p-2 text-left font-medium h-12">
                      Наименование
                    </th>
                    <th className="border-b border-r border-border bg-muted p-1 text-center font-medium text-xs h-12">
                      Начало
                      <div className="text-muted-foreground text-[10px]">план / факт</div>
                    </th>
                    <th className="border-b border-r border-border bg-muted p-1 text-center font-medium text-xs h-12">
                      Конец
                      <div className="text-muted-foreground text-[10px]">план / факт</div>
                    </th>
                    <th className="border-b border-border bg-muted p-1 text-center font-medium text-xs h-12">
                      Длит-ть
                      <div className="text-muted-foreground text-[10px]">план / факт</div>
                    </th>
                  </tr>
                </thead>
              </table>
            </div>
            {/* Right Header - syncs with horizontal scroll */}
            <div 
              ref={headerScrollRef}
              className="flex-1 overflow-x-auto scrollbar-hide"
            >
              <div style={{ minWidth: timeUnits.length * CELL_WIDTH }}>
                <table className="border-collapse text-sm" style={{ tableLayout: 'fixed', width: timeUnits.length * CELL_WIDTH }}>
                  <colgroup>
                    {timeUnits.map((_, idx) => (
                      <col key={idx} style={{ width: CELL_WIDTH }} />
                    ))}
                  </colgroup>
                  <thead>
                    <tr className="h-12">
                      {timeUnits.map((unit, idx) => {
                        const isToday = viewMode === "days" 
                          ? isSameDay(unit, today)
                          : isWithinInterval(today, { start: unit, end: endOfWeek(unit, { weekStartsOn: 1 }) });
                        
                        return (
                          <th 
                            key={idx}
                            ref={isToday ? todayColumnRef : undefined}
                            className={`border-b border-r border-border p-0.5 text-center font-medium text-[10px] h-12 ${isToday ? 'bg-primary/20' : 'bg-muted/50'}`}
                          >
                            <div className="text-[9px] leading-tight">{format(unit, "dd.MM.yy", { locale: ru })}</div>
                            <div className="text-muted-foreground text-[9px] leading-tight">
                              {viewMode === "days" 
                                ? format(unit, "EEE", { locale: ru })
                                : `Н${format(unit, "w", { locale: ru })}`
                              }
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                </table>
              </div>
            </div>
          </div>

          {/* Scrollable Body */}
          <div 
            ref={leftPanelRef}
            className="flex-1 overflow-y-auto overflow-x-hidden"
          >
            <div className="flex">
              {/* Left Body */}
              <div 
                className="flex-shrink-0 border-r border-border bg-card" 
                style={{ width: leftTableWidth }}
              >
                <table className="w-full border-collapse text-sm" style={{ tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: COL_NAME_WIDTH }} />
                    <col style={{ width: COL_START_WIDTH }} />
                    <col style={{ width: COL_END_WIDTH }} />
                    <col style={{ width: COL_DURATION_WIDTH }} />
                  </colgroup>
                  <tbody>
                    {documents.map(doc => (
                      <DocumentLeftRows
                        key={doc.id}
                        doc={doc}
                        isExpanded={expandedDocs.has(doc.id)}
                        expandedBlocks={expandedBlocks}
                        expandedSections={expandedSections}
                        expandedGroups={expandedGroups}
                        onToggleDoc={() => toggleDoc(doc.id)}
                        onToggleBlock={toggleBlock}
                        onToggleSection={toggleSection}
                        onToggleGroup={toggleGroup}
                        allWorks={allWorksForDependencies}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Right Body */}
              <div 
                ref={chartContainerRef}
                className="flex-1 overflow-x-auto overflow-y-hidden select-none"
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onScroll={handleChartScroll}
              >
                <div style={{ minWidth: timeUnits.length * CELL_WIDTH, position: 'relative' }}>
                  <DependencyArrows 
                    containerRef={chartContainerRef}
                    timeUnits={timeUnits}
                    cellWidth={CELL_WIDTH}
                    dateRange={dateRange}
                    viewMode={viewMode}
                  />
                  <table className="border-collapse text-sm" style={{ tableLayout: 'fixed', width: timeUnits.length * CELL_WIDTH }}>
                    <colgroup>
                      {timeUnits.map((_, idx) => (
                        <col key={idx} style={{ width: CELL_WIDTH }} />
                      ))}
                    </colgroup>
                    <tbody>
                      {documents.map(doc => (
                        <DocumentRightRows
                          key={doc.id}
                          doc={doc}
                          timeUnits={timeUnits}
                          viewMode={viewMode}
                          today={today}
                          isExpanded={expandedDocs.has(doc.id)}
                          expandedBlocks={expandedBlocks}
                          expandedSections={expandedSections}
                          expandedGroups={expandedGroups}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </RowHeightsContext.Provider>
      <div className="bg-card border-t border-border p-3">
        <div className="container mx-auto flex items-center gap-6 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-blue-500 rounded-sm" />
            <span className="text-muted-foreground">План</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded-sm bg-[#c8a2c8]" />
            <span className="text-muted-foreground">Факт</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-red-500 rounded-sm" />
            <span className="text-muted-foreground">Отставание</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-green-500 rounded-sm" />
            <span className="text-muted-foreground">Опережение</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 border-t-2 border-dashed border-primary" style={{ width: 16 }} />
            <span className="text-muted-foreground">Текущая дата</span>
          </div>
          <div className="border-l border-border pl-4 ml-2 flex items-center gap-4">
            <span className="text-muted-foreground font-medium">Зависимости:</span>
            <div className="flex items-center gap-2">
              <svg width="20" height="10"><line x1="0" y1="5" x2="14" y2="5" stroke={DEPENDENCY_COLORS.FS} strokeWidth="2"/><polygon points="14,2 20,5 14,8" fill={DEPENDENCY_COLORS.FS}/></svg>
              <span className="text-muted-foreground">{DEPENDENCY_LABELS.FS}</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="20" height="10"><line x1="0" y1="5" x2="14" y2="5" stroke={DEPENDENCY_COLORS.SS} strokeWidth="2"/><polygon points="14,2 20,5 14,8" fill={DEPENDENCY_COLORS.SS}/></svg>
              <span className="text-muted-foreground">{DEPENDENCY_LABELS.SS}</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="20" height="10"><line x1="0" y1="5" x2="14" y2="5" stroke={DEPENDENCY_COLORS.FF} strokeWidth="2"/><polygon points="14,2 20,5 14,8" fill={DEPENDENCY_COLORS.FF}/></svg>
              <span className="text-muted-foreground">{DEPENDENCY_LABELS.FF}</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="20" height="10"><line x1="0" y1="5" x2="14" y2="5" stroke={DEPENDENCY_COLORS.SF} strokeWidth="2"/><polygon points="14,2 20,5 14,8" fill={DEPENDENCY_COLORS.SF}/></svg>
              <span className="text-muted-foreground">{DEPENDENCY_LABELS.SF}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DocumentLeftRows({
  doc,
  isExpanded,
  expandedBlocks,
  expandedSections,
  expandedGroups,
  onToggleDoc,
  onToggleBlock,
  onToggleSection,
  onToggleGroup,
  allWorks
}: {
  doc: DocumentNode;
  isExpanded: boolean;
  expandedBlocks: Set<number>;
  expandedSections: Set<number>;
  expandedGroups: Set<number>;
  onToggleDoc: () => void;
  onToggleBlock: (id: number) => void;
  onToggleSection: (id: number) => void;
  onToggleGroup: (id: number) => void;
  allWorks: AllWorkItem[];
}) {
  const { registerLeftRow } = useRowHeights();
  const rowKey = `doc-${doc.id}`;
  
  return (
    <>
      <tr 
        ref={(el) => registerLeftRow(rowKey, el)}
        className="bg-primary/20 hover:bg-primary/30 transition-colors"
      >
        <td className="border-b border-r border-border p-2 font-bold">
          <button
            onClick={onToggleDoc}
            className="flex items-center gap-2 w-full text-left"
            data-testid={`button-toggle-doc-${doc.id}`}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span className="truncate">{doc.name}</span>
          </button>
        </td>
        <td className="border-b border-r border-border bg-primary/10" />
        <td className="border-b border-r border-border bg-primary/10" />
        <td className="border-b border-border bg-primary/10" />
      </tr>
      {isExpanded && doc.blocks?.map(block => (
        <BlockLeftRows
          key={block.id}
          block={block}
          isExpanded={expandedBlocks.has(block.id)}
          expandedSections={expandedSections}
          expandedGroups={expandedGroups}
          onToggleBlock={() => onToggleBlock(block.id)}
          onToggleSection={onToggleSection}
          onToggleGroup={onToggleGroup}
          indentLevel={1}
          allWorks={allWorks}
        />
      ))}
    </>
  );
}

function BlockLeftRows({
  block,
  isExpanded,
  expandedSections,
  expandedGroups,
  onToggleBlock,
  onToggleSection,
  onToggleGroup,
  indentLevel,
  allWorks
}: {
  block: BlockNode;
  isExpanded: boolean;
  expandedSections: Set<number>;
  expandedGroups: Set<number>;
  onToggleBlock: () => void;
  onToggleSection: (id: number) => void;
  onToggleGroup: (id: number) => void;
  indentLevel: number;
  allWorks: AllWorkItem[];
}) {
  const { registerLeftRow } = useRowHeights();
  const rowKey = `block-${block.id}`;
  
  return (
    <>
      <tr 
        ref={(el) => registerLeftRow(rowKey, el)}
        className="bg-primary/10 hover:bg-primary/20 transition-colors"
      >
        <td 
          className="border-b border-r border-border p-2 font-bold"
          style={{ paddingLeft: `${indentLevel * 16 + 8}px` }}
        >
          <button
            onClick={onToggleBlock}
            className="flex items-center gap-2 w-full text-left"
            data-testid={`button-toggle-block-${block.id}`}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span className="text-muted-foreground text-xs mr-1">{block.number}</span>
            <span className="truncate">{block.name}</span>
          </button>
        </td>
        <td className="border-b border-r border-border bg-primary/5" />
        <td className="border-b border-r border-border bg-primary/5" />
        <td className="border-b border-border bg-primary/5" />
      </tr>
      {isExpanded && block.sections?.map(section => (
        <SectionLeftRows
          key={section.id}
          section={section}
          isExpanded={expandedSections.has(section.id)}
          expandedGroups={expandedGroups}
          onToggleSection={() => onToggleSection(section.id)}
          onToggleGroup={onToggleGroup}
          indentLevel={indentLevel + 1}
          allWorks={allWorks}
        />
      ))}
    </>
  );
}

function SectionLeftRows({
  section,
  isExpanded,
  expandedGroups,
  onToggleSection,
  onToggleGroup,
  indentLevel,
  allWorks
}: {
  section: SectionNode;
  isExpanded: boolean;
  expandedGroups: Set<number>;
  onToggleSection: () => void;
  onToggleGroup: (id: number) => void;
  indentLevel: number;
  allWorks: AllWorkItem[];
}) {
  const { registerLeftRow } = useRowHeights();
  const rowKey = `section-${section.id}`;
  
  return (
    <>
      <tr 
        ref={(el) => registerLeftRow(rowKey, el)}
        className="bg-secondary/30 hover:bg-secondary/50 transition-colors"
      >
        <td 
          className="border-b border-r border-border p-2 font-semibold"
          style={{ paddingLeft: `${indentLevel * 16 + 8}px` }}
        >
          <button
            onClick={onToggleSection}
            className="flex items-center gap-2 w-full text-left"
            data-testid={`button-toggle-section-${section.id}`}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span className="text-muted-foreground text-xs mr-1">{section.number}</span>
            <span className="truncate">{section.name}</span>
          </button>
        </td>
        <td className="border-b border-r border-border bg-secondary/10" />
        <td className="border-b border-r border-border bg-secondary/10" />
        <td className="border-b border-border bg-secondary/10" />
      </tr>
      {isExpanded && section.groups?.map(group => (
        <GroupLeftRow
          key={group.id}
          group={group}
          isExpanded={expandedGroups.has(group.id)}
          onToggleGroup={() => onToggleGroup(group.id)}
          indentLevel={indentLevel + 1}
          allWorks={allWorks}
        />
      ))}
    </>
  );
}

interface AllWorkItem {
  id: number;
  groupNumber: string;
  groupName: string;
}

function GroupLeftRow({
  group,
  isExpanded,
  onToggleGroup,
  indentLevel,
  allWorks
}: {
  group: GroupNode;
  isExpanded: boolean;
  onToggleGroup: () => void;
  indentLevel: number;
  allWorks: AllWorkItem[];
}) {
  const { registerLeftRow } = useRowHeights();
  const rowKey = `group-${group.id}`;
  const { planStart, planEnd, actualStart, actualEnd } = getGroupDates(group);
  const planDuration = planStart && planEnd ? differenceInDays(planEnd, planStart) + 1 : null;
  const actualDuration = actualStart && actualEnd ? differenceInDays(actualEnd, actualStart) + 1 : null;
  const startDeviation = planStart && actualStart ? differenceInDays(actualStart, planStart) : null;
  const endDeviation = planEnd && actualEnd ? differenceInDays(actualEnd, planEnd) : null;
  const durationDeviation = planDuration && actualDuration ? actualDuration - planDuration : null;

  const work = group.works?.[0];
  const workId = work?.id;
  const sectionsCount = work?.sectionsCount || 1;
  const hasBuildingSections = sectionsCount > 1;
  const buildingSections = work?.buildingSections || [];

  const updateWorkDates = useUpdateWorkDates();
  const updateSectionDates = useUpdateSectionDates();
  const { data: constraints } = useDependencyConstraints(workId || null);

  const minActualStartDate = useMemo(() => {
    if (!constraints || constraints.length === 0) return null;
    return calculateMinActualStartDate(constraints);
  }, [constraints]);

  const disabledDays = useMemo(() => getDisabledDays(minActualStartDate), [minActualStartDate]);

  const handleWorkDateChange = (field: 'planStartDate' | 'planEndDate' | 'actualStartDate' | 'actualEndDate', value: string | null) => {
    if (!workId) return;
    updateWorkDates.mutate({ workId, [field]: value });
  };

  const handleSectionDateChange = (sectionNumber: number, field: 'planStartDate' | 'planEndDate' | 'actualStartDate' | 'actualEndDate', value: string | null) => {
    if (!workId) return;
    updateSectionDates.mutate({ workId, sectionNumber, [field]: value });
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    return format(date, "dd.MM", { locale: ru });
  };

  const getDeviationIndicator = (deviation: number | null) => {
    if (deviation === null || deviation === 0) return null;
    const isNegative = deviation < 0;
    const color = isNegative ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
    const bgColor = isNegative ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30";
    const sign = isNegative ? "" : "+";
    return (
      <span className={`text-[9px] px-1 rounded ${color} ${bgColor}`}>
        {sign}{deviation}д
      </span>
    );
  };

  const getSectionDuration = (section: BuildingSectionData) => {
    if (!section.planStartDate || !section.planEndDate) return { plan: null, actual: null };
    const planDur = differenceInDays(parseISO(section.planEndDate), parseISO(section.planStartDate)) + 1;
    let actualDur = null;
    if (section.actualStartDate && section.actualEndDate) {
      actualDur = differenceInDays(parseISO(section.actualEndDate), parseISO(section.actualStartDate)) + 1;
    }
    return { plan: planDur, actual: actualDur };
  };

  const canEditMainWork = !hasBuildingSections;

  return (
    <>
      <tr 
        ref={(el) => registerLeftRow(rowKey, el)}
        className="hover:bg-muted/50 transition-colors"
      >
        <td 
          className="border-b border-r border-border p-2"
          style={{ paddingLeft: `${indentLevel * 16 + 8}px` }}
        >
          <div className="flex items-center gap-2">
            {hasBuildingSections ? (
              <button
                onClick={onToggleGroup}
                className="flex items-center gap-1"
                data-testid={`button-toggle-group-${group.id}`}
              >
                {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </button>
            ) : (
              <div className="w-4" />
            )}
            <span className="text-muted-foreground text-xs">{group.number}</span>
            <span className="text-foreground truncate flex-1">{group.name}</span>
            {workId && (
              <DependencyDialog
                workId={workId}
                workNumber={group.number}
                workName={group.name}
                allWorks={allWorks}
              />
            )}
          </div>
        </td>
        <td className="border-b border-r border-border p-1 text-center text-xs">
          <div className="flex flex-col items-center gap-0.5">
            {canEditMainWork && workId ? (
              <>
                <DatePickerCell
                  value={work?.planStartDate || null}
                  onChange={(v) => handleWorkDateChange('planStartDate', v)}
                  isPlan
                />
                <DatePickerCell
                  value={work?.actualStartDate || null}
                  onChange={(v) => handleWorkDateChange('actualStartDate', v)}
                  disabledDays={disabledDays}
                />
              </>
            ) : (
              <>
                <span className="text-muted-foreground">{formatDate(planStart)}</span>
                <span className="font-medium">{formatDate(actualStart)}</span>
              </>
            )}
            {getDeviationIndicator(startDeviation)}
          </div>
        </td>
        <td className="border-b border-r border-border p-1 text-center text-xs">
          <div className="flex flex-col items-center gap-0.5">
            {canEditMainWork && workId ? (
              <>
                <DatePickerCell
                  value={work?.planEndDate || null}
                  onChange={(v) => handleWorkDateChange('planEndDate', v)}
                  isPlan
                />
                <DatePickerCell
                  value={work?.actualEndDate || null}
                  onChange={(v) => handleWorkDateChange('actualEndDate', v)}
                />
              </>
            ) : (
              <>
                <span className="text-muted-foreground">{formatDate(planEnd)}</span>
                <span className="font-medium">{formatDate(actualEnd)}</span>
              </>
            )}
            {getDeviationIndicator(endDeviation)}
          </div>
        </td>
        <td className="border-b border-border p-1 text-center text-xs">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-muted-foreground">{planDuration ?? "—"}</span>
            <span className="font-medium">{actualDuration ?? "—"}</span>
            {getDeviationIndicator(durationDeviation)}
          </div>
        </td>
      </tr>
      {isExpanded && hasBuildingSections && buildingSections.map(section => {
        const { plan: secPlanDur, actual: secActualDur } = getSectionDuration(section);
        return (
          <tr 
            key={`${group.id}-section-${section.sectionNumber}`}
            ref={(el) => registerLeftRow(`group-${group.id}-section-${section.sectionNumber}`, el)}
            className="hover:bg-muted/30 transition-colors bg-muted/10"
          >
            <td 
              className="border-b border-r border-border p-2 text-muted-foreground"
              style={{ paddingLeft: `${(indentLevel + 1) * 16 + 8}px` }}
            >
              <span className="text-xs">{group.number}-{section.sectionNumber}с</span>
            </td>
            <td className="border-b border-r border-border p-1 text-center text-xs">
              <div className="flex flex-col items-center gap-0.5">
                {workId ? (
                  <>
                    <DatePickerCell
                      value={section.planStartDate}
                      onChange={(v) => handleSectionDateChange(section.sectionNumber, 'planStartDate', v)}
                      isPlan
                    />
                    <DatePickerCell
                      value={section.actualStartDate}
                      onChange={(v) => handleSectionDateChange(section.sectionNumber, 'actualStartDate', v)}
                      disabledDays={disabledDays}
                    />
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground">{section.planStartDate ? format(parseISO(section.planStartDate), "dd.MM", { locale: ru }) : "—"}</span>
                    <span className="font-medium text-muted-foreground">{section.actualStartDate ? format(parseISO(section.actualStartDate), "dd.MM", { locale: ru }) : "—"}</span>
                  </>
                )}
              </div>
            </td>
            <td className="border-b border-r border-border p-1 text-center text-xs">
              <div className="flex flex-col items-center gap-0.5">
                {workId ? (
                  <>
                    <DatePickerCell
                      value={section.planEndDate}
                      onChange={(v) => handleSectionDateChange(section.sectionNumber, 'planEndDate', v)}
                      isPlan
                    />
                    <DatePickerCell
                      value={section.actualEndDate}
                      onChange={(v) => handleSectionDateChange(section.sectionNumber, 'actualEndDate', v)}
                    />
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground">{section.planEndDate ? format(parseISO(section.planEndDate), "dd.MM", { locale: ru }) : "—"}</span>
                    <span className="font-medium text-muted-foreground">{section.actualEndDate ? format(parseISO(section.actualEndDate), "dd.MM", { locale: ru }) : "—"}</span>
                  </>
                )}
              </div>
            </td>
            <td className="border-b border-border p-1 text-center text-xs">
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-muted-foreground">{secPlanDur ?? "—"}</span>
                <span className="font-medium text-muted-foreground">{secActualDur ?? "—"}</span>
              </div>
            </td>
          </tr>
        );
      })}
    </>
  );
}

function DocumentRightRows({
  doc,
  timeUnits,
  viewMode,
  today,
  isExpanded,
  expandedBlocks,
  expandedSections,
  expandedGroups
}: {
  doc: DocumentNode;
  timeUnits: Date[];
  viewMode: ViewMode;
  today: Date;
  isExpanded: boolean;
  expandedBlocks: Set<number>;
  expandedSections: Set<number>;
  expandedGroups: Set<number>;
}) {
  const { getRowHeight } = useRowHeights();
  const rowKey = `doc-${doc.id}`;
  const height = getRowHeight(rowKey);
  
  return (
    <>
      <tr className="bg-primary/20" style={height ? { height } : undefined}>
        {timeUnits.map((unit, idx) => {
          const isToday = viewMode === "days" 
            ? isSameDay(unit, today)
            : isWithinInterval(today, { start: unit, end: endOfWeek(unit, { weekStartsOn: 1 }) });
          
          return (
            <td key={idx} className={`border-b border-r border-border relative ${isToday ? 'bg-primary/30' : 'bg-primary/10'}`}>
              {isToday && <CurrentDateLine viewMode={viewMode} today={today} unit={unit} />}
            </td>
          );
        })}
      </tr>
      {isExpanded && doc.blocks?.map(block => (
        <BlockRightRows
          key={block.id}
          block={block}
          timeUnits={timeUnits}
          viewMode={viewMode}
          today={today}
          isExpanded={expandedBlocks.has(block.id)}
          expandedSections={expandedSections}
          expandedGroups={expandedGroups}
        />
      ))}
    </>
  );
}

function BlockRightRows({
  block,
  timeUnits,
  viewMode,
  today,
  isExpanded,
  expandedSections,
  expandedGroups
}: {
  block: BlockNode;
  timeUnits: Date[];
  viewMode: ViewMode;
  today: Date;
  isExpanded: boolean;
  expandedSections: Set<number>;
  expandedGroups: Set<number>;
}) {
  const { getRowHeight } = useRowHeights();
  const rowKey = `block-${block.id}`;
  const height = getRowHeight(rowKey);
  
  return (
    <>
      <tr className="bg-primary/10" style={height ? { height } : undefined}>
        {timeUnits.map((unit, idx) => {
          const isToday = viewMode === "days" 
            ? isSameDay(unit, today)
            : isWithinInterval(today, { start: unit, end: endOfWeek(unit, { weekStartsOn: 1 }) });
          
          return (
            <td key={idx} className={`border-b border-r border-border relative ${isToday ? 'bg-primary/20' : 'bg-primary/5'}`}>
              {isToday && <CurrentDateLine viewMode={viewMode} today={today} unit={unit} />}
            </td>
          );
        })}
      </tr>
      {isExpanded && block.sections?.map(section => (
        <SectionRightRows
          key={section.id}
          section={section}
          timeUnits={timeUnits}
          viewMode={viewMode}
          today={today}
          isExpanded={expandedSections.has(section.id)}
          expandedGroups={expandedGroups}
        />
      ))}
    </>
  );
}

function SectionRightRows({
  section,
  timeUnits,
  viewMode,
  today,
  isExpanded,
  expandedGroups
}: {
  section: SectionNode;
  timeUnits: Date[];
  viewMode: ViewMode;
  today: Date;
  isExpanded: boolean;
  expandedGroups: Set<number>;
}) {
  const { getRowHeight } = useRowHeights();
  const rowKey = `section-${section.id}`;
  const height = getRowHeight(rowKey);
  
  return (
    <>
      <tr className="bg-secondary/30" style={height ? { height } : undefined}>
        {timeUnits.map((unit, idx) => {
          const isToday = viewMode === "days" 
            ? isSameDay(unit, today)
            : isWithinInterval(today, { start: unit, end: endOfWeek(unit, { weekStartsOn: 1 }) });
          
          return (
            <td key={idx} className={`border-b border-r border-border relative ${isToday ? 'bg-primary/20' : 'bg-secondary/10'}`}>
              {isToday && <CurrentDateLine viewMode={viewMode} today={today} unit={unit} />}
            </td>
          );
        })}
      </tr>
      {isExpanded && section.groups?.map(group => (
        <GroupRightRow
          key={group.id}
          group={group}
          timeUnits={timeUnits}
          viewMode={viewMode}
          today={today}
          isExpanded={expandedGroups.has(group.id)}
        />
      ))}
    </>
  );
}

function GroupRightRow({
  group,
  timeUnits,
  viewMode,
  today,
  isExpanded
}: {
  group: GroupNode;
  timeUnits: Date[];
  viewMode: ViewMode;
  today: Date;
  isExpanded: boolean;
}) {
  const { getRowHeight } = useRowHeights();
  const rowKey = `group-${group.id}`;
  const height = getRowHeight(rowKey);
  const { planStart, planEnd, actualStart, actualEnd } = getGroupDates(group);

  // Check if this group has building sections
  const work = group.works?.[0];
  const sectionsCount = work?.sectionsCount || 1;
  const hasBuildingSections = sectionsCount > 1;
  const buildingSections = work?.buildingSections || [];

  const getCellContent = (unit: Date) => {
    const unitEnd = viewMode === "weeks" ? endOfWeek(unit, { weekStartsOn: 1 }) : unit;
    const unitStart = startOfDay(unit);

    const isInPlanRange = planStart && planEnd && (
      isWithinInterval(unitStart, { start: startOfDay(planStart), end: startOfDay(planEnd) }) ||
      isWithinInterval(unitEnd, { start: startOfDay(planStart), end: startOfDay(planEnd) }) ||
      (isBefore(unitStart, planStart) && isAfter(unitEnd, planEnd))
    );

    const isInActualRange = actualStart && actualEnd && (
      isWithinInterval(unitStart, { start: startOfDay(actualStart), end: startOfDay(actualEnd) }) ||
      isWithinInterval(unitEnd, { start: startOfDay(actualStart), end: startOfDay(actualEnd) }) ||
      (isBefore(unitStart, actualStart) && isAfter(unitEnd, actualEnd))
    );

    const isDelay = planEnd && actualEnd && isAfter(startOfDay(actualEnd), startOfDay(planEnd)) &&
      isWithinInterval(unitStart, { start: startOfDay(planEnd), end: startOfDay(actualEnd) });

    const isAhead = planEnd && actualEnd && isBefore(startOfDay(actualEnd), startOfDay(planEnd)) &&
      isWithinInterval(unitStart, { start: startOfDay(actualEnd), end: startOfDay(planEnd) });

    return { isInPlanRange, isInActualRange, isDelay, isAhead };
  };

  const getSectionCellContent = (unit: Date, section: BuildingSectionData) => {
    const unitEnd = viewMode === "weeks" ? endOfWeek(unit, { weekStartsOn: 1 }) : unit;
    const unitStart = startOfDay(unit);

    const secPlanStart = section.planStartDate ? parseISO(section.planStartDate) : null;
    const secPlanEnd = section.planEndDate ? parseISO(section.planEndDate) : null;
    const secActualStart = section.actualStartDate ? parseISO(section.actualStartDate) : null;
    const secActualEnd = section.actualEndDate ? parseISO(section.actualEndDate) : null;

    const isInPlanRange = secPlanStart && secPlanEnd && (
      isWithinInterval(unitStart, { start: startOfDay(secPlanStart), end: startOfDay(secPlanEnd) }) ||
      isWithinInterval(unitEnd, { start: startOfDay(secPlanStart), end: startOfDay(secPlanEnd) }) ||
      (isBefore(unitStart, secPlanStart) && isAfter(unitEnd, secPlanEnd))
    );

    const isInActualRange = secActualStart && secActualEnd && (
      isWithinInterval(unitStart, { start: startOfDay(secActualStart), end: startOfDay(secActualEnd) }) ||
      isWithinInterval(unitEnd, { start: startOfDay(secActualStart), end: startOfDay(secActualEnd) }) ||
      (isBefore(unitStart, secActualStart) && isAfter(unitEnd, secActualEnd))
    );

    const isDelay = secPlanEnd && secActualEnd && isAfter(startOfDay(secActualEnd), startOfDay(secPlanEnd)) &&
      isWithinInterval(unitStart, { start: startOfDay(secPlanEnd), end: startOfDay(secActualEnd) });

    const isAhead = secPlanEnd && secActualEnd && isBefore(startOfDay(secActualEnd), startOfDay(secPlanEnd)) &&
      isWithinInterval(unitStart, { start: startOfDay(secActualEnd), end: startOfDay(secPlanEnd) });

    return { isInPlanRange, isInActualRange, isDelay, isAhead };
  };

  const workData = work || group.works?.[0];
  
  return (
    <>
      <tr 
        style={height ? { height } : undefined}
        data-work-id={workData?.id}
        data-plan-start={workData?.planStartDate || ''}
        data-plan-end={workData?.planEndDate || ''}
        data-actual-start={workData?.actualStartDate || ''}
        data-actual-end={workData?.actualEndDate || ''}
      >
        {timeUnits.map((unit, idx) => {
          const { isInPlanRange, isInActualRange, isDelay, isAhead } = getCellContent(unit);
          const isToday = viewMode === "days" 
            ? isSameDay(unit, today)
            : isWithinInterval(today, { start: unit, end: endOfWeek(unit, { weekStartsOn: 1 }) });
          
          return (
            <td key={idx} className={`border-b border-r border-border p-0 relative ${isToday ? 'bg-primary/10' : ''}`}>
              <div className="absolute inset-0 flex flex-col">
                <div className={`flex-1 ${isInPlanRange ? 'bg-blue-500' : ''}`} />
                <div className={`flex-1 ${
                  isDelay ? 'bg-red-500' : 
                  isAhead ? 'bg-green-500' : 
                  isInActualRange ? 'bg-[#c8a2c8]' : ''
                }`} />
              </div>
              {isToday && <CurrentDateLine viewMode={viewMode} today={today} unit={unit} />}
            </td>
          );
        })}
      </tr>
      {isExpanded && hasBuildingSections && buildingSections.map(section => {
        const sectionHeight = getRowHeight(`group-${group.id}-section-${section.sectionNumber}`);
        return (
          <tr 
            key={`${group.id}-section-${section.sectionNumber}`} 
            style={sectionHeight ? { height: sectionHeight } : undefined}
            className="bg-muted/10"
          >
            {timeUnits.map((unit, idx) => {
              const { isInPlanRange, isInActualRange, isDelay, isAhead } = getSectionCellContent(unit, section);
              const isToday = viewMode === "days" 
                ? isSameDay(unit, today)
                : isWithinInterval(today, { start: unit, end: endOfWeek(unit, { weekStartsOn: 1 }) });
              
              return (
                <td key={idx} className={`border-b border-r border-border p-0 relative ${isToday ? 'bg-primary/5' : ''}`}>
                  <div className="absolute inset-0 flex flex-col">
                    <div className={`flex-1 ${isInPlanRange ? 'bg-blue-300/60' : ''}`} />
                    <div className={`flex-1 ${
                      isDelay ? 'bg-red-300/60' : 
                      isAhead ? 'bg-green-300/60' : 
                      isInActualRange ? 'bg-[#c8a2c8]/50' : ''
                    }`} />
                  </div>
                  {isToday && <CurrentDateLine viewMode={viewMode} today={today} unit={unit} />}
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );
}
