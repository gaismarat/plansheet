import { useState, useMemo } from "react";
import { useWorksTree } from "@/hooks/use-construction";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, CalendarDays, ChevronRight, ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { addDays, startOfWeek, endOfWeek, format, parseISO, differenceInDays, eachDayOfInterval, eachWeekOfInterval, isWithinInterval, isBefore, isAfter, startOfDay, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

type ViewMode = "days" | "weeks";

interface WorkTreeItem {
  id: number;
  planStartDate: string | null;
  planEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
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

export default function KSP() {
  const { data: worksTree, isLoading } = useWorksTree();
  const [viewMode, setViewMode] = useState<ViewMode>("weeks");
  const [expandedDocs, setExpandedDocs] = useState<Set<number>>(new Set());
  const [expandedBlocks, setExpandedBlocks] = useState<Set<number>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());

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

  const toggleDoc = (id: number) => {
    const newSet = new Set(expandedDocs);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedDocs(newSet);
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

  const expandAll = () => {
    setExpandedDocs(new Set(documents.map(d => d.id)));
    const allBlockIds = documents.flatMap(d => d.blocks?.map(b => b.id) || []);
    setExpandedBlocks(new Set(allBlockIds));
    const allSectionIds = documents.flatMap(d => 
      d.blocks?.flatMap(b => b.sections?.map(s => s.id) || []) || []
    );
    setExpandedSections(new Set(allSectionIds));
  };

  const collapseAll = () => {
    setExpandedDocs(new Set());
    setExpandedBlocks(new Set());
    setExpandedSections(new Set());
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background/50 p-6">
        <Skeleton className="h-12 w-full mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background/50 flex flex-col">
      <header className="bg-card border-b border-border sticky top-0 z-10 backdrop-blur-sm bg-card/80">
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
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden relative">
        <ScrollArea className="h-full">
          <div className="min-w-max relative">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-20 bg-card">
                <tr>
                  <th className="border border-border bg-muted/50 p-2 text-left font-medium min-w-[192px] sticky left-0 z-30">
                    Наименование
                  </th>
                  <th className="border border-border bg-muted/50 p-1 text-center font-medium min-w-[50px] w-[50px] text-xs">
                    Начало
                    <div className="text-muted-foreground text-[10px]">план / факт</div>
                  </th>
                  <th className="border border-border bg-muted/50 p-1 text-center font-medium min-w-[50px] w-[50px] text-xs">
                    Конец
                    <div className="text-muted-foreground text-[10px]">план / факт</div>
                  </th>
                  <th className="border border-border bg-muted/50 p-1 text-center font-medium min-w-[65px] w-[65px] text-xs">
                    Длит-ть
                    <div className="text-muted-foreground text-[10px]">план / факт</div>
                  </th>
                  {timeUnits.map((unit, idx) => {
                    const isToday = viewMode === "days" 
                      ? isSameDay(unit, today)
                      : isWithinInterval(today, { start: unit, end: endOfWeek(unit, { weekStartsOn: 1 }) });
                    
                    return (
                      <th 
                        key={idx} 
                        className={`border border-border bg-muted/50 p-1 text-center font-medium min-w-[40px] text-xs relative ${isToday ? 'bg-primary/20' : ''}`}
                      >
                        {viewMode === "days" 
                          ? format(unit, "dd", { locale: ru })
                          : format(unit, "dd.MM", { locale: ru })
                        }
                        <div className="text-muted-foreground text-[10px]">
                          {viewMode === "days" 
                            ? format(unit, "EEE", { locale: ru })
                            : `Нед ${format(unit, "w", { locale: ru })}`
                          }
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {documents.map(doc => (
                  <DocumentRow 
                    key={doc.id} 
                    doc={doc}
                    timeUnits={timeUnits}
                    viewMode={viewMode}
                    today={today}
                    isExpanded={expandedDocs.has(doc.id)}
                    expandedBlocks={expandedBlocks}
                    expandedSections={expandedSections}
                    onToggleDoc={() => toggleDoc(doc.id)}
                    onToggleBlock={toggleBlock}
                    onToggleSection={toggleSection}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      <div className="bg-card border-t border-border p-3">
        <div className="container mx-auto flex items-center gap-6 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-blue-500 rounded-sm" />
            <span className="text-muted-foreground">План</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-amber-500 rounded-sm" />
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
        </div>
      </div>
    </div>
  );
}

function DocumentRow({ 
  doc, 
  timeUnits, 
  viewMode,
  today,
  isExpanded, 
  expandedBlocks,
  expandedSections,
  onToggleDoc,
  onToggleBlock,
  onToggleSection
}: { 
  doc: DocumentNode;
  timeUnits: Date[];
  viewMode: ViewMode;
  today: Date;
  isExpanded: boolean;
  expandedBlocks: Set<number>;
  expandedSections: Set<number>;
  onToggleDoc: () => void;
  onToggleBlock: (id: number) => void;
  onToggleSection: (id: number) => void;
}) {
  return (
    <>
      <tr className="bg-primary/20 hover:bg-primary/30 transition-colors">
        <td className="border border-border p-2 font-bold sticky left-0 bg-primary/20 z-10">
          <button 
            onClick={onToggleDoc}
            className="flex items-center gap-2 w-full text-left"
            data-testid={`button-toggle-doc-${doc.id}`}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span className="truncate">{doc.name}</span>
          </button>
        </td>
        <td className="border border-border bg-primary/10" />
        <td className="border border-border bg-primary/10" />
        <td className="border border-border bg-primary/10" />
        {timeUnits.map((unit, idx) => {
          const isToday = viewMode === "days" 
            ? isSameDay(unit, today)
            : isWithinInterval(today, { start: unit, end: endOfWeek(unit, { weekStartsOn: 1 }) });
          
          return (
            <td key={idx} className={`border border-border bg-primary/10 relative ${isToday ? 'bg-primary/20' : ''}`}>
              {isToday && <CurrentDateLine viewMode={viewMode} today={today} unit={unit} />}
            </td>
          );
        })}
      </tr>
      {isExpanded && doc.blocks?.map(block => (
        <BlockRow
          key={block.id}
          block={block}
          timeUnits={timeUnits}
          viewMode={viewMode}
          today={today}
          isExpanded={expandedBlocks.has(block.id)}
          expandedSections={expandedSections}
          onToggleBlock={() => onToggleBlock(block.id)}
          onToggleSection={onToggleSection}
          indentLevel={1}
        />
      ))}
    </>
  );
}

function BlockRow({ 
  block, 
  timeUnits, 
  viewMode,
  today,
  isExpanded, 
  expandedSections,
  onToggleBlock,
  onToggleSection,
  indentLevel
}: { 
  block: BlockNode; 
  timeUnits: Date[];
  viewMode: ViewMode;
  today: Date;
  isExpanded: boolean;
  expandedSections: Set<number>;
  onToggleBlock: () => void;
  onToggleSection: (id: number) => void;
  indentLevel: number;
}) {
  return (
    <>
      <tr className="bg-primary/10 hover:bg-primary/20 transition-colors">
        <td 
          className="border border-border p-2 font-bold sticky left-0 bg-primary/10 z-10"
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
        <td className="border border-border bg-primary/5" />
        <td className="border border-border bg-primary/5" />
        <td className="border border-border bg-primary/5" />
        {timeUnits.map((unit, idx) => {
          const isToday = viewMode === "days" 
            ? isSameDay(unit, today)
            : isWithinInterval(today, { start: unit, end: endOfWeek(unit, { weekStartsOn: 1 }) });
          
          return (
            <td key={idx} className={`border border-border bg-primary/5 relative ${isToday ? 'bg-primary/20' : ''}`}>
              {isToday && <CurrentDateLine viewMode={viewMode} today={today} unit={unit} />}
            </td>
          );
        })}
      </tr>
      {isExpanded && block.sections?.map(section => (
        <SectionRow
          key={section.id}
          section={section}
          timeUnits={timeUnits}
          viewMode={viewMode}
          today={today}
          isExpanded={expandedSections.has(section.id)}
          onToggleSection={() => onToggleSection(section.id)}
          indentLevel={indentLevel + 1}
        />
      ))}
    </>
  );
}

function SectionRow({
  section,
  timeUnits,
  viewMode,
  today,
  isExpanded,
  onToggleSection,
  indentLevel
}: {
  section: SectionNode;
  timeUnits: Date[];
  viewMode: ViewMode;
  today: Date;
  isExpanded: boolean;
  onToggleSection: () => void;
  indentLevel: number;
}) {
  return (
    <>
      <tr className="bg-secondary/30 hover:bg-secondary/50 transition-colors">
        <td 
          className="border border-border p-2 font-semibold sticky left-0 bg-secondary/30 z-10" 
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
        <td className="border border-border bg-secondary/10" />
        <td className="border border-border bg-secondary/10" />
        <td className="border border-border bg-secondary/10" />
        {timeUnits.map((unit, idx) => {
          const isToday = viewMode === "days" 
            ? isSameDay(unit, today)
            : isWithinInterval(today, { start: unit, end: endOfWeek(unit, { weekStartsOn: 1 }) });
          
          return (
            <td key={idx} className={`border border-border bg-secondary/10 relative ${isToday ? 'bg-primary/20' : ''}`}>
              {isToday && <CurrentDateLine viewMode={viewMode} today={today} unit={unit} />}
            </td>
          );
        })}
      </tr>
      {isExpanded && section.groups?.map(group => (
        <GroupRow 
          key={group.id} 
          group={group} 
          timeUnits={timeUnits}
          viewMode={viewMode}
          today={today}
          indentLevel={indentLevel + 1}
        />
      ))}
    </>
  );
}

function GroupRow({
  group,
  timeUnits,
  viewMode,
  today,
  indentLevel
}: {
  group: GroupNode;
  timeUnits: Date[];
  viewMode: ViewMode;
  today: Date;
  indentLevel: number;
}) {
  const { planStart, planEnd, actualStart, actualEnd } = getGroupDates(group);

  const planDuration = planStart && planEnd ? differenceInDays(planEnd, planStart) + 1 : null;
  const actualDuration = actualStart && actualEnd ? differenceInDays(actualEnd, actualStart) + 1 : null;

  const startDeviation = planStart && actualStart ? differenceInDays(actualStart, planStart) : null;
  const endDeviation = planEnd && actualEnd ? differenceInDays(actualEnd, planEnd) : null;
  const durationDeviation = planDuration && actualDuration ? actualDuration - planDuration : null;

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

  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    return format(date, "dd.MM", { locale: ru });
  };

  const getDeviationIndicator = (deviation: number | null) => {
    if (deviation === null) return null;
    if (deviation === 0) return null;
    
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

  return (
    <tr className="hover:bg-muted/50 transition-colors">
      <td 
        className="border border-border p-2 sticky left-0 bg-background z-10" 
        style={{ paddingLeft: `${indentLevel * 16 + 8}px` }}
      >
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">{group.number}</span>
          <span className="text-foreground truncate">{group.name}</span>
        </div>
      </td>
      <td className="border border-border p-1 text-center text-xs">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-muted-foreground">{formatDate(planStart)}</span>
          <span className="font-medium">{formatDate(actualStart)}</span>
          {getDeviationIndicator(startDeviation)}
        </div>
      </td>
      <td className="border border-border p-1 text-center text-xs">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-muted-foreground">{formatDate(planEnd)}</span>
          <span className="font-medium">{formatDate(actualEnd)}</span>
          {getDeviationIndicator(endDeviation)}
        </div>
      </td>
      <td className="border border-border p-1 text-center text-xs">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-muted-foreground">{planDuration ?? "—"}</span>
          <span className="font-medium">{actualDuration ?? "—"}</span>
          {getDeviationIndicator(durationDeviation)}
        </div>
      </td>
      {timeUnits.map((unit, idx) => {
        const { isInPlanRange, isInActualRange, isDelay, isAhead } = getCellContent(unit);
        const isToday = viewMode === "days" 
          ? isSameDay(unit, today)
          : isWithinInterval(today, { start: unit, end: endOfWeek(unit, { weekStartsOn: 1 }) });
        
        return (
          <td key={idx} className={`border border-border p-0 h-10 relative ${isToday ? 'bg-primary/10' : ''}`}>
            <div className="absolute inset-0 flex flex-col">
              <div className={`flex-1 ${isInPlanRange ? 'bg-blue-500' : ''}`} />
              <div className={`flex-1 ${
                isDelay ? 'bg-red-500' : 
                isAhead ? 'bg-green-500' : 
                isInActualRange ? 'bg-amber-500' : ''
              }`} />
            </div>
            {isToday && <CurrentDateLine viewMode={viewMode} today={today} unit={unit} />}
          </td>
        );
      })}
    </tr>
  );
}
