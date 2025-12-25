import { useState, useMemo } from "react";
import { useBlocks, useUnassignedGroups } from "@/hooks/use-construction";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, CalendarDays, ChevronRight, ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { type WorkGroupResponse, type BlockResponse, type Work } from "@shared/schema";
import { addDays, startOfWeek, endOfWeek, format, parseISO, differenceInDays, eachDayOfInterval, eachWeekOfInterval, isWithinInterval, isBefore, isAfter, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

type ViewMode = "days" | "weeks";

export default function KSP() {
  const { data: blocksData, isLoading: blocksLoading } = useBlocks();
  const { data: unassignedGroups, isLoading: groupsLoading } = useUnassignedGroups();
  const [viewMode, setViewMode] = useState<ViewMode>("weeks");
  const [expandedBlocks, setExpandedBlocks] = useState<Set<number>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

  const isLoading = blocksLoading || groupsLoading;
  const blocks = blocksData || [];
  const groups = unassignedGroups || [];

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
      const today = new Date();
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
      const today = new Date();
      return {
        start: startOfWeek(today, { weekStartsOn: 1 }),
        end: endOfWeek(addDays(today, 60), { weekStartsOn: 1 })
      };
    }

    return {
      start: startOfWeek(addDays(minDate, -7), { weekStartsOn: 1 }),
      end: endOfWeek(addDays(maxDate, 14), { weekStartsOn: 1 })
    };
  }, [allWorks]);

  const timeUnits = useMemo(() => {
    if (viewMode === "days") {
      return eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    } else {
      return eachWeekOfInterval({ start: dateRange.start, end: dateRange.end }, { weekStartsOn: 1 });
    }
  }, [dateRange, viewMode]);

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

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="min-w-max">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-20 bg-card">
                <tr>
                  <th className="border border-border bg-muted/50 p-2 text-left font-medium min-w-[300px] sticky left-0 z-30">
                    Наименование
                  </th>
                  {timeUnits.map((unit, idx) => (
                    <th 
                      key={idx} 
                      className="border border-border bg-muted/50 p-1 text-center font-medium min-w-[40px] text-xs"
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
                  ))}
                </tr>
              </thead>
              <tbody>
                {blocks.map(block => (
                  <BlockRow 
                    key={block.id} 
                    block={block} 
                    timeUnits={timeUnits}
                    viewMode={viewMode}
                    isExpanded={expandedBlocks.has(block.id)}
                    expandedGroups={expandedGroups}
                    onToggleBlock={() => toggleBlock(block.id)}
                    onToggleGroup={toggleGroup}
                  />
                ))}
                {groups.map(group => (
                  <GroupRows
                    key={group.id}
                    group={group}
                    timeUnits={timeUnits}
                    viewMode={viewMode}
                    isExpanded={expandedGroups.has(group.id)}
                    onToggle={() => toggleGroup(group.id)}
                    indentLevel={0}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      <div className="bg-card border-t border-border p-3">
        <div className="container mx-auto flex items-center gap-6 text-sm">
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
        </div>
      </div>
    </div>
  );
}

function BlockRow({ 
  block, 
  timeUnits, 
  viewMode,
  isExpanded, 
  expandedGroups,
  onToggleBlock,
  onToggleGroup
}: { 
  block: BlockResponse; 
  timeUnits: Date[];
  viewMode: ViewMode;
  isExpanded: boolean;
  expandedGroups: Set<number>;
  onToggleBlock: () => void;
  onToggleGroup: (id: number) => void;
}) {
  return (
    <>
      <tr className="bg-primary/10 hover:bg-primary/20 transition-colors">
        <td className="border border-border p-2 font-bold sticky left-0 bg-primary/10 z-10">
          <button 
            onClick={onToggleBlock}
            className="flex items-center gap-2 w-full text-left"
            data-testid={`button-toggle-block-${block.id}`}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            {block.name}
          </button>
        </td>
        {timeUnits.map((_, idx) => (
          <td key={idx} className="border border-border bg-primary/5" />
        ))}
      </tr>
      {isExpanded && block.groups?.map(group => (
        <GroupRows
          key={group.id}
          group={group}
          timeUnits={timeUnits}
          viewMode={viewMode}
          isExpanded={expandedGroups.has(group.id)}
          onToggle={() => onToggleGroup(group.id)}
          indentLevel={1}
        />
      ))}
    </>
  );
}

function GroupRows({
  group,
  timeUnits,
  viewMode,
  isExpanded,
  onToggle,
  indentLevel
}: {
  group: WorkGroupResponse;
  timeUnits: Date[];
  viewMode: ViewMode;
  isExpanded: boolean;
  onToggle: () => void;
  indentLevel: number;
}) {
  return (
    <>
      <tr className="bg-secondary/30 hover:bg-secondary/50 transition-colors">
        <td className="border border-border p-2 font-semibold sticky left-0 bg-secondary/30 z-10" style={{ paddingLeft: `${(indentLevel + 1) * 16}px` }}>
          <button 
            onClick={onToggle}
            className="flex items-center gap-2 w-full text-left"
            data-testid={`button-toggle-group-${group.id}`}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            {group.name}
          </button>
        </td>
        {timeUnits.map((_, idx) => (
          <td key={idx} className="border border-border bg-secondary/10" />
        ))}
      </tr>
      {isExpanded && group.works?.map(work => (
        <WorkRow 
          key={work.id} 
          work={work} 
          timeUnits={timeUnits}
          viewMode={viewMode}
          indentLevel={indentLevel + 1}
        />
      ))}
    </>
  );
}

function WorkRow({
  work,
  timeUnits,
  viewMode,
  indentLevel
}: {
  work: Work;
  timeUnits: Date[];
  viewMode: ViewMode;
  indentLevel: number;
}) {
  const planStart = work.planStartDate ? parseISO(work.planStartDate) : null;
  const planEnd = work.planEndDate ? parseISO(work.planEndDate) : null;
  const actualStart = work.actualStartDate ? parseISO(work.actualStartDate) : null;
  const actualEnd = work.actualEndDate ? parseISO(work.actualEndDate) : null;

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

  return (
    <tr className="hover:bg-muted/50 transition-colors">
      <td 
        className="border border-border p-2 sticky left-0 bg-background z-10" 
        style={{ paddingLeft: `${(indentLevel + 1) * 16}px` }}
      >
        <span className="text-foreground">{work.name}</span>
      </td>
      {timeUnits.map((unit, idx) => {
        const { isInPlanRange, isInActualRange, isDelay, isAhead } = getCellContent(unit);
        
        return (
          <td key={idx} className="border border-border p-0 h-10 relative">
            <div className="absolute inset-0 flex flex-col">
              <div className={`flex-1 ${isInPlanRange ? 'bg-blue-500' : ''}`} />
              <div className={`flex-1 ${
                isDelay ? 'bg-red-500' : 
                isAhead ? 'bg-green-500' : 
                isInActualRange ? 'bg-amber-500' : ''
              }`} />
            </div>
          </td>
        );
      })}
    </tr>
  );
}
