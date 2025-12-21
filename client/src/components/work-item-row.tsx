import { useState, useRef, useEffect } from "react";
import { type Work } from "@shared/schema";
import { useUpdateWork, useDeleteWork, useMoveWorkUp, useMoveWorkDown } from "@/hooks/use-construction";
import { EditWorkDialog } from "@/components/forms/edit-work-dialog";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Trash2, Edit2, Check, ArrowUp, ArrowDown, ChevronDown } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WorkItemRowProps {
  work: Work;
  expandAll?: boolean;
}

export function WorkItemRow({ work, expandAll = true }: WorkItemRowProps) {
  const { mutate: updateWork } = useUpdateWork();
  const { mutate: deleteWork, isPending: isDeleting } = useDeleteWork();
  const { mutate: moveUp } = useMoveWorkUp();
  const { mutate: moveDown } = useMoveWorkDown();
  
  const [isExpanded, setIsExpanded] = useState(expandAll);

  // Sync expandAll prop changes with local state
  useEffect(() => {
    setIsExpanded(expandAll);
  }, [expandAll]);
  const [localProgress, setLocalProgress] = useState(work.progressPercentage);
  const [isEditingProgress, setIsEditingProgress] = useState(false);
  const [localPlanStartDate, setLocalPlanStartDate] = useState(work.planStartDate || '');
  const [localPlanEndDate, setLocalPlanEndDate] = useState(work.planEndDate || '');
  const [localActualStartDate, setLocalActualStartDate] = useState(work.actualStartDate || '');
  const [localActualEndDate, setLocalActualEndDate] = useState(work.actualEndDate || '');
  const sliderTimeoutRef = useRef<NodeJS.Timeout>();
  const dateTimeoutRef = useRef<NodeJS.Timeout>();

  // Sync local state if external data changes (and we aren't dragging)
  useEffect(() => {
    if (!isEditingProgress) {
      setLocalProgress(work.progressPercentage);
    }
  }, [work.progressPercentage, isEditingProgress]);

  useEffect(() => {
    setLocalPlanStartDate(work.planStartDate || '');
    setLocalPlanEndDate(work.planEndDate || '');
    setLocalActualStartDate(work.actualStartDate || '');
    setLocalActualEndDate(work.actualEndDate || '');
  }, [work.planStartDate, work.planEndDate, work.actualStartDate, work.actualEndDate]);

  const handleSliderChange = (value: number[]) => {
    const newVal = value[0];
    setLocalProgress(newVal);
    setIsEditingProgress(true);

    // Debounce API call
    if (sliderTimeoutRef.current) clearTimeout(sliderTimeoutRef.current);
    
    sliderTimeoutRef.current = setTimeout(() => {
      updateWork({ id: work.id, progressPercentage: newVal });
      setIsEditingProgress(false);
    }, 600);
  };

  const handleProgressInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val)) {
      setLocalProgress(Math.min(100, Math.max(0, val)));
    }
  };

  const handleProgressInputBlur = () => {
    updateWork({ id: work.id, progressPercentage: localProgress });
  };

  const handlePlanStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setLocalPlanStartDate(newDate);
    
    if (dateTimeoutRef.current) clearTimeout(dateTimeoutRef.current);
    dateTimeoutRef.current = setTimeout(() => {
      updateWork({ id: work.id, planStartDate: newDate });
    }, 300);
  };

  const handlePlanEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setLocalPlanEndDate(newDate);
    
    if (dateTimeoutRef.current) clearTimeout(dateTimeoutRef.current);
    dateTimeoutRef.current = setTimeout(() => {
      updateWork({ id: work.id, planEndDate: newDate });
    }, 300);
  };

  const handleActualStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setLocalActualStartDate(newDate);
    
    if (dateTimeoutRef.current) clearTimeout(dateTimeoutRef.current);
    dateTimeoutRef.current = setTimeout(() => {
      updateWork({ id: work.id, actualStartDate: newDate });
    }, 300);
  };

  const handleActualEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setLocalActualEndDate(newDate);
    
    if (dateTimeoutRef.current) clearTimeout(dateTimeoutRef.current);
    dateTimeoutRef.current = setTimeout(() => {
      updateWork({ id: work.id, actualEndDate: newDate });
    }, 300);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="group flex flex-col p-4 bg-card rounded-lg border border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300 mb-3 cursor-pointer"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Collapsed View */}
      {!isExpanded && (
        <>
          {/* Compact Header Row */}
          <div className="grid grid-cols-12 gap-3 mb-3">
            <div className="col-span-1 text-xs text-muted-foreground font-semibold flex items-center">
              <ChevronDown className="w-3 h-3 mr-1" />
            </div>
            <div className="col-span-5 text-xs text-muted-foreground font-semibold">НАИМЕНОВАНИЕ</div>
            <div className="col-span-3 text-xs text-muted-foreground font-semibold">ОТВЕТСТВЕННЫЙ</div>
            <div className="col-span-3 text-xs text-muted-foreground font-semibold">ПРОГРЕСС</div>
          </div>

          {/* Compact Data Row */}
          <div className="grid grid-cols-12 gap-3 items-center">
            {/* Expand Icon */}
            <div className="col-span-1 flex items-center">
              <ChevronDown className="w-4 h-4 text-muted-foreground rotate-0 group-hover:text-primary transition-colors" />
            </div>

            {/* Name & ID */}
            <div className="col-span-5 flex flex-col justify-center">
              <span className="font-semibold text-foreground truncate text-sm" title={work.name}>
                {work.name}
              </span>
              <span className="text-xs text-muted-foreground font-mono mt-0.5">
                ID: {work.id.toString().padStart(4, '0')}
              </span>
            </div>

            {/* Responsible */}
            <div className="col-span-3 flex items-center">
              <div className="flex items-center gap-1.5 bg-secondary/50 px-1.5 py-0.5 rounded text-xs text-secondary-foreground font-medium truncate max-w-full">
                <div className="w-1 h-1 rounded-full bg-primary/40 shrink-0" />
                <span className="truncate text-xs" title={work.responsiblePerson}>{work.responsiblePerson}</span>
              </div>
            </div>

            {/* Progress Control */}
            <div className="col-span-3 flex items-center gap-1">
              <input 
                type="number"
                min={0}
                max={100}
                value={localProgress}
                onChange={handleProgressInputChange}
                onBlur={handleProgressInputBlur}
                className="w-10 text-right bg-transparent border-b border-border focus:outline-none focus:border-primary text-foreground font-mono text-sm"
                onClick={(e) => e.stopPropagation()}
              />
              <span className="text-muted-foreground text-sm">%</span>
            </div>
          </div>
        </>
      )}

      {/* Expanded View */}
      {isExpanded && (
        <>
          {/* Header Row with Column Labels */}
          <div className="grid grid-cols-12 gap-3 mb-3">
            <div className="col-span-2 text-xs text-muted-foreground font-semibold">НАИМЕНОВАНИЕ</div>
            <div className="col-span-3 text-xs text-muted-foreground font-semibold text-center">ОБЪЁМ/СРОК</div>
            <div className="col-span-1 text-xs text-muted-foreground font-semibold text-center">НАЧАЛО</div>
            <div className="col-span-1 text-xs text-muted-foreground font-semibold text-center">КОНЕЦ</div>
            <div className="col-span-2 text-xs text-muted-foreground font-semibold text-center">ДНЕЙ</div>
            <div className="col-span-1 text-xs text-muted-foreground font-semibold">ОТВЕТСТВЕННЫЙ</div>
            <div className="col-span-2 text-xs text-muted-foreground font-semibold">ПРОГРЕСС</div>
          </div>

          {/* Data Row */}
          <div className="grid grid-cols-12 gap-3 items-center" onClick={(e) => e.stopPropagation()}>
        {/* Name & ID */}
        <div className="col-span-2 flex flex-col justify-center">
          <span className="font-semibold text-foreground truncate text-sm" title={work.name}>
            {work.name}
          </span>
          <span className="text-xs text-muted-foreground font-mono mt-0.5">
            ID: {work.id.toString().padStart(4, '0')}
          </span>
        </div>

        {/* Metrics: Plan | Actual | Overage - Tighter spacing */}
        <div className="col-span-3 grid grid-cols-3 gap-1 text-sm">
          {/* Plan: Volume & Days */}
          <div className="flex flex-col justify-center">
            <div className="text-xs text-muted-foreground font-medium mb-1">План</div>
            <div className="flex items-center gap-1 text-foreground/90 text-xs">
              <span className="font-mono font-medium">{work.volumeAmount}</span>
              <span className="text-muted-foreground">{work.volumeUnit}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {work.daysEstimated} дн.
            </div>
          </div>

          {/* Actual: Volume & Days */}
          <div className="flex flex-col justify-center">
            <div className="text-xs text-muted-foreground font-medium mb-1">Факт</div>
            <div className="flex items-center gap-1 text-foreground/90 text-xs">
              <span className="font-mono font-medium">{work.volumeActual}</span>
              <span className="text-muted-foreground">{work.volumeUnit}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {work.daysActual} дн.
            </div>
          </div>

          {/* Overage: Volume & Days */}
          <div className="flex flex-col justify-center">
            <div className="text-xs text-muted-foreground font-medium mb-1">Превыш</div>
            <div className="flex flex-col gap-0.5">
              {(() => {
                const volumePercent = work.volumeAmount > 0 ? ((work.volumeActual - work.volumeAmount) / work.volumeAmount) * 100 : 0;
                const daysPercent = work.daysEstimated > 0 ? ((work.daysActual - work.daysEstimated) / work.daysEstimated) * 100 : 0;
                const volumeColor = volumePercent > 0 ? 'text-red-500' : volumePercent < 0 ? 'text-green-500' : 'text-foreground/90';
                const daysColor = daysPercent > 0 ? 'text-red-500' : daysPercent < 0 ? 'text-green-500' : 'text-foreground/90';
                
                return (
                  <>
                    <span className={`font-mono text-xs ${volumeColor}`}>
                      {volumePercent > 0 ? '+' : ''}{volumePercent.toFixed(1)}%
                    </span>
                    <span className={`font-mono text-xs ${daysColor}`}>
                      {daysPercent > 0 ? '+' : ''}{daysPercent.toFixed(1)}%
                    </span>
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Plan Start Date */}
        <div className="col-span-1 flex flex-col gap-1 text-xs">
          <div className="text-muted-foreground font-medium">План</div>
          <input 
            type="date"
            value={localPlanStartDate}
            onChange={handlePlanStartDateChange}
            placeholder="-"
            className="bg-transparent border-b border-border text-foreground text-xs px-0 py-0.5 focus:outline-none focus:border-primary"
          />
          <div className="text-muted-foreground font-medium mt-1">Факт</div>
          <input 
            type="date"
            value={localActualStartDate}
            onChange={handleActualStartDateChange}
            placeholder="-"
            className="bg-transparent border-b border-border text-foreground text-xs px-0 py-0.5 focus:outline-none focus:border-primary"
          />
        </div>

        {/* Plan End Date */}
        <div className="col-span-1 flex flex-col gap-1 text-xs">
          <div className="text-muted-foreground font-medium">План</div>
          <input 
            type="date"
            value={localPlanEndDate}
            onChange={handlePlanEndDateChange}
            placeholder="-"
            className="bg-transparent border-b border-border text-foreground text-xs px-0 py-0.5 focus:outline-none focus:border-primary"
          />
          <div className="text-muted-foreground font-medium mt-1">Факт</div>
          <input 
            type="date"
            value={localActualEndDate}
            onChange={handleActualEndDateChange}
            placeholder="-"
            className="bg-transparent border-b border-border text-foreground text-xs px-0 py-0.5 focus:outline-none focus:border-primary"
          />
        </div>

        {/* Days Duration Counter */}
        <div className="col-span-2 flex flex-col gap-1 text-xs">
          <div className="text-muted-foreground font-medium">План дн.</div>
          <div className="text-foreground/90 font-mono">
            {(() => {
              const calculateDaysDuration = (startDate: string, endDate: string): number | null => {
                if (!startDate || !endDate) return null;
                const start = new Date(startDate);
                const end = new Date(endDate);
                const diffTime = end.getTime() - start.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays;
              };

              const planDays = calculateDaysDuration(localPlanStartDate, localPlanEndDate);
              return planDays !== null ? planDays : '-';
            })()}
          </div>
          
          {/* Comparison between Plan and Actual */}
          <div className="py-0.5">
            {(() => {
              const calculateDaysDuration = (startDate: string, endDate: string): number | null => {
                if (!startDate || !endDate) return null;
                const start = new Date(startDate);
                const end = new Date(endDate);
                const diffTime = end.getTime() - start.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays;
              };

              const planDays = calculateDaysDuration(localPlanStartDate, localPlanEndDate);
              const actualDays = calculateDaysDuration(localActualStartDate, localActualEndDate);

              if (planDays === null || actualDays === null) return null;

              const diff = actualDays - planDays;
              if (diff > 0) {
                return <span className="text-red-500 font-medium">Отставание {diff} дн.</span>;
              } else if (diff < 0) {
                return <span className="text-green-500 font-medium">Опережение {Math.abs(diff)} дн.</span>;
              } else {
                return <span className="text-green-500 font-medium">Плановый срок</span>;
              }
            })()}
          </div>

          <div className="text-muted-foreground font-medium">Факт дн.</div>
          <div className="text-foreground/90 font-mono">
            {(() => {
              const calculateDaysDuration = (startDate: string, endDate: string): number | null => {
                if (!startDate || !endDate) return null;
                const start = new Date(startDate);
                const end = new Date(endDate);
                const diffTime = end.getTime() - start.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays;
              };

              const actualDays = calculateDaysDuration(localActualStartDate, localActualEndDate);
              return actualDays !== null ? actualDays : '-';
            })()}
          </div>
        </div>

        {/* Responsible */}
        <div className="col-span-1 flex items-center">
          <div className="flex items-center gap-1.5 bg-secondary/50 px-1.5 py-0.5 rounded text-xs text-secondary-foreground font-medium truncate max-w-full">
            <div className="w-1 h-1 rounded-full bg-primary/40 shrink-0" />
            <span className="truncate text-xs" title={work.responsiblePerson}>{work.responsiblePerson}</span>
          </div>
        </div>

        {/* Progress Control - Inline */}
        <div className="col-span-2 flex items-center gap-1">
          <input 
            type="number"
            min={0}
            max={100}
            value={localProgress}
            onChange={handleProgressInputChange}
            onBlur={handleProgressInputBlur}
            className="w-10 text-right bg-transparent border-b border-border focus:outline-none focus:border-primary text-foreground font-mono text-sm"
          />
          <span className="text-muted-foreground text-sm">%</span>
        </div>
      </div>

          {/* Progress Slider Row */}
          <div className="mt-2 grid grid-cols-12 gap-3 items-center">
            <div className="col-span-2" />
            <div className="col-span-3" />
            <div className="col-span-1" />
            <div className="col-span-1" />
            <div className="col-span-2" />
            <div className="col-span-1" />
            <div className="col-span-2">
              <div className="relative group/slider">
                <Slider
                  defaultValue={[work.progressPercentage]}
                  value={[localProgress]}
                  max={100}
                  step={1}
                  onValueChange={handleSliderChange}
                  className="cursor-pointer"
                />
              </div>
            </div>
          </div>

              {/* Actions Row */}
          <div className="mt-12 flex justify-end gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); moveUp(work.id); }}
                >
                  <ArrowUp className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Переместить вверх</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); moveDown(work.id); }}
                >
                  <ArrowDown className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Переместить вниз</TooltipContent>
            </Tooltip>
            <div onClick={(e) => e.stopPropagation()}>
              <EditWorkDialog work={work} />
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); deleteWork(work.id); }}
                  disabled={isDeleting}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Удалить работу</TooltipContent>
            </Tooltip>
          </div>
        </>
      )}
    </motion.div>
  );
}
