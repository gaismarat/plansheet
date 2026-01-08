import { useState, useMemo, useRef, useEffect } from "react";
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

  const isLoading = treeLoading || peopleLoading;
  const documents = (worksTree || []) as DocumentNode[];
  const workPeople = workPeopleData || [];

  const today = useMemo(() => startOfDay(new Date()), []);

  const workPeopleMap = useMemo(() => {
    const map = new Map<string, number>();
    workPeople.forEach(wp => {
      map.set(`${wp.workId}-${wp.date}`, wp.count);
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
    const allGroupIds = documents.flatMap(d => 
      d.blocks?.flatMap(b => b.sections?.flatMap(s => s.groups?.map(g => g.id) || []) || []) || []
    );
    setExpandedGroups(new Set(allGroupIds));
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

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-shrink-0 border-r border-border bg-card overflow-y-auto" style={{ width: 300 }}>
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-20 bg-card">
              <tr>
                <th className="border-b border-border bg-muted/50 p-2 text-left font-medium h-12">
                  Наименование
                </th>
              </tr>
            </thead>
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

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="min-w-max">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 z-20 bg-card">
                  <tr>
                    {days.map((day, idx) => {
                      const isToday = isSameDay(day, today);
                      const dayOfWeek = day.getDay();
                      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                      
                      return (
                        <th 
                          key={idx}
                          ref={isToday ? todayColumnRef : undefined}
                          className={`border-b border-r border-border p-0.5 text-center font-medium min-w-[50px] w-[50px] h-12 ${isToday ? 'bg-primary/20' : isWeekend ? 'bg-muted/30' : 'bg-muted/50'}`}
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
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
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
  const hasWorks = group.works && group.works.length > 0;
  
  return (
    <>
      <tr className="hover:bg-muted/20 transition-colors">
        <td 
          className="border-b border-border p-2 h-10" 
          style={{ paddingLeft: `${indentLevel * 16 + 8}px` }}
        >
          {hasWorks ? (
            <button
              onClick={onToggleGroup}
              className="flex items-center gap-2 w-full text-left"
              data-testid={`button-toggle-group-${group.id}`}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <span className="text-muted-foreground text-xs">{group.number}</span>
              <span className="truncate" title={group.name}>{group.name}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">{group.number}</span>
              <span className="truncate" title={group.name}>{group.name}</span>
            </div>
          )}
        </td>
      </tr>
      {isExpanded && group.works?.map(work => (
        <tr key={work.id} className="hover:bg-muted/30 transition-colors bg-muted/5">
          <td 
            className="border-b border-border p-2 h-10 text-sm" 
            style={{ paddingLeft: `${(indentLevel + 1) * 16 + 8}px` }}
          >
            <span className="truncate block text-muted-foreground" title={work.name}>
              {work.name}
            </span>
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
  const getGroupPeopleCount = (dateStr: string) => {
    let total = 0;
    group.works?.forEach(work => {
      const key = `${work.id}-${dateStr}`;
      const count = workPeopleMap.get(key);
      if (count) total += count;
    });
    return total;
  };

  return (
    <>
      <tr className="hover:bg-muted/20 transition-colors">
        {days.map((day, idx) => {
          const isToday = isSameDay(day, today);
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          const dateStr = format(day, "yyyy-MM-dd");
          const peopleCount = getGroupPeopleCount(dateStr);

          return (
            <td 
              key={idx}
              className={`border-b border-r border-border p-0 h-10 text-center text-sm ${isToday ? 'bg-primary/20' : isWeekend ? 'bg-muted/10' : ''}`}
              data-testid={`cell-people-group-${group.id}-${dateStr}`}
            >
              {peopleCount > 0 ? (
                <span className="text-foreground font-medium">{peopleCount}</span>
              ) : null}
            </td>
          );
        })}
      </tr>
      {isExpanded && group.works?.map(work => (
        <WorkDataRow
          key={work.id}
          work={work}
          days={days}
          today={today}
          workPeopleMap={workPeopleMap}
        />
      ))}
    </>
  );
}

function WorkDataRow({
  work,
  days,
  today,
  workPeopleMap
}: {
  work: Work;
  days: Date[];
  today: Date;
  workPeopleMap: Map<string, number>;
}) {
  const { updateWorkPeople } = useConstruction();

  const handlePeopleChange = (dateStr: string, value: string) => {
    const numValue = parseInt(value) || 0;
    updateWorkPeople.mutate({ workId: work.id, date: dateStr, count: numValue });
  };

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      {days.map((day, idx) => {
        const isToday = isSameDay(day, today);
        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
        const dateStr = format(day, "yyyy-MM-dd");
        const key = `${work.id}-${dateStr}`;
        const peopleCount = workPeopleMap.get(key) || 0;

        return (
          <td 
            key={idx}
            className={`border-b border-r border-border p-0 h-10 text-center ${isToday ? 'bg-primary/20' : isWeekend ? 'bg-muted/10' : ''}`}
          >
            <input
              type="number"
              min="0"
              value={peopleCount || ''}
              onChange={(e) => handlePeopleChange(dateStr, e.target.value)}
              className="w-full h-full text-center bg-transparent border-0 focus:ring-1 focus:ring-primary text-sm"
              data-testid={`input-people-work-${work.id}-${dateStr}`}
            />
          </td>
        );
      })}
    </tr>
  );
}
