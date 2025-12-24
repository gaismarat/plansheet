import { useState, useRef, useEffect } from "react";
import { type Work } from "@shared/schema";
import { useUpdateWork, useDeleteWork, useMoveWorkUp, useMoveWorkDown } from "@/hooks/use-construction";
import { EditWorkDialog } from "@/components/forms/edit-work-dialog";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Trash2, Edit2, Check, ArrowUp, ArrowDown, ChevronDown, X } from "lucide-react";
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
  const [localVolumeAmount, setLocalVolumeAmount] = useState(work.volumeAmount);
  const [localVolumeActual, setLocalVolumeActual] = useState(work.volumeActual);
  const [localCostPlan, setLocalCostPlan] = useState(work.costPlan);
  const [localCostActual, setLocalCostActual] = useState(work.costActual);
  const sliderTimeoutRef = useRef<NodeJS.Timeout>();
  const dateTimeoutRef = useRef<NodeJS.Timeout>();
  const volumeTimeoutRef = useRef<NodeJS.Timeout>();
  const costTimeoutRef = useRef<NodeJS.Timeout>();

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

  useEffect(() => {
    setLocalVolumeAmount(work.volumeAmount);
    setLocalVolumeActual(work.volumeActual);
  }, [work.volumeAmount, work.volumeActual]);

  useEffect(() => {
    setLocalCostPlan(work.costPlan);
    setLocalCostActual(work.costActual);
  }, [work.costPlan, work.costActual]);

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

  const handleVolumeAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      setLocalVolumeAmount(val);
    }
  };

  const handleVolumeAmountBlur = () => {
    if (volumeTimeoutRef.current) clearTimeout(volumeTimeoutRef.current);
    updateWork({ id: work.id, volumeAmount: localVolumeAmount });
  };

  const handleVolumeActualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      setLocalVolumeActual(val);
    }
  };

  const handleVolumeActualBlur = () => {
    if (volumeTimeoutRef.current) clearTimeout(volumeTimeoutRef.current);
    updateWork({ id: work.id, volumeActual: localVolumeActual });
  };

  const handleCostPlanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      setLocalCostPlan(val);
    }
  };

  const handleCostPlanBlur = () => {
    if (costTimeoutRef.current) clearTimeout(costTimeoutRef.current);
    updateWork({ id: work.id, costPlan: localCostPlan });
  };

  const handleCostActualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      setLocalCostActual(val);
    }
  };

  const handleCostActualBlur = () => {
    if (costTimeoutRef.current) clearTimeout(costTimeoutRef.current);
    updateWork({ id: work.id, costActual: localCostActual });
  };

  // Helper function to calculate days between two dates
  const calculateDays = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return { calendar: 0, working: 0, weekend: 0 };
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Ensure start is before end
    if (start > end) {
      return { calendar: 0, working: 0, weekend: 0 };
    }

    let calendar = 0;
    let working = 0;
    let weekend = 0;

    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      calendar++;
      
      // 0 = Sunday, 6 = Saturday
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekend++;
      } else {
        working++;
      }
      
      current.setDate(current.getDate() + 1);
    }

    return { calendar, working, weekend };
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
            <div className="col-span-1 text-xs text-muted-foreground font-semibold text-center ml-[30px] mr-[30px]">ОБЪЁМ</div>
            <div className="col-span-1 text-xs text-muted-foreground font-semibold text-center ml-[60px] mr-[30px]">СТОИМОСТЬ</div>
            <div className="col-span-1 text-xs text-muted-foreground font-semibold text-center ml-[60px]">НАЧАЛО</div>
            <div className="col-span-1 text-xs text-muted-foreground font-semibold text-center ml-[110px]">КОНЕЦ</div>
            <div className="col-span-3 text-xs text-muted-foreground font-semibold ml-[90px] mr-[50px] text-right">ТРУДОЁМКОСТЬ, дни</div>
            <div className="col-span-1 text-xs text-muted-foreground font-semibold">ОТВЕТСТВЕННЫЙ</div>
            <div className="col-span-2 text-xs text-muted-foreground font-semibold text-center">ПРОГРЕСС</div>
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

        {/* Volume column */}
        <div className="col-span-1 flex flex-col gap-1 text-xs mr-[30px]">
          {/* Plan Volume */}
          <div className="text-muted-foreground font-medium">План</div>
          <div className="flex items-center gap-1">
            <input 
              type="text"
              value={localVolumeAmount.toLocaleString('ru-RU')}
              onChange={(e) => {
                const val = parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0;
                handleVolumeAmountChange({ target: { value: val.toString() } } as any);
              }}
              onBlur={handleVolumeAmountBlur}
              className="w-20 bg-transparent border-b border-border text-foreground text-xs px-0 py-0.5 focus:outline-none focus:border-primary font-mono"
            />
            <span className="text-muted-foreground">{work.volumeUnit}</span>
          </div>

          {/* Comparison */}
          <div className="py-0.5 whitespace-nowrap">
            {(() => {
              if (localVolumeAmount === 0) return null;
              const diff = localVolumeActual - localVolumeAmount;
              const percent = (Math.abs(diff) / localVolumeAmount) * 100;
              
              if (diff > 0) {
                return <span className="text-red-500 font-medium">Превышение {percent.toFixed(1)}%</span>;
              } else if (diff < 0) {
                return <span className="text-green-500 font-medium">Экономия {percent.toFixed(1)}%</span>;
              } else {
                return <span className="text-green-500 font-medium">Плановый объём</span>;
              }
            })()}
          </div>

          {/* Actual Volume */}
          <div className="text-muted-foreground font-medium">Факт</div>
          <div className="flex items-center gap-1">
            <input 
              type="text"
              value={localVolumeActual.toLocaleString('ru-RU')}
              onChange={(e) => {
                const val = parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0;
                handleVolumeActualChange({ target: { value: val.toString() } } as any);
              }}
              onBlur={handleVolumeActualBlur}
              className="w-20 bg-transparent border-b border-border text-foreground text-xs px-0 py-0.5 focus:outline-none focus:border-primary font-mono"
            />
            <span className="text-muted-foreground">{work.volumeUnit}</span>
          </div>
        </div>

        {/* Cost column */}
        <div className="col-span-1 flex flex-col gap-1 text-xs ml-[30px] mr-[30px]">
          {/* Plan Cost */}
          <div className="text-muted-foreground font-medium">План</div>
          <div className="flex items-center gap-1">
            <input 
              type="text"
              value={localCostPlan.toLocaleString('ru-RU')}
              onChange={(e) => {
                const val = parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0;
                handleCostPlanChange({ target: { value: val.toString() } } as any);
              }}
              onBlur={handleCostPlanBlur}
              className="w-24 bg-transparent border-b border-border text-foreground text-xs px-0 py-0.5 focus:outline-none focus:border-primary font-mono"
            />
            <span className="text-muted-foreground">руб.</span>
          </div>

          {/* Comparison */}
          <div className="py-0.5 whitespace-nowrap">
            {(() => {
              if (localCostPlan === 0) return null;
              const diff = localCostActual - localCostPlan;
              const percent = (Math.abs(diff) / localCostPlan) * 100;
              
              if (diff > 0) {
                return <span className="text-red-500 font-medium">Превышение {percent.toFixed(1)}%</span>;
              } else if (diff < 0) {
                return <span className="text-green-500 font-medium">Экономия {percent.toFixed(1)}%</span>;
              } else {
                return <span className="text-green-500 font-medium">Плановая стоимость</span>;
              }
            })()}
          </div>

          {/* Actual Cost */}
          <div className="text-muted-foreground font-medium">Факт</div>
          <div className="flex items-center gap-1">
            <input 
              type="text"
              value={localCostActual.toLocaleString('ru-RU')}
              onChange={(e) => {
                const val = parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0;
                handleCostActualChange({ target: { value: val.toString() } } as any);
              }}
              onBlur={handleCostActualBlur}
              className="w-24 bg-transparent border-b border-border text-foreground text-xs px-0 py-0.5 focus:outline-none focus:border-primary font-mono"
            />
            <span className="text-muted-foreground">руб.</span>
          </div>
        </div>

        {/* Plan Start Date */}
        <div className="col-span-1 flex flex-col gap-1 text-xs ml-[60px]">
          <div className="text-muted-foreground font-medium">План</div>
          <div className="flex items-center gap-1">
            <input 
              type="date"
              value={localPlanStartDate}
              onChange={handlePlanStartDateChange}
              className="bg-transparent border-b border-border text-foreground text-xs px-0 py-0.5 focus:outline-none focus:border-primary flex-1"
              style={{color: localPlanStartDate ? 'inherit' : 'transparent'}}
            />
            {!localPlanStartDate && <span className="text-muted-foreground text-xs absolute ml-1">дд.мм.гггг</span>}
            {localPlanStartDate && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLocalPlanStartDate('');
                  updateWork({ id: work.id, planStartDate: '' });
                }}
                className="p-0.5 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          
          {/* Comparison between Plan and Actual Start Dates */}
          <div className="py-0.5 whitespace-nowrap">
            {(() => {
              if (!localPlanStartDate || !localActualStartDate) return null;

              const planDate = new Date(localPlanStartDate);
              const actualDate = new Date(localActualStartDate);
              const diffTime = planDate.getTime() - actualDate.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              if (diffDays > 0) {
                return <span className="text-green-500 font-medium">Опережение {diffDays} дн.</span>;
              } else if (diffDays < 0) {
                return <span className="text-red-500 font-medium">Отставание {Math.abs(diffDays)} дн.</span>;
              } else {
                return <span className="text-green-500 font-medium">Плановый срок</span>;
              }
            })()}
          </div>

          <div className="text-muted-foreground font-medium">Факт</div>
          <div className="flex items-center gap-1">
            <input 
              type="date"
              value={localActualStartDate}
              onChange={handleActualStartDateChange}
              className="bg-transparent border-b border-border text-foreground text-xs px-0 py-0.5 focus:outline-none focus:border-primary flex-1"
              style={{color: localActualStartDate ? 'inherit' : 'transparent'}}
            />
            {!localActualStartDate && <span className="text-muted-foreground text-xs absolute ml-1">дд.мм.гггг</span>}
            {localActualStartDate && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLocalActualStartDate('');
                  updateWork({ id: work.id, actualStartDate: '' });
                }}
                className="p-0.5 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Plan End Date */}
        <div className="col-span-1 flex flex-col gap-1 text-xs ml-[110px]">
          <div className="text-muted-foreground font-medium">План</div>
          <div className="flex items-center gap-1">
            <input 
              type="date"
              value={localPlanEndDate}
              onChange={handlePlanEndDateChange}
              className="bg-transparent border-b border-border text-foreground text-xs px-0 py-0.5 focus:outline-none focus:border-primary flex-1"
              style={{color: localPlanEndDate ? 'inherit' : 'transparent'}}
            />
            {!localPlanEndDate && <span className="text-muted-foreground text-xs absolute ml-1">дд.мм.гггг</span>}
            {localPlanEndDate && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLocalPlanEndDate('');
                  updateWork({ id: work.id, planEndDate: '' });
                }}
                className="p-0.5 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          
          {/* Comparison between Plan and Actual End Dates */}
          <div className="py-0.5 whitespace-nowrap">
            {(() => {
              if (!localPlanEndDate || !localActualEndDate) return null;

              const planDate = new Date(localPlanEndDate);
              const actualDate = new Date(localActualEndDate);
              const diffTime = planDate.getTime() - actualDate.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              if (diffDays > 0) {
                return <span className="text-green-500 font-medium">Опережение {diffDays} дн.</span>;
              } else if (diffDays < 0) {
                return <span className="text-red-500 font-medium">Отставание {Math.abs(diffDays)} дн.</span>;
              } else {
                return <span className="text-green-500 font-medium">Плановый срок</span>;
              }
            })()}
          </div>

          <div className="text-muted-foreground font-medium">Факт</div>
          <div className="flex items-center gap-1">
            <input 
              type="date"
              value={localActualEndDate}
              onChange={handleActualEndDateChange}
              className="bg-transparent border-b border-border text-foreground text-xs px-0 py-0.5 focus:outline-none focus:border-primary flex-1"
              style={{color: localActualEndDate ? 'inherit' : 'transparent'}}
            />
            {!localActualEndDate && <span className="text-muted-foreground text-xs absolute ml-1">дд.мм.гггг</span>}
            {localActualEndDate && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLocalActualEndDate('');
                  updateWork({ id: work.id, actualEndDate: '' });
                }}
                className="p-0.5 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Labor Intensity (ТРУДОЁМКОСТЬ) - Three columns */}
        <div className="col-span-3 grid grid-cols-3 gap-0 text-xs ml-[120px]">
          {/* Calendar Days */}
          <div className="flex flex-col justify-center items-center ml-[50px] mr-[50px]">
            <div className="text-muted-foreground font-medium text-center leading-tight mb-1">
              <div>Календарные</div>
            </div>
            <div className="text-muted-foreground text-[10px] mb-0.5">План</div>
            <span className="font-mono text-foreground font-medium">
              {(() => {
                const planDays = calculateDays(localPlanStartDate, localPlanEndDate);
                return planDays.calendar;
              })()}
            </span>
            <div className="text-muted-foreground text-[10px] mt-1 mb-0.5">Факт</div>
            <span className="font-mono text-foreground font-medium">
              {(() => {
                const actualDays = calculateDays(localActualStartDate, localActualEndDate);
                return actualDays.calendar;
              })()}
            </span>
          </div>
          
          {/* Working Days */}
          <div className="flex flex-col justify-center items-center ml-[25px]">
            <div className="text-muted-foreground font-medium text-center leading-tight mb-1">
              <div>Рабочие</div>
            </div>
            <div className="text-muted-foreground text-[10px] mb-0.5">План</div>
            <span className="font-mono text-foreground font-medium">
              {(() => {
                const planDays = calculateDays(localPlanStartDate, localPlanEndDate);
                return planDays.working;
              })()}
            </span>
            <div className="text-muted-foreground text-[10px] mt-1 mb-0.5">Факт</div>
            <span className="font-mono text-foreground font-medium">
              {(() => {
                const actualDays = calculateDays(localActualStartDate, localActualEndDate);
                return actualDays.working;
              })()}
            </span>
          </div>
          
          {/* Weekend Days */}
          <div className="flex flex-col justify-center items-center -ml-[5px]">
            <div className="text-muted-foreground font-medium text-center leading-tight mb-1">
              <div>Выходные</div>
            </div>
            <div className="text-muted-foreground text-[10px] mb-0.5">План</div>
            <span className="font-mono text-foreground font-medium">
              {(() => {
                const planDays = calculateDays(localPlanStartDate, localPlanEndDate);
                return planDays.weekend;
              })()}
            </span>
            <div className="text-muted-foreground text-[10px] mt-1 mb-0.5">Факт</div>
            <span className="font-mono text-foreground font-medium">
              {(() => {
                const actualDays = calculateDays(localActualStartDate, localActualEndDate);
                return actualDays.weekend;
              })()}
            </span>
          </div>
        </div>

        {/* Responsible */}
        <div className="col-span-1 flex items-center">
          <div className="flex items-center gap-1.5 bg-secondary/50 px-1.5 py-0.5 rounded text-xs text-secondary-foreground font-medium truncate max-w-full">
            <div className="w-1 h-1 rounded-full bg-primary/40 shrink-0" />
            <span className="truncate text-xs" title={work.responsiblePerson}>{work.responsiblePerson}</span>
          </div>
        </div>

        {/* Progress Control - Percentage Input and Slider */}
        <div className="col-span-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1 shrink-0">
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
          <div className="relative group/slider flex-1">
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
