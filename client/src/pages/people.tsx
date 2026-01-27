import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useWorksTree } from "@/hooks/use-construction";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, Users, ChevronRight, ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { type WorkPeople } from "@shared/schema";
import { addDays, startOfWeek, endOfWeek, format, parseISO, eachDayOfInterval, isBefore, isAfter, startOfDay, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface BuildingSectionData {
  sectionNumber: number;
  planStartDate: string | null;
  planEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
}

interface WorkTreeItem {
  id: number;
  name: string;
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

export default function People() {
  const { data: worksTree, isLoading: treeLoading } = useWorksTree();
  const { data: workPeopleData, isLoading: peopleLoading } = useQuery<WorkPeople[]>({
    queryKey: ["/api/work-people"]
  });
  
  const [expandedDocs, setExpandedDocs] = useState<Set<number>>(new Set());
  const [expandedBlocks, setExpandedBlocks] = useState<Set<number>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const todayColumnRef = useRef<HTMLTableCellElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);
  
  // Drag-to-pan state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const isScrollingSyncRef = useRef(false); // Guard against scroll loops

  const isLoading = treeLoading || peopleLoading;
  const documents = (worksTree || []) as DocumentNode[];
  const workPeople = workPeopleData || [];

  const today = useMemo(() => startOfDay(new Date()), []);

  const workPeopleMap = useMemo(() => {
    const map = new Map<string, number>();
    workPeople.forEach(wp => {
      if (wp.sectionNumber) {
        // Section-specific entry: workId-sectionNumber-date
        map.set(`${wp.workId}-${wp.sectionNumber}-${wp.date}`, wp.count);
      } else {
        // Global entry (no section): workId-date
        map.set(`${wp.workId}-${wp.date}`, wp.count);
      }
    });
    return map;
  }, [workPeople]);

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

  const days = useMemo(() => {
    return eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
  }, [dateRange]);

  const todayIndex = useMemo(() => {
    return days.findIndex(day => isSameDay(day, today));
  }, [days, today]);

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

  // Drag-to-pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    // Don't start drag if clicking on an input element
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'BUTTON') return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      scrollLeft: chartContainerRef.current?.scrollLeft || 0,
      scrollTop: leftPanelRef.current?.scrollTop || 0
    });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    isScrollingSyncRef.current = true;
    const newScrollLeft = dragStart.scrollLeft - deltaX;
    const newScrollTop = dragStart.scrollTop - deltaY;
    if (chartContainerRef.current) {
      chartContainerRef.current.scrollLeft = newScrollLeft;
    }
    if (leftPanelRef.current) {
      leftPanelRef.current.scrollTop = newScrollTop;
    }
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = newScrollLeft;
    }
    requestAnimationFrame(() => {
      isScrollingSyncRef.current = false;
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // Sync header scroll with chart body
  const handleChartScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isScrollingSyncRef.current) return;
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };


  const expandAll = () => {
    setExpandedDocs(new Set(documents.map(d => d.id)));
    const allBlockIds = documents.flatMap(d => d.blocks?.map(b => b.id) || []);
    setExpandedBlocks(new Set(allBlockIds));
    const allSectionIds = documents.flatMap(d => 
      d.blocks?.flatMap(b => b.sections?.map(s => s.id) || []) || []
    );
    setExpandedSections(new Set(allSectionIds));
    // Expand groups with multiple sections
    const groupsWithSections = documents.flatMap(d =>
      d.blocks?.flatMap(b =>
        b.sections?.flatMap(s =>
          s.groups?.filter(g => g.works?.some(w => (w.sectionsCount || 1) > 1)).map(g => g.id) || []
        ) || []
      ) || []
    );
    setExpandedGroups(new Set(groupsWithSections));
  };

  const collapseAll = () => {
    setExpandedDocs(new Set());
    setExpandedBlocks(new Set());
    setExpandedSections(new Set());
    setExpandedGroups(new Set());
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background/50 p-6">
        <Skeleton className="h-12 w-full mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const leftTableWidth = expandedDocs.size > 0 || expandedBlocks.size > 0 || expandedSections.size > 0 ? 540 : 300;
  const CELL_WIDTH = 42;

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
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold font-display tracking-tight text-foreground">
              Люди
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" size="sm" onClick={expandAll} data-testid="button-expand-all">
              Развернуть все
            </Button>
            <Button variant="ghost" size="sm" onClick={collapseAll} data-testid="button-collapse-all">
              Свернуть все
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Fixed Header Row */}
        <div className="flex flex-shrink-0 bg-card z-30">
          {/* Left Header */}
          <div 
            className="flex-shrink-0 border-r border-border bg-card" 
            style={{ width: leftTableWidth }}
          >
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="h-12">
                  <th className="border-b border-border bg-muted/50 p-2 text-left font-medium h-12">
                    Наименование
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
            <div style={{ minWidth: days.length * CELL_WIDTH }}>
              <table className="border-collapse text-sm" style={{ tableLayout: 'fixed', width: days.length * CELL_WIDTH }}>
                <thead>
                  <tr>
                    {days.map((day, idx) => {
                      const isToday = isSameDay(day, today);
                      const dayOfWeek = day.getDay();
                      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                      
                      return (
                        <th 
                          key={idx}
                          ref={isToday ? todayColumnRef : undefined}
                          className={`border-b border-r border-border p-0.5 text-center font-medium h-12 ${isToday ? 'bg-primary/20' : isWeekend ? 'bg-muted/30' : 'bg-muted/50'}`}
                          style={{ width: CELL_WIDTH }}
                        >
                          <div className="text-[9px] leading-tight">{format(day, "dd.MM.yy", { locale: ru })}</div>
                          <div className="text-muted-foreground text-[9px] leading-tight">
                            {format(day, "EEE", { locale: ru })}
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
              <table className="w-full border-collapse text-sm">
                <tbody>
                  {documents.map(doc => (
                    <DocumentNameRows
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

            {/* Right Body with drag-to-pan */}
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
              <div style={{ minWidth: days.length * CELL_WIDTH }}>
                <table className="border-collapse text-sm" style={{ tableLayout: 'fixed', width: days.length * CELL_WIDTH }}>
                  <tbody>
                    {documents.map(doc => (
                      <DocumentDataRows
                        key={doc.id}
                        doc={doc}
                        days={days}
                        today={today}
                        isExpanded={expandedDocs.has(doc.id)}
                        expandedBlocks={expandedBlocks}
                        expandedSections={expandedSections}
                        expandedGroups={expandedGroups}
                        workPeopleMap={workPeopleMap}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border-t border-border p-3">
        <div className="container mx-auto flex items-center gap-6 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary/20 border border-primary/50 rounded-sm" />
            <span className="text-muted-foreground">Сегодня</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-muted/30 rounded-sm" />
            <span className="text-muted-foreground">Выходные</span>
          </div>
          <span className="text-muted-foreground">Суммарное количество людей по работам в группе</span>
        </div>
      </div>
    </div>
  );
}

function DocumentNameRows({
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
  return (
    <>
      <tr className="bg-primary/20 hover:bg-primary/30 transition-colors">
        <td className="border-b border-border p-2 font-bold h-10">
          <button
            onClick={onToggleDoc}
            className="flex items-center gap-2 w-full text-left"
            data-testid={`button-toggle-doc-${doc.id}`}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span className="truncate">{doc.name}</span>
          </button>
        </td>
      </tr>
      {isExpanded && doc.blocks?.map(block => (
        <BlockNameRows
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

function BlockNameRows({
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
  return (
    <>
      <tr className="bg-primary/10 hover:bg-primary/20 transition-colors">
        <td 
          className="border-b border-border p-2 font-bold h-10"
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
      </tr>
      {isExpanded && block.sections?.map(section => (
        <SectionNameRows
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

function SectionNameRows({
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
  return (
    <>
      <tr className="bg-secondary/30 hover:bg-secondary/50 transition-colors">
        <td 
          className="border-b border-border p-2 font-semibold h-10" 
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
      </tr>
      {isExpanded && section.groups?.map(group => (
        <GroupNameRows
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

function GroupNameRows({
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
  const firstWork = group.works?.[0];
  const sectionsCount = firstWork?.sectionsCount || 1;
  const hasBuildingSections = sectionsCount > 1;

  return (
    <>
      <tr className="hover:bg-muted/20 transition-colors">
        <td 
          className="border-b border-border p-2 h-10" 
          style={{ paddingLeft: `${indentLevel * 16 + 8}px` }}
        >
          <div className="flex items-center gap-2">
            {hasBuildingSections && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleGroup(); }}
                className="p-0.5 hover:bg-muted rounded"
                data-testid={`button-toggle-group-sections-${group.id}`}
              >
                {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
            )}
            <span className="text-muted-foreground text-xs">{group.number}</span>
            <span className="truncate" title={group.name}>{group.name}</span>
          </div>
        </td>
      </tr>
      {isExpanded && hasBuildingSections && Array.from({ length: sectionsCount }, (_, i) => i + 1).map(sectionNum => (
        <tr key={`${group.id}-section-${sectionNum}`} className="hover:bg-muted/10 transition-colors bg-muted/5">
          <td 
            className="border-b border-border p-2 h-10 text-muted-foreground" 
            style={{ paddingLeft: `${(indentLevel + 1) * 16 + 8}px` }}
          >
            <span className="text-xs">{group.number}-{sectionNum}с</span>
          </td>
        </tr>
      ))}
    </>
  );
}

function DocumentDataRows({
  doc,
  days,
  today,
  isExpanded,
  expandedBlocks,
  expandedSections,
  expandedGroups,
  workPeopleMap
}: {
  doc: DocumentNode;
  days: Date[];
  today: Date;
  isExpanded: boolean;
  expandedBlocks: Set<number>;
  expandedSections: Set<number>;
  expandedGroups: Set<number>;
  workPeopleMap: Map<string, number>;
}) {
  return (
    <>
      <tr className="bg-primary/20">
        {days.map((day, idx) => {
          const isToday = isSameDay(day, today);
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          return (
            <td 
              key={idx} 
              className={`border-b border-r border-border h-10 ${isToday ? 'bg-primary/20' : isWeekend ? 'bg-primary/10' : ''}`}
              style={{ width: 42 }}
            />
          );
        })}
      </tr>
      {isExpanded && doc.blocks?.map(block => (
        <BlockDataRows
          key={block.id}
          block={block}
          days={days}
          today={today}
          isExpanded={expandedBlocks.has(block.id)}
          expandedSections={expandedSections}
          expandedGroups={expandedGroups}
          workPeopleMap={workPeopleMap}
        />
      ))}
    </>
  );
}

function BlockDataRows({
  block,
  days,
  today,
  isExpanded,
  expandedSections,
  expandedGroups,
  workPeopleMap
}: {
  block: BlockNode;
  days: Date[];
  today: Date;
  isExpanded: boolean;
  expandedSections: Set<number>;
  expandedGroups: Set<number>;
  workPeopleMap: Map<string, number>;
}) {
  return (
    <>
      <tr className="bg-primary/10">
        {days.map((day, idx) => {
          const isToday = isSameDay(day, today);
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          return (
            <td 
              key={idx} 
              className={`border-b border-r border-border h-10 ${isToday ? 'bg-primary/20' : isWeekend ? 'bg-primary/5' : ''}`}
              style={{ width: 42 }}
            />
          );
        })}
      </tr>
      {isExpanded && block.sections?.map(section => (
        <SectionDataRows
          key={section.id}
          section={section}
          days={days}
          today={today}
          isExpanded={expandedSections.has(section.id)}
          expandedGroups={expandedGroups}
          workPeopleMap={workPeopleMap}
        />
      ))}
    </>
  );
}

function SectionDataRows({
  section,
  days,
  today,
  isExpanded,
  expandedGroups,
  workPeopleMap
}: {
  section: SectionNode;
  days: Date[];
  today: Date;
  isExpanded: boolean;
  expandedGroups: Set<number>;
  workPeopleMap: Map<string, number>;
}) {
  return (
    <>
      <tr className="bg-secondary/30">
        {days.map((day, idx) => {
          const isToday = isSameDay(day, today);
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          return (
            <td 
              key={idx} 
              className={`border-b border-r border-border h-10 ${isToday ? 'bg-primary/20' : isWeekend ? 'bg-secondary/10' : ''}`}
              style={{ width: 42 }}
            />
          );
        })}
      </tr>
      {isExpanded && section.groups?.map(group => (
        <GroupDataRows
          key={group.id}
          group={group}
          days={days}
          today={today}
          isExpanded={expandedGroups.has(group.id)}
          workPeopleMap={workPeopleMap}
        />
      ))}
    </>
  );
}

function PeopleInputCell({
  workId,
  groupId,
  dateStr,
  initialValue,
  isToday,
  isWeekend
}: {
  workId: number;
  groupId: number;
  dateStr: string;
  initialValue: number;
  isToday: boolean;
  isWeekend: boolean;
}) {
  const [localValue, setLocalValue] = useState<string>(initialValue > 0 ? String(initialValue) : '');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingValueRef = useRef<string | null>(null);
  const lastSavedRef = useRef<string>(initialValue > 0 ? String(initialValue) : '');

  const updateWorkPeopleMutation = useMutation({
    mutationFn: async ({ workId, date, count }: { workId: number; date: string; count: number }) => {
      return apiRequest("POST", "/api/work-people", { workId, date, count });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-people"] });
    }
  });

  const flushPendingValue = useCallback(() => {
    if (pendingValueRef.current !== null && pendingValueRef.current !== lastSavedRef.current) {
      const numValue = parseInt(pendingValueRef.current) || 0;
      updateWorkPeopleMutation.mutate({ workId, date: dateStr, count: numValue });
      lastSavedRef.current = pendingValueRef.current;
      pendingValueRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [workId, dateStr, updateWorkPeopleMutation]);

  useEffect(() => {
    setLocalValue(initialValue > 0 ? String(initialValue) : '');
    lastSavedRef.current = initialValue > 0 ? String(initialValue) : '';
  }, [initialValue]);

  const handleChange = (value: string) => {
    setLocalValue(value);
    pendingValueRef.current = value;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      flushPendingValue();
    }, 500);
  };

  const handleBlur = () => {
    flushPendingValue();
  };

  useEffect(() => {
    return () => {
      flushPendingValue();
    };
  }, [flushPendingValue]);

  return (
    <td 
      className={`border-b border-r border-border p-0 h-10 text-center text-sm ${isToday ? 'bg-primary/20' : isWeekend ? 'bg-muted/10' : ''}`}
      data-testid={`cell-people-group-${groupId}-${dateStr}`}
    >
      <input
        type="number"
        min="0"
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        className="w-full h-full text-center bg-transparent border-0 focus:ring-1 focus:ring-primary text-sm"
        data-testid={`input-people-group-${groupId}-${dateStr}`}
      />
    </td>
  );
}

function PeopleSectionInputCell({
  workId,
  groupId,
  sectionNumber,
  dateStr,
  initialValue,
  isToday,
  isWeekend
}: {
  workId: number;
  groupId: number;
  sectionNumber: number;
  dateStr: string;
  initialValue: number;
  isToday: boolean;
  isWeekend: boolean;
}) {
  const [localValue, setLocalValue] = useState<string>(initialValue > 0 ? String(initialValue) : '');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingValueRef = useRef<string | null>(null);
  const lastSavedRef = useRef<string>(initialValue > 0 ? String(initialValue) : '');

  const updateWorkPeopleMutation = useMutation({
    mutationFn: async ({ workId, date, count, sectionNumber }: { workId: number; date: string; count: number; sectionNumber: number }) => {
      return apiRequest("POST", "/api/work-people", { workId, date, count, sectionNumber });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-people"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-people/sections", variables.workId] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-people/summary"] });
    }
  });

  const flushPendingValue = useCallback(() => {
    if (pendingValueRef.current !== null && pendingValueRef.current !== lastSavedRef.current) {
      const numValue = parseInt(pendingValueRef.current) || 0;
      updateWorkPeopleMutation.mutate({ workId, date: dateStr, count: numValue, sectionNumber });
      lastSavedRef.current = pendingValueRef.current;
      pendingValueRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [workId, dateStr, sectionNumber, updateWorkPeopleMutation]);

  useEffect(() => {
    setLocalValue(initialValue > 0 ? String(initialValue) : '');
    lastSavedRef.current = initialValue > 0 ? String(initialValue) : '';
  }, [initialValue]);

  const handleChange = (value: string) => {
    setLocalValue(value);
    pendingValueRef.current = value;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      flushPendingValue();
    }, 500);
  };

  const handleBlur = () => {
    flushPendingValue();
  };

  useEffect(() => {
    return () => {
      flushPendingValue();
    };
  }, [flushPendingValue]);

  return (
    <td 
      className={`border-b border-r border-border p-0 h-10 text-center text-sm ${isToday ? 'bg-primary/10' : isWeekend ? 'bg-muted/5' : 'bg-muted/5'}`}
      style={{ width: 42 }}
      data-testid={`cell-people-section-${groupId}-${sectionNumber}-${dateStr}`}
    >
      <input
        type="number"
        min="0"
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        className="w-full h-full text-center bg-transparent border-0 focus:ring-1 focus:ring-primary text-sm"
        data-testid={`input-people-section-${groupId}-${sectionNumber}-${dateStr}`}
      />
    </td>
  );
}

function GroupDataRows({
  group,
  days,
  today,
  isExpanded,
  workPeopleMap
}: {
  group: GroupNode;
  days: Date[];
  today: Date;
  isExpanded: boolean;
  workPeopleMap: Map<string, number>;
}) {
  const firstWork = group.works?.[0];
  const sectionsCount = firstWork?.sectionsCount || 1;
  const hasBuildingSections = sectionsCount > 1;

  // Get section people count for a specific section and date
  const getSectionPeopleCount = (sectionNum: number, dateStr: string): number => {
    if (!firstWork) return 0;
    const key = `${firstWork.id}-${sectionNum}-${dateStr}`;
    return workPeopleMap.get(key) || 0;
  };

  // Get total people count for main work row (sum of all sections or direct value)
  const getGroupPeopleCount = (dateStr: string): number => {
    if (!firstWork) return 0;
    
    if (hasBuildingSections) {
      // Sum from all sections
      let total = 0;
      for (let i = 1; i <= sectionsCount; i++) {
        total += getSectionPeopleCount(i, dateStr);
      }
      return total;
    } else {
      // Direct value (sectionsCount = 1)
      const key = `${firstWork.id}-${dateStr}`;
      return workPeopleMap.get(key) || 0;
    }
  };

  return (
    <>
      {/* Main group row */}
      <tr className="hover:bg-muted/20 transition-colors">
        {days.map((day, idx) => {
          const isToday = isSameDay(day, today);
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          const dateStr = format(day, "yyyy-MM-dd");
          const peopleCount = getGroupPeopleCount(dateStr);

          if (!firstWork) {
            return (
              <td 
                key={idx}
                className={`border-b border-r border-border p-0 h-10 text-center text-sm ${isToday ? 'bg-primary/20' : isWeekend ? 'bg-muted/10' : ''}`}
                style={{ width: 42 }}
              />
            );
          }

          // If has multiple sections, show sum (read-only)
          if (hasBuildingSections) {
            return (
              <td 
                key={idx}
                className={`border-b border-r border-border p-0 h-10 text-center text-sm ${isToday ? 'bg-primary/20' : isWeekend ? 'bg-muted/10' : ''}`}
                style={{ width: 42 }}
                data-testid={`cell-people-group-${group.id}-${dateStr}`}
              >
                {peopleCount > 0 ? peopleCount : ''}
              </td>
            );
          }

          // Single section - editable
          return (
            <PeopleInputCell
              key={`${firstWork.id}-${dateStr}`}
              workId={firstWork.id}
              groupId={group.id}
              dateStr={dateStr}
              initialValue={peopleCount}
              isToday={isToday}
              isWeekend={isWeekend}
            />
          );
        })}
      </tr>
      
      {/* Section rows when expanded */}
      {isExpanded && hasBuildingSections && Array.from({ length: sectionsCount }, (_, i) => i + 1).map(sectionNum => (
        <tr key={`${group.id}-section-${sectionNum}`} className="hover:bg-muted/10 transition-colors bg-muted/5">
          {days.map((day, idx) => {
            const isToday = isSameDay(day, today);
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            const dateStr = format(day, "yyyy-MM-dd");
            const sectionCount = getSectionPeopleCount(sectionNum, dateStr);

            if (!firstWork) {
              return (
                <td 
                  key={idx}
                  className={`border-b border-r border-border p-0 h-10 text-center text-sm ${isToday ? 'bg-primary/10' : isWeekend ? 'bg-muted/5' : ''}`}
                  style={{ width: 42 }}
                />
              );
            }

            return (
              <PeopleSectionInputCell
                key={`${firstWork.id}-${sectionNum}-${dateStr}`}
                workId={firstWork.id}
                groupId={group.id}
                sectionNumber={sectionNum}
                dateStr={dateStr}
                initialValue={sectionCount}
                isToday={isToday}
                isWeekend={isWeekend}
              />
            );
          })}
        </tr>
      ))}
    </>
  );
}
