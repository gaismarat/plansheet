import { useState, useMemo, useRef, useEffect, createContext, useContext } from "react";
import { useWorksTree } from "@/hooks/use-construction";
import { useSyncedRowHeights } from "@/hooks/use-synced-row-heights";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, CalendarDays, ChevronRight, ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { addDays, startOfWeek, endOfWeek, format, parseISO, differenceInDays, eachDayOfInterval, eachWeekOfInterval, isWithinInterval, isBefore, isAfter, startOfDay, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

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

  const hasExpanded = expandedDocs.size > 0 || expandedBlocks.size > 0 || expandedSections.size > 0 || expandedGroups.size > 0;
  const leftTableWidth = hasExpanded ? 745 : 475;

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
      <RowHeightsContext.Provider value={{ registerLeftRow, getRowHeight }}>
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-shrink-0 border-r border-border bg-card overflow-y-auto" style={{ width: leftTableWidth }}>
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-20 bg-card">
                <tr className="h-12">
                  <th className="border-b border-r border-border bg-muted p-2 text-left font-medium h-12" style={{ width: hasExpanded ? 340 : 170 }}>
                    Наименование
                  </th>
                  <th className="border-b border-r border-border bg-muted p-1 text-center font-medium w-[70px] text-xs h-12">
                    Начало
                    <div className="text-muted-foreground text-[10px]">план / факт</div>
                  </th>
                  <th className="border-b border-r border-border bg-muted p-1 text-center font-medium w-[70px] text-xs h-12">
                    Конец
                    <div className="text-muted-foreground text-[10px]">план / факт</div>
                  </th>
                  <th className="border-b border-border bg-muted p-1 text-center font-medium w-[65px] text-xs h-12">
                    Длит-ть
                    <div className="text-muted-foreground text-[10px]">план / факт</div>
                  </th>
                </tr>
              </thead>
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
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="min-w-max">
                <table className="w-full border-collapse text-sm">
                  <thead className="sticky top-0 z-20 bg-card">
                    <tr className="h-12">
                      {timeUnits.map((unit, idx) => {
                        const isToday = viewMode === "days" 
                          ? isSameDay(unit, today)
                          : isWithinInterval(today, { start: unit, end: endOfWeek(unit, { weekStartsOn: 1 }) });
                        
                        return (
                          <th 
                            key={idx}
                            ref={isToday ? todayColumnRef : undefined}
                            className={`border-b border-r border-border p-0.5 text-center font-medium min-w-[32px] w-[32px] text-[10px] h-12 ${isToday ? 'bg-primary/20' : 'bg-muted/50'}`}
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
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
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
  onToggleGroup
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
  indentLevel
}: {
  block: BlockNode;
  isExpanded: boolean;
  expandedSections: Set<number>;
  expandedGroups: Set<number>;
  onToggleBlock: () => void;
  onToggleSection: (id: number) => void;
  onToggleGroup: (id: number) => void;
  indentLevel: number;
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
  indentLevel
}: {
  section: SectionNode;
  isExpanded: boolean;
  expandedGroups: Set<number>;
  onToggleSection: () => void;
  onToggleGroup: (id: number) => void;
  indentLevel: number;
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
        />
      ))}
    </>
  );
}

function GroupLeftRow({
  group,
  isExpanded,
  onToggleGroup,
  indentLevel
}: {
  group: GroupNode;
  isExpanded: boolean;
  onToggleGroup: () => void;
  indentLevel: number;
}) {
  const { registerLeftRow } = useRowHeights();
  const rowKey = `group-${group.id}`;
  const { planStart, planEnd, actualStart, actualEnd } = getGroupDates(group);
  const planDuration = planStart && planEnd ? differenceInDays(planEnd, planStart) + 1 : null;
  const actualDuration = actualStart && actualEnd ? differenceInDays(actualEnd, actualStart) + 1 : null;
  const startDeviation = planStart && actualStart ? differenceInDays(actualStart, planStart) : null;
  const endDeviation = planEnd && actualEnd ? differenceInDays(actualEnd, planEnd) : null;
  const durationDeviation = planDuration && actualDuration ? actualDuration - planDuration : null;

  // Check if this group has building sections (sectionsCount > 1)
  const work = group.works?.[0];
  const sectionsCount = work?.sectionsCount || 1;
  const hasBuildingSections = sectionsCount > 1;
  const buildingSections = work?.buildingSections || [];

  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    return format(date, "dd.MM", { locale: ru });
  };

  const formatDateString = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      return format(parseISO(dateStr), "dd.MM", { locale: ru });
    } catch {
      return "—";
    }
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
            <span className="text-foreground truncate">{group.name}</span>
          </div>
        </td>
        <td className="border-b border-r border-border p-1 text-center text-xs">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-muted-foreground">{formatDate(planStart)}</span>
            <span className="font-medium">{formatDate(actualStart)}</span>
            {getDeviationIndicator(startDeviation)}
          </div>
        </td>
        <td className="border-b border-r border-border p-1 text-center text-xs">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-muted-foreground">{formatDate(planEnd)}</span>
            <span className="font-medium">{formatDate(actualEnd)}</span>
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
                <span className="text-muted-foreground">{formatDateString(section.planStartDate)}</span>
                <span className="font-medium text-muted-foreground">{formatDateString(section.actualStartDate)}</span>
              </div>
            </td>
            <td className="border-b border-r border-border p-1 text-center text-xs">
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-muted-foreground">{formatDateString(section.planEndDate)}</span>
                <span className="font-medium text-muted-foreground">{formatDateString(section.actualEndDate)}</span>
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

  return (
    <>
      <tr style={height ? { height } : undefined}>
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
