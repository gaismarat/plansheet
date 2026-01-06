import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useBlocks, useUnassignedGroups } from "@/hooks/use-construction";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, Users, ChevronRight, ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { type WorkGroupResponse, type BlockResponse, type Work, type WorkPeople } from "@shared/schema";
import { addDays, startOfWeek, endOfWeek, format, parseISO, differenceInDays, eachDayOfInterval, isBefore, isAfter, startOfDay, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function People() {
  const { data: blocksData, isLoading: blocksLoading } = useBlocks();
  const { data: unassignedGroups, isLoading: groupsLoading } = useUnassignedGroups();
  const { data: workPeopleData, isLoading: peopleLoading } = useQuery<WorkPeople[]>({
    queryKey: ["/api/work-people"]
  });
  
  const [expandedBlocks, setExpandedBlocks] = useState<Set<number>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const todayColumnRef = useRef<HTMLTableCellElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);

  const isLoading = blocksLoading || groupsLoading || peopleLoading;
  const blocks = blocksData || [];
  const groups = unassignedGroups || [];
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
    const works: Work[] = [];
    blocks.forEach(block => {
      block.groups?.forEach(group => {
        group.works?.forEach(work => works.push(work));
      });
    });
    groups.forEach(group => {
      group.works?.forEach(work => works.push(work));
    });
    return works;
  }, [blocks, groups]);

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

  const toggleBlock = (blockId: number) => {
    const newSet = new Set(expandedBlocks);
    if (newSet.has(blockId)) {
      newSet.delete(blockId);
    } else {
      newSet.add(blockId);
    }
    setExpandedBlocks(newSet);
  };

  const toggleGroup = (groupId: number) => {
    const newSet = new Set(expandedGroups);
    if (newSet.has(groupId)) {
      newSet.delete(groupId);
    } else {
      newSet.add(groupId);
    }
    setExpandedGroups(newSet);
  };

  const expandAll = () => {
    setExpandedBlocks(new Set(blocks.map(b => b.id)));
    const allGroupIds = [
      ...blocks.flatMap(b => b.groups?.map(g => g.id) || []),
      ...groups.map(g => g.id)
    ];
    setExpandedGroups(new Set(allGroupIds));
  };

  const collapseAll = () => {
    setExpandedBlocks(new Set());
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
                  Наименование работы
                </th>
              </tr>
            </thead>
            <tbody>
              {blocks.map(block => (
                <BlockNameRows
                  key={block.id}
                  block={block}
                  isExpanded={expandedBlocks.has(block.id)}
                  expandedGroups={expandedGroups}
                  onToggleBlock={() => toggleBlock(block.id)}
                  onToggleGroup={toggleGroup}
                />
              ))}
              {groups.map(group => (
                <GroupNameRows
                  key={group.id}
                  group={group}
                  isExpanded={expandedGroups.has(group.id)}
                  onToggle={() => toggleGroup(group.id)}
                  indentLevel={0}
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
                  {blocks.map(block => (
                    <BlockDataRows
                      key={block.id}
                      block={block}
                      days={days}
                      today={today}
                      isExpanded={expandedBlocks.has(block.id)}
                      expandedGroups={expandedGroups}
                      workPeopleMap={workPeopleMap}
                    />
                  ))}
                  {groups.map(group => (
                    <GroupDataRows
                      key={group.id}
                      group={group}
                      days={days}
                      today={today}
                      isExpanded={expandedGroups.has(group.id)}
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
          <span className="text-muted-foreground">Введите число работников в ячейку для нужного дня</span>
        </div>
      </div>
    </div>
  );
}

function BlockNameRows({
  block,
  isExpanded,
  expandedGroups,
  onToggleBlock,
  onToggleGroup
}: {
  block: BlockResponse;
  isExpanded: boolean;
  expandedGroups: Set<number>;
  onToggleBlock: () => void;
  onToggleGroup: (id: number) => void;
}) {
  return (
    <>
      <tr className="bg-primary/10 hover:bg-primary/20 transition-colors">
        <td className="border-b border-border p-2 font-bold h-10">
          <button
            onClick={onToggleBlock}
            className="flex items-center gap-2 w-full text-left"
            data-testid={`button-toggle-block-${block.id}`}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span className="truncate">{block.name}</span>
          </button>
        </td>
      </tr>
      {isExpanded && block.groups?.map(group => (
        <GroupNameRows
          key={group.id}
          group={group}
          isExpanded={expandedGroups.has(group.id)}
          onToggle={() => onToggleGroup(group.id)}
          indentLevel={1}
        />
      ))}
    </>
  );
}

function GroupNameRows({
  group,
  isExpanded,
  onToggle,
  indentLevel
}: {
  group: WorkGroupResponse;
  isExpanded: boolean;
  onToggle: () => void;
  indentLevel: number;
}) {
  return (
    <>
      <tr className="bg-secondary/30 hover:bg-secondary/50 transition-colors">
        <td className="border-b border-border p-2 font-semibold h-10" style={{ paddingLeft: `${(indentLevel + 1) * 16}px` }}>
          <button
            onClick={onToggle}
            className="flex items-center gap-2 w-full text-left"
            data-testid={`button-toggle-group-${group.id}`}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span className="truncate">{group.name}</span>
          </button>
        </td>
      </tr>
      {isExpanded && group.works?.map(work => (
        <tr key={work.id} className="hover:bg-muted/20 transition-colors">
          <td className="border-b border-border p-2 h-10" style={{ paddingLeft: `${(indentLevel + 2) * 16}px` }}>
            <span className="truncate block" title={work.name}>{work.name}</span>
          </td>
        </tr>
      ))}
    </>
  );
}

function BlockDataRows({
  block,
  days,
  today,
  isExpanded,
  expandedGroups,
  workPeopleMap
}: {
  block: BlockResponse;
  days: Date[];
  today: Date;
  isExpanded: boolean;
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
      {isExpanded && block.groups?.map(group => (
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
  group: WorkGroupResponse;
  days: Date[];
  today: Date;
  isExpanded: boolean;
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
  const mutation = useMutation({
    mutationFn: async ({ workId, date, count }: { workId: number; date: string; count: number }) => {
      await apiRequest("POST", "/api/work-people", { workId, date, count });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-people"] });
    }
  });

  const handleChange = (day: Date, value: string) => {
    const numValue = parseInt(value, 10);
    if (value === "" || (!isNaN(numValue) && numValue >= 0)) {
      const dateStr = format(day, "yyyy-MM-dd");
      mutation.mutate({ workId: work.id, date: dateStr, count: numValue || 0 });
    }
  };

  return (
    <tr className="hover:bg-muted/20 transition-colors">
      {days.map((day, idx) => {
        const isToday = isSameDay(day, today);
        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
        const dateStr = format(day, "yyyy-MM-dd");
        const key = `${work.id}-${dateStr}`;
        const value = workPeopleMap.get(key);

        return (
          <td 
            key={idx} 
            className={`border-b border-r border-border p-0 h-10 ${isToday ? 'bg-primary/20' : isWeekend ? 'bg-muted/10' : ''}`}
          >
            <Input
              type="number"
              min="0"
              value={value !== undefined ? value : ""}
              onChange={(e) => handleChange(day, e.target.value)}
              className="w-full h-full border-0 text-center text-sm p-1 rounded-none bg-transparent focus-visible:ring-1 focus-visible:ring-inset"
              data-testid={`input-people-${work.id}-${dateStr}`}
            />
          </td>
        );
      })}
    </tr>
  );
}
