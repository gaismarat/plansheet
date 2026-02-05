import { useEffect, useState, RefObject, useCallback } from "react";
import { useAllDependencies } from "@/hooks/use-construction";
import type { WorkDependency } from "@shared/schema";
import { startOfWeek, endOfWeek, isWithinInterval, startOfDay, parseISO } from "date-fns";

interface WorkPosition {
  workId: number;
  top: number;
  height: number;
  planStartX: number | null;
  planEndX: number | null;
  actualStartX: number | null;
  actualEndX: number | null;
}

interface DependencyArrowsProps {
  containerRef: RefObject<HTMLDivElement | null>;
  timeUnits: Date[];
  cellWidth: number;
  dateRange: { start: Date; end: Date };
  viewMode: "days" | "weeks";
}

const DEPENDENCY_COLORS: Record<string, string> = {
  FS: "#3b82f6",
  SS: "#22c55e",
  FF: "#f97316",
  SF: "#a855f7",
};

const DEPENDENCY_LABELS: Record<string, string> = {
  FS: "ОН",
  SS: "НН",
  FF: "ОО",
  SF: "НО",
};

export function DependencyArrows({ 
  containerRef, 
  timeUnits, 
  cellWidth, 
  dateRange,
  viewMode
}: DependencyArrowsProps) {
  const { data: dependencies = [] } = useAllDependencies();
  const [workPositions, setWorkPositions] = useState<Map<number, WorkPosition>>(new Map());
  const [containerHeight, setContainerHeight] = useState(0);

  const getXPosition = useCallback((dateStr: string | null): number | null => {
    if (!dateStr || timeUnits.length === 0) return null;
    
    const date = startOfDay(parseISO(dateStr));
    
    if (viewMode === "days") {
      for (let i = 0; i < timeUnits.length; i++) {
        const unitDate = startOfDay(timeUnits[i]);
        if (unitDate.getTime() === date.getTime()) {
          return i * cellWidth + cellWidth / 2;
        }
      }
      const firstUnit = startOfDay(timeUnits[0]);
      const daysDiff = Math.round((date.getTime() - firstUnit.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff >= 0 && daysDiff < timeUnits.length) {
        return daysDiff * cellWidth + cellWidth / 2;
      }
    } else {
      for (let i = 0; i < timeUnits.length; i++) {
        const weekStart = startOfDay(timeUnits[i]);
        const weekEnd = endOfWeek(timeUnits[i], { weekStartsOn: 1 });
        
        if (isWithinInterval(date, { start: weekStart, end: weekEnd })) {
          const daysIntoWeek = Math.round((date.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
          const positionInCell = (daysIntoWeek + 0.5) / 7;
          return i * cellWidth + positionInCell * cellWidth;
        }
      }
    }
    
    return null;
  }, [timeUnits, cellWidth, viewMode]);

  const updatePositions = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const tbody = container.querySelector('tbody');
    if (!tbody) return;

    const newPositions = new Map<number, WorkPosition>();
    const rows = tbody.querySelectorAll('tr[data-work-id]');
    const containerRect = container.getBoundingClientRect();
    
    rows.forEach(row => {
      const workId = parseInt(row.getAttribute('data-work-id') || '0');
      if (!workId) return;
      
      const planStartStr = row.getAttribute('data-plan-start') || null;
      const planEndStr = row.getAttribute('data-plan-end') || null;
      const actualStartStr = row.getAttribute('data-actual-start') || null;
      const actualEndStr = row.getAttribute('data-actual-end') || null;
      
      const rect = row.getBoundingClientRect();
      const top = rect.top - containerRect.top + container.scrollTop;
      const height = rect.height;

      newPositions.set(workId, {
        workId,
        top,
        height,
        planStartX: getXPosition(planStartStr),
        planEndX: getXPosition(planEndStr),
        actualStartX: getXPosition(actualStartStr),
        actualEndX: getXPosition(actualEndStr),
      });
    });

    setWorkPositions(newPositions);
    setContainerHeight(container.scrollHeight);
  }, [containerRef, getXPosition]);

  useEffect(() => {
    updatePositions();
  }, [updatePositions, dependencies, timeUnits, viewMode]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      updatePositions();
    });
    resizeObserver.observe(container);

    const mutationObserver = new MutationObserver(() => {
      updatePositions();
    });
    mutationObserver.observe(container, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['data-work-id', 'style', 'class']
    });

    const handleScroll = () => updatePositions();
    container.addEventListener('scroll', handleScroll);

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      container.removeEventListener('scroll', handleScroll);
    };
  }, [containerRef, updatePositions]);

  if (dependencies.length === 0 || workPositions.size === 0) return null;

  const renderArrow = (dep: WorkDependency) => {
    const fromWork = workPositions.get(dep.dependsOnWorkId);
    const toWork = workPositions.get(dep.workId);
    
    if (!fromWork || !toWork) return null;

    let startX: number | null = null;
    let endX: number | null = null;
    
    switch (dep.dependencyType) {
      case 'FS':
        startX = fromWork.actualEndX ?? fromWork.planEndX;
        endX = toWork.actualStartX ?? toWork.planStartX;
        break;
      case 'SS':
        startX = fromWork.actualStartX ?? fromWork.planStartX;
        endX = toWork.actualStartX ?? toWork.planStartX;
        break;
      case 'FF':
        startX = fromWork.actualEndX ?? fromWork.planEndX;
        endX = toWork.actualEndX ?? toWork.planEndX;
        break;
      case 'SF':
        startX = fromWork.actualStartX ?? fromWork.planStartX;
        endX = toWork.actualEndX ?? toWork.planEndX;
        break;
    }

    if (startX === null || endX === null) return null;

    const startY = fromWork.top + fromWork.height / 2;
    const endY = toWork.top + toWork.height / 2;
    const color = DEPENDENCY_COLORS[dep.dependencyType] || '#888';

    let path: string;
    
    if (Math.abs(endY - startY) < 5) {
      path = `M ${startX} ${startY} L ${endX - 6} ${endY}`;
    } else if (endX > startX + 30) {
      const midX = startX + 20;
      path = `
        M ${startX} ${startY}
        L ${midX} ${startY}
        L ${midX} ${endY}
        L ${endX - 6} ${endY}
      `;
    } else {
      const offsetX = startX + 25;
      const midY = (startY + endY) / 2;
      path = `
        M ${startX} ${startY}
        L ${offsetX} ${startY}
        L ${offsetX} ${midY}
        L ${endX - 25} ${midY}
        L ${endX - 25} ${endY}
        L ${endX - 6} ${endY}
      `;
    }

    const arrowId = `arrow-${dep.id}`;
    const lagLabel = (dep.lagDays ?? 0) > 0 ? `+${dep.lagDays}д` : null;
    const labelX = (startX + endX) / 2;
    const labelY = (startY + endY) / 2 - 3;

    return (
      <g key={dep.id}>
        <defs>
          <marker
            id={arrowId}
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path d="M 0 0 L 6 3 L 0 6 z" fill={color} />
          </marker>
        </defs>
        <path
          d={path}
          stroke={color}
          strokeWidth="2"
          fill="none"
          markerEnd={`url(#${arrowId})`}
          opacity="0.7"
          strokeLinejoin="round"
        />
        {lagLabel && (
          <>
            <rect
              x={labelX - 14}
              y={labelY - 8}
              width="28"
              height="16"
              rx="3"
              fill="white"
              stroke={color}
              strokeWidth="1"
              opacity="0.95"
            />
            <text
              x={labelX}
              y={labelY + 4}
              textAnchor="middle"
              fontSize="10"
              fill={color}
              fontWeight="600"
            >
              {lagLabel}
            </text>
          </>
        )}
      </g>
    );
  };

  const totalWidth = timeUnits.length * cellWidth;

  return (
    <svg
      className="absolute top-0 left-0 pointer-events-none"
      style={{ 
        width: totalWidth,
        height: containerHeight || '100%',
        zIndex: 25,
        overflow: 'visible',
      }}
    >
      {dependencies.map(renderArrow)}
    </svg>
  );
}

export { DEPENDENCY_COLORS, DEPENDENCY_LABELS };
