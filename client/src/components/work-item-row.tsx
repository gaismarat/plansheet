import { useState, useRef, useEffect, useCallback } from "react";
import { type Work, type WorkTreeItem } from "@shared/schema";
import { useUpdateWork, useDeleteWork, useMoveWorkUp, useMoveWorkDown, useSubmitProgress, useApproveProgress, useRejectProgress, useWorkMaterials } from "@/hooks/use-construction";
import { EditWorkDialog } from "@/components/forms/edit-work-dialog";
import { ProgressHistoryDialog } from "@/components/progress-history-dialog";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowUp, ArrowDown, ChevronDown, X, Users, Check, Package } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface PeopleSummary {
  actualToday: number;
  averageActual: number;
}

interface ProgressSubmissionStatus {
  id: number;
  workId: number;
  percent: number;
  status: string;
  submitterId: number;
}

interface WorkItemRowProps {
  work: Work | WorkTreeItem;
  expandAll?: boolean;
  holidayDates?: Set<string>;
  showCost?: boolean;
  peopleSummary?: PeopleSummary;
  isAdmin?: boolean;
  progressSubmission?: ProgressSubmissionStatus | null;
  canSetProgress?: boolean;
}

function isWorkTreeItem(work: Work | WorkTreeItem): work is WorkTreeItem {
  return 'pdcName' in work;
}

function getPeopleColor(actual: number, plan: number): string {
  if (plan <= 0) return "text-muted-foreground";
  const ratio = actual / plan;
  if (ratio >= 1) return "text-green-500";
  if (ratio >= 0.8) return "text-yellow-500";
  return "text-red-500";
}

export function WorkItemRow({ work, expandAll = true, holidayDates = new Set(), showCost = true, peopleSummary, isAdmin = false, progressSubmission, canSetProgress = false }: WorkItemRowProps) {
  const { mutate: updateWork } = useUpdateWork();
  const { mutate: deleteWork, isPending: isDeleting } = useDeleteWork();
  const { mutate: moveUp } = useMoveWorkUp();
  const { mutate: moveDown } = useMoveWorkDown();
  const { mutate: submitProgress, isPending: isSubmitting } = useSubmitProgress();
  const { mutate: approveProgress, isPending: isApproving } = useApproveProgress();
  const { mutate: rejectProgress, isPending: isRejecting } = useRejectProgress();

  const isPdcWork = isWorkTreeItem(work);
  const displayName = isPdcWork ? work.pdcName : work.name;
  const displayUnit = isPdcWork ? work.pdcUnit : work.volumeUnit;
  const displayQuantityPlan = isPdcWork ? work.pdcQuantity : work.volumeAmount;
  const displayCostPlan = isPdcWork ? work.pdcCostWithVat : work.costPlan;
  
  const [isExpanded, setIsExpanded] = useState(expandAll);
  const [isMaterialsOpen, setIsMaterialsOpen] = useState(false);
  const [isEditingProgress, setIsEditingProgress] = useState(false);
  const [originalProgress, setOriginalProgress] = useState(work.progressPercentage);

  useEffect(() => {
    setIsExpanded(expandAll);
    if (!expandAll) {
      setIsMaterialsOpen(false);
    }
  }, [expandAll]);
  
  const [localProgress, setLocalProgress] = useState(work.progressPercentage);
  const pendingProgressRef = useRef<number | null>(null);
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

  useEffect(() => {
    if (pendingProgressRef.current === null) {
      setLocalProgress(work.progressPercentage);
    } else if (work.progressPercentage === pendingProgressRef.current) {
      pendingProgressRef.current = null;
    }
  }, [work.progressPercentage]);

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
    if (!canSetProgress) return;
    const newVal = value[0];
    setLocalProgress(newVal);
    if (!isEditingProgress) {
      setOriginalProgress(work.progressPercentage);
      setIsEditingProgress(true);
    }
  };

  const handleProgressInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canSetProgress) return;
    const val = parseInt(e.target.value);
    if (!isNaN(val)) {
      setLocalProgress(Math.min(100, Math.max(0, val)));
      if (!isEditingProgress) {
        setOriginalProgress(work.progressPercentage);
        setIsEditingProgress(true);
      }
    }
  };

  const handleProgressSubmit = () => {
    if (!canSetProgress) return;
    submitProgress({ workId: work.id, percent: localProgress });
    setIsEditingProgress(false);
  };

  const handleProgressCancel = () => {
    setLocalProgress(originalProgress);
    setIsEditingProgress(false);
  };

  const handleProgressApprove = () => {
    if (progressSubmission?.id) {
      approveProgress(progressSubmission.id);
    }
  };

  const handleProgressReject = () => {
    if (progressSubmission?.id) {
      rejectProgress(progressSubmission.id);
    }
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
    updateWork({ id: work.id, volumeAmount: localVolumeAmount });
  };

  const handleVolumeActualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      setLocalVolumeActual(val);
    }
  };

  const handleVolumeActualBlur = () => {
    updateWork({ id: work.id, volumeActual: localVolumeActual });
  };

  const handleCostPlanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      setLocalCostPlan(val);
    }
  };

  const handleCostPlanBlur = () => {
    updateWork({ id: work.id, costPlan: localCostPlan });
  };

  const handleCostActualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      setLocalCostActual(val);
    }
  };

  const handleCostActualBlur = () => {
    updateWork({ id: work.id, costActual: localCostActual });
  };

  const calculateDays = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return { calendar: 0, working: 0, weekend: 0 };
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
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
      
      const dateStr = current.toISOString().split('T')[0];
      const isHoliday = holidayDates.has(dateStr);
      
      if (dayOfWeek === 0 || dayOfWeek === 6 || isHoliday) {
        weekend++;
      } else {
        working++;
      }
      
      current.setDate(current.getDate() + 1);
    }

    return { calendar, working, weekend };
  };

  // Calculate planned progress based on date proportion
  const calculatePlannedProgress = () => {
    if (!localPlanStartDate || !localPlanEndDate) return 0;
    
    const planStart = new Date(localPlanStartDate);
    const planEnd = new Date(localPlanEndDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (today < planStart) return 0;
    if (today > planEnd) return 100;
    
    const totalDuration = planEnd.getTime() - planStart.getTime();
    if (totalDuration <= 0) return 100;
    
    const elapsed = today.getTime() - planStart.getTime();
    const progress = Math.round((elapsed / totalDuration) * 100);
    
    return Math.min(100, Math.max(0, progress));
  };

  const plannedProgress = calculatePlannedProgress();
  
  // Auto-set to 100% if actual end date has passed
  const isWorkCompleted = (() => {
    if (!localActualEndDate) return false;
    const actualEnd = new Date(localActualEndDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    actualEnd.setHours(0, 0, 0, 0);
    return actualEnd < today;
  })();
  
  const effectiveProgress = isWorkCompleted ? 100 : localProgress;
  const deviation = effectiveProgress - plannedProgress;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="group flex flex-col p-3 bg-card rounded-lg border border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300 mb-2 cursor-pointer"
      onClick={() => {
        const newExpanded = !isExpanded;
        setIsExpanded(newExpanded);
        if (!newExpanded) {
          setIsMaterialsOpen(false);
        }
      }}
      data-testid={`work-row-${work.id}`}
    >
      {/* Collapsed View */}
      {!isExpanded && (
        <>
          <div className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-1 flex items-center">
              <ChevronDown className="w-4 h-4 text-muted-foreground rotate-0 group-hover:text-primary transition-colors" />
            </div>

            <div className="col-span-5 flex flex-col justify-center">
              <span className="font-semibold text-foreground truncate text-sm" title={displayName}>
                {displayName}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                ID: {work.id.toString().padStart(4, '0')} | {work.responsiblePerson}
              </span>
            </div>

            <div className="col-span-2 flex items-center gap-2 text-xs">
              <Users className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">{work.plannedPeople || 0}/</span>
              <span className={getPeopleColor(peopleSummary?.actualToday || 0, work.plannedPeople || 0)}>
                {peopleSummary?.actualToday || 0}
              </span>
            </div>

            <div className="col-span-4 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <div className="flex-1 flex flex-col gap-0.5">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground w-8">План</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${plannedProgress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground w-8 text-right">{plannedProgress}%</span>
                </div>
                <div className={cn(
                  "flex items-center gap-1 px-0.5 rounded transition-all",
                  progressSubmission?.status === "submitted" && "border border-dashed border-gray-400",
                  progressSubmission?.status === "rejected" && "border border-dashed border-red-500"
                )}>
                  <span className="text-[10px] text-muted-foreground w-8">Факт</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all",
                        effectiveProgress >= plannedProgress ? "bg-green-500" : "bg-orange-500"
                      )}
                      style={{ width: `${effectiveProgress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground w-8 text-right">{effectiveProgress}%</span>
                </div>
              </div>
              <span className={cn(
                "text-xs font-medium w-12 text-right",
                deviation >= 0 ? "text-green-500" : "text-red-500"
              )}>
                {deviation >= 0 ? '+' : ''}{deviation}%
              </span>
              
              {/* Admin approve/reject buttons in collapsed view */}
              {isAdmin && progressSubmission?.status === "submitted" && (
                <div className="flex items-center gap-0.5 ml-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 text-green-600 hover:text-green-700 hover:bg-green-100"
                        onClick={(e) => { e.stopPropagation(); handleProgressApprove(); }}
                        disabled={isApproving}
                        data-testid={`button-approve-collapsed-${work.id}`}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Согласовать</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 text-red-600 hover:text-red-700 hover:bg-red-100"
                        onClick={(e) => { e.stopPropagation(); handleProgressReject(); }}
                        disabled={isRejecting}
                        data-testid={`button-reject-collapsed-${work.id}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Отклонить</TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      
      {/* Expanded View */}
      {isExpanded && (
        <>
          {/* Header Row with Column Labels */}
          <div className="grid grid-cols-12 gap-2 mb-2 text-[10px] text-muted-foreground font-semibold uppercase">
            <div className="col-span-2">Наименование</div>
            <div className="col-span-1 text-center">Объём</div>
            {showCost && <div className="col-span-1 text-center">Стоимость</div>}
            <div className="col-span-1 text-center">Начало</div>
            <div className="col-span-1 text-center">Конец</div>
            <div className={cn("text-center", showCost ? "col-span-2" : "col-span-3")}>Трудоёмкость</div>
            <div className="col-span-1 text-center">ЛЮДИ</div>
            <div className="col-span-3 text-center">Прогресс</div>
          </div>

          {/* Data Row */}
          <div className="grid grid-cols-12 gap-2 items-start text-xs" onClick={(e) => e.stopPropagation()}>
            {/* Name & ID & Responsible */}
            <div className="col-span-2 flex flex-col justify-center">
              <span className="font-semibold text-foreground truncate text-sm" title={displayName}>
                {displayName}
              </span>
              <span className="text-xs text-muted-foreground font-mono mt-0.5">
                ID: {work.id.toString().padStart(4, '0')}
              </span>
              <span className="text-xs text-muted-foreground truncate" title={work.responsiblePerson}>
                {work.responsiblePerson}
              </span>
            </div>

            {/* Volume column */}
            <div className="col-span-1 flex flex-col gap-0.5">
              <div className="text-muted-foreground font-medium">План</div>
              <div className="flex items-center gap-0.5">
                {isPdcWork ? (
                  <span className="font-mono text-xs text-foreground" data-testid={`text-volume-plan-${work.id}`}>
                    {displayQuantityPlan.toLocaleString('ru-RU')}
                  </span>
                ) : (
                  <input 
                    type="text"
                    value={localVolumeAmount.toLocaleString('ru-RU')}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0;
                      handleVolumeAmountChange({ target: { value: val.toString() } } as any);
                    }}
                    onBlur={handleVolumeAmountBlur}
                    className="w-14 bg-transparent border-b border-border text-foreground text-xs px-0 py-0 focus:outline-none focus:border-primary font-mono"
                    data-testid={`input-volume-plan-${work.id}`}
                  />
                )}
                <span className="text-muted-foreground text-[10px]">{displayUnit}</span>
              </div>

              <div className="py-0.5 whitespace-nowrap text-[10px]">
                {(() => {
                  if (displayQuantityPlan === 0) return null;
                  const diff = localVolumeActual - displayQuantityPlan;
                  const percent = (Math.abs(diff) / displayQuantityPlan) * 100;
                  
                  if (diff > 0) {
                    return <span className="text-red-500">+{percent.toFixed(0)}%</span>;
                  } else if (diff < 0) {
                    return <span className="text-green-500">-{percent.toFixed(0)}%</span>;
                  }
                  return null;
                })()}
              </div>

              <div className="text-muted-foreground font-medium">Факт</div>
              <div className="flex items-center gap-0.5">
                <input 
                  type="text"
                  value={localVolumeActual.toLocaleString('ru-RU')}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0;
                    handleVolumeActualChange({ target: { value: val.toString() } } as any);
                  }}
                  onBlur={handleVolumeActualBlur}
                  className="w-14 bg-transparent border-b border-border text-foreground text-xs px-0 py-0 focus:outline-none focus:border-primary font-mono"
                  data-testid={`input-volume-actual-${work.id}`}
                />
                <span className="text-muted-foreground text-[10px]">{displayUnit}</span>
              </div>
            </div>

            {/* Cost column */}
            {showCost && (
              <div className="col-span-1 flex flex-col gap-0.5">
                <div className="text-muted-foreground font-medium">План</div>
                <div className="flex items-center gap-0.5">
                  {isPdcWork ? (
                    <span className="font-mono text-xs text-foreground" data-testid={`text-cost-plan-${work.id}`}>
                      {displayCostPlan.toLocaleString('ru-RU')}
                    </span>
                  ) : (
                    <input 
                      type="text"
                      value={localCostPlan.toLocaleString('ru-RU')}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0;
                        handleCostPlanChange({ target: { value: val.toString() } } as any);
                      }}
                      onBlur={handleCostPlanBlur}
                      className="w-16 bg-transparent border-b border-border text-foreground text-xs px-0 py-0 focus:outline-none focus:border-primary font-mono"
                      data-testid={`input-cost-plan-${work.id}`}
                    />
                  )}
                </div>

                <div className="py-0.5 whitespace-nowrap text-[10px]">
                  {(() => {
                    if (displayCostPlan === 0) return null;
                    const diff = localCostActual - displayCostPlan;
                    const percent = (Math.abs(diff) / displayCostPlan) * 100;
                    
                    if (diff > 0) {
                      return <span className="text-red-500">+{percent.toFixed(0)}%</span>;
                    } else if (diff < 0) {
                      return <span className="text-green-500">-{percent.toFixed(0)}%</span>;
                    }
                    return null;
                  })()}
                </div>

                <div className="text-muted-foreground font-medium">Факт</div>
                <div className="flex items-center gap-0.5">
                  <input 
                    type="text"
                    value={localCostActual.toLocaleString('ru-RU')}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0;
                      handleCostActualChange({ target: { value: val.toString() } } as any);
                    }}
                    onBlur={handleCostActualBlur}
                    className="w-16 bg-transparent border-b border-border text-foreground text-xs px-0 py-0 focus:outline-none focus:border-primary font-mono"
                    data-testid={`input-cost-actual-${work.id}`}
                  />
                </div>
              </div>
            )}

            {/* Start Date */}
            <div className="col-span-1 flex flex-col gap-0.5">
              <div className="text-muted-foreground font-medium">План</div>
              <div className="flex items-center gap-0.5">
                <input 
                  type="date"
                  value={localPlanStartDate}
                  onChange={handlePlanStartDateChange}
                  className="w-full bg-transparent border-b border-border text-foreground text-[10px] px-0 py-0 focus:outline-none focus:border-primary"
                  style={{color: localPlanStartDate ? 'inherit' : 'transparent'}}
                  data-testid={`input-plan-start-${work.id}`}
                />
                {localPlanStartDate && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocalPlanStartDate('');
                      updateWork({ id: work.id, planStartDate: '' });
                    }}
                    className="p-0 hover:text-destructive text-muted-foreground transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
              
              <div className="py-0.5 whitespace-nowrap text-[10px]">
                {(() => {
                  if (!localPlanStartDate || !localActualStartDate) return null;
                  const planDate = new Date(localPlanStartDate);
                  const actualDate = new Date(localActualStartDate);
                  const diffTime = planDate.getTime() - actualDate.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                  if (diffDays > 0) {
                    return <span className="text-green-500">+{diffDays}д</span>;
                  } else if (diffDays < 0) {
                    return <span className="text-red-500">{diffDays}д</span>;
                  }
                  return null;
                })()}
              </div>

              <div className="text-muted-foreground font-medium">Факт</div>
              <div className="flex items-center gap-0.5">
                <input 
                  type="date"
                  value={localActualStartDate}
                  onChange={handleActualStartDateChange}
                  className="w-full bg-transparent border-b border-border text-foreground text-[10px] px-0 py-0 focus:outline-none focus:border-primary"
                  style={{color: localActualStartDate ? 'inherit' : 'transparent'}}
                  data-testid={`input-actual-start-${work.id}`}
                />
                {localActualStartDate && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocalActualStartDate('');
                      updateWork({ id: work.id, actualStartDate: '' });
                    }}
                    className="p-0 hover:text-destructive text-muted-foreground transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            </div>

            {/* End Date */}
            <div className="col-span-1 flex flex-col gap-0.5">
              <div className="text-muted-foreground font-medium">План</div>
              <div className="flex items-center gap-0.5">
                <input 
                  type="date"
                  value={localPlanEndDate}
                  onChange={handlePlanEndDateChange}
                  className="w-full bg-transparent border-b border-border text-foreground text-[10px] px-0 py-0 focus:outline-none focus:border-primary"
                  style={{color: localPlanEndDate ? 'inherit' : 'transparent'}}
                  data-testid={`input-plan-end-${work.id}`}
                />
                {localPlanEndDate && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocalPlanEndDate('');
                      updateWork({ id: work.id, planEndDate: '' });
                    }}
                    className="p-0 hover:text-destructive text-muted-foreground transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
              
              <div className="py-0.5 whitespace-nowrap text-[10px]">
                {(() => {
                  if (!localPlanEndDate || !localActualEndDate) return null;
                  const planDate = new Date(localPlanEndDate);
                  const actualDate = new Date(localActualEndDate);
                  const diffTime = planDate.getTime() - actualDate.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                  if (diffDays > 0) {
                    return <span className="text-green-500">+{diffDays}д</span>;
                  } else if (diffDays < 0) {
                    return <span className="text-red-500">{diffDays}д</span>;
                  }
                  return null;
                })()}
              </div>

              <div className="text-muted-foreground font-medium">Факт</div>
              <div className="flex items-center gap-0.5">
                <input 
                  type="date"
                  value={localActualEndDate}
                  onChange={handleActualEndDateChange}
                  className="w-full bg-transparent border-b border-border text-foreground text-[10px] px-0 py-0 focus:outline-none focus:border-primary"
                  style={{color: localActualEndDate ? 'inherit' : 'transparent'}}
                  data-testid={`input-actual-end-${work.id}`}
                />
                {localActualEndDate && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocalActualEndDate('');
                      updateWork({ id: work.id, actualEndDate: '' });
                    }}
                    className="p-0 hover:text-destructive text-muted-foreground transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Labor Intensity */}
            <div className={cn("grid grid-cols-3 gap-1 text-center", showCost ? "col-span-2" : "col-span-3")}>
              <div className="flex flex-col items-center">
                <div className="text-muted-foreground font-medium text-[10px] mb-0.5">Календ.</div>
                <div className="text-[9px] text-muted-foreground">План</div>
                <span className="font-mono text-foreground text-xs">{calculateDays(localPlanStartDate, localPlanEndDate).calendar}</span>
                <div className="text-[9px] text-muted-foreground mt-0.5">Факт</div>
                <span className="font-mono text-foreground text-xs">{calculateDays(localActualStartDate, localActualEndDate).calendar}</span>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="text-muted-foreground font-medium text-[10px] mb-0.5">Рабочие</div>
                <div className="text-[9px] text-muted-foreground">План</div>
                <span className="font-mono text-foreground text-xs">{calculateDays(localPlanStartDate, localPlanEndDate).working}</span>
                <div className="text-[9px] text-muted-foreground mt-0.5">Факт</div>
                <span className="font-mono text-foreground text-xs">{calculateDays(localActualStartDate, localActualEndDate).working}</span>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="text-muted-foreground font-medium text-[10px] mb-0.5">Выходн.</div>
                <div className="text-[9px] text-muted-foreground">План</div>
                <span className="font-mono text-foreground text-xs">{calculateDays(localPlanStartDate, localPlanEndDate).weekend}</span>
                <div className="text-[9px] text-muted-foreground mt-0.5">Факт</div>
                <span className="font-mono text-foreground text-xs">{calculateDays(localActualStartDate, localActualEndDate).weekend}</span>
              </div>
            </div>

            {/* People Resources */}
            <div className="col-span-1 flex flex-col gap-0.5 items-center">
              <div className="flex flex-col items-center">
                <div className="text-muted-foreground font-medium text-[10px]">Сегодня</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[9px] text-muted-foreground">План</span>
                  <span className="font-mono text-foreground text-xs">{work.plannedPeople || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-muted-foreground">Факт</span>
                  <span className={cn("font-mono text-xs", getPeopleColor(peopleSummary?.actualToday || 0, work.plannedPeople || 0))}>
                    {peopleSummary?.actualToday || 0}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-center mt-1">
                <div className="text-muted-foreground font-medium text-[10px]">Среднее</div>
                <span className={cn("font-mono text-xs", getPeopleColor(peopleSummary?.averageActual || 0, work.plannedPeople || 0))}>
                  {peopleSummary?.averageActual?.toFixed(1) || '0.0'}
                </span>
              </div>
            </div>

            {/* Progress Control */}
            <div className="col-span-3 flex flex-col gap-1">
              {/* Plan Progress */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-8 shrink-0">План</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${plannedProgress}%` }}
                  />
                </div>
                <span className="text-xs font-mono w-16 text-right">{plannedProgress}%</span>
              </div>

              {/* Fact Progress with Slider */}
              <div className={cn(
                "flex items-center gap-2 p-1 rounded transition-all",
                progressSubmission?.status === "submitted" && "border border-dashed border-gray-400",
                progressSubmission?.status === "rejected" && "border border-dashed border-red-500"
              )}>
                <span className="text-[10px] text-muted-foreground w-8 shrink-0">Факт</span>
                <div className="flex-1 h-2">
                  <Slider
                    defaultValue={[work.progressPercentage]}
                    value={[localProgress]}
                    max={100}
                    step={1}
                    onValueChange={canSetProgress ? handleSliderChange : undefined}
                    disabled={!canSetProgress}
                    className={cn("h-2", canSetProgress ? "cursor-pointer" : "cursor-not-allowed opacity-60")}
                    data-testid={`slider-progress-${work.id}`}
                  />
                </div>
                <input 
                  type="number"
                  min={0}
                  max={100}
                  value={localProgress}
                  onChange={canSetProgress ? handleProgressInputChange : undefined}
                  disabled={!canSetProgress}
                  readOnly={!canSetProgress}
                  className={cn(
                    "w-10 text-right bg-transparent border-b border-border focus:outline-none focus:border-primary text-foreground font-mono text-xs",
                    !canSetProgress && "cursor-not-allowed opacity-60"
                  )}
                  data-testid={`input-progress-${work.id}`}
                />
                <span className="text-muted-foreground text-xs w-2">%</span>
              </div>

              {/* Progress Approval Buttons */}
              <div className="flex items-center justify-end gap-1 mt-1">
                {/* User submit/cancel buttons - shown when editing and has permission */}
                {canSetProgress && isEditingProgress && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-100"
                          onClick={handleProgressSubmit}
                          disabled={isSubmitting}
                          data-testid={`button-progress-submit-${work.id}`}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Отправить на согласование</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-100"
                          onClick={handleProgressCancel}
                          data-testid={`button-progress-cancel-${work.id}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Отменить</TooltipContent>
                    </Tooltip>
                  </>
                )}

                {/* Admin approve/reject buttons - shown for pending submissions */}
                {!isEditingProgress && isAdmin && progressSubmission?.status === "submitted" && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-100"
                          onClick={handleProgressApprove}
                          disabled={isApproving}
                          data-testid={`button-progress-approve-${work.id}`}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Согласовать</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-100"
                          onClick={handleProgressReject}
                          disabled={isRejecting}
                          data-testid={`button-progress-reject-${work.id}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Отклонить</TooltipContent>
                    </Tooltip>
                  </>
                )}

                {/* History button */}
                <ProgressHistoryDialog workId={work.id} workName={displayName} />
              </div>

              {/* Deviation */}
              <div className="flex items-center justify-end gap-1">
                <span className="text-[10px] text-muted-foreground">Отклонение:</span>
                <span className={cn(
                  "text-xs font-medium",
                  deviation >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {deviation >= 0 ? '+' : ''}{deviation}%
                </span>
              </div>
            </div>
          </div>

          {/* Actions Row */}
          <div className="mt-2 flex justify-between items-center">
            {isPdcWork && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs"
                onClick={(e) => { e.stopPropagation(); setIsMaterialsOpen(!isMaterialsOpen); }}
                data-testid={`button-materials-${work.id}`}
              >
                <Package className="w-3.5 h-3.5" />
                Материалы
                <ChevronDown className={cn("w-3 h-3 transition-transform", isMaterialsOpen && "rotate-180")} />
              </Button>
            )}
            {!isPdcWork && <div />}
            
            <div className="flex gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); moveUp(work.id); }}
                    data-testid={`button-move-up-${work.id}`}
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Переместить вверх</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); moveDown(work.id); }}
                    data-testid={`button-move-down-${work.id}`}
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
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
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); deleteWork(work.id); }}
                    disabled={isDeleting}
                    data-testid={`button-delete-${work.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Удалить работу</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Materials Spoiler */}
          {isPdcWork && isMaterialsOpen && (
            <MaterialsSpoiler workId={work.id} showCost={showCost} />
          )}
        </>
      )}
    </motion.div>
  );
}

function MaterialsSpoiler({ workId, showCost }: { workId: number; showCost: boolean }) {
  const { data: materials = [], isLoading } = useWorkMaterials(workId);

  if (isLoading) {
    return (
      <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border/50">
        <p className="text-xs text-muted-foreground">Загрузка материалов...</p>
      </div>
    );
  }

  if (materials.length === 0) {
    return (
      <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border/50">
        <p className="text-xs text-muted-foreground">Материалы не найдены</p>
      </div>
    );
  }

  return (
    <div className="mt-3 bg-muted/50 rounded-lg border border-border/50 overflow-hidden" onClick={(e) => e.stopPropagation()}>
      <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted/70 text-[10px] font-semibold text-muted-foreground uppercase">
        <div className="col-span-1">N</div>
        <div className="col-span-5">Наименование</div>
        <div className="col-span-2">Ед. изм.</div>
        <div className="col-span-2 text-right">Количество</div>
        {showCost && <div className="col-span-2 text-right">Стоимость</div>}
      </div>
      <div className="divide-y divide-border/30">
        {materials.map((material, index) => (
          <div 
            key={material.id} 
            className="grid grid-cols-12 gap-2 px-3 py-2 text-xs hover:bg-muted/30 transition-colors"
            data-testid={`material-row-${material.id}`}
          >
            <div className="col-span-1 font-mono text-muted-foreground">{material.number || (index + 1)}</div>
            <div className="col-span-5 truncate" title={material.name}>{material.name}</div>
            <div className="col-span-2 text-muted-foreground">{material.unit}</div>
            <div className="col-span-2 text-right font-mono">{material.quantity.toLocaleString('ru-RU')}</div>
            {showCost && (
              <div className="col-span-2 text-right font-mono">
                {material.costWithVat.toLocaleString('ru-RU')} <span className="text-muted-foreground text-[10px]">руб.</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
