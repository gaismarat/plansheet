import { useState, useRef, useEffect, useCallback } from "react";
import { type Work, type WorkTreeItem } from "@shared/schema";
import { useUpdateWork, useDeleteWork, useMoveWorkUp, useMoveWorkDown, useSubmitProgress, useApproveProgress, useRejectProgress, useWorkMaterials, useWorkMaterialProgress, useUpdateWorkMaterialProgress, useWorkSectionProgress, useSubmitSectionProgress, useLatestSectionSubmissions, useSectionPeopleSummary, useUpdateSectionProgress, type WorkSectionProgressItem, type SectionSubmission, type SectionPeopleSummary } from "@/hooks/use-construction";
import { EditWorkDialog } from "@/components/forms/edit-work-dialog";
import { ProgressHistoryDialog } from "@/components/progress-history-dialog";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronRight, X, Users, Check, Building2, Edit2, Settings2, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
  weekendHolidayWorkedDays: number;
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
  const sectionsCount = isPdcWork ? work.sectionsCount : 1;
  const hasMultipleSections = sectionsCount > 1;
  
  const { data: sectionProgress = [] } = useWorkSectionProgress(hasMultipleSections ? work.id : 0);
  
  // Calculate aggregated progress for multi-section works (weighted average by equal coefficients = arithmetic mean)
  const aggregatedProgress = hasMultipleSections && sectionsCount > 0
    ? Math.round(
        sectionProgress.reduce((sum, sp) => sum + (sp.progressPercentage || 0), 0) / sectionsCount
      )
    : work.progressPercentage;
  
  const [isExpanded, setIsExpanded] = useState(expandAll);
  const [isSectionsOpen, setIsSectionsOpen] = useState(false);
  const [isVolumesOpen, setIsVolumesOpen] = useState(false);
  const [isEditingProgress, setIsEditingProgress] = useState(false);
  const [originalProgress, setOriginalProgress] = useState(work.progressPercentage);

  useEffect(() => {
    setIsExpanded(expandAll);
    if (!expandAll) {
      setIsVolumesOpen(false);
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
  
  // For multi-section works, use aggregated progress; for single-section, use localProgress
  const effectiveProgress = isWorkCompleted ? 100 : (hasMultipleSections ? aggregatedProgress : localProgress);
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
                ID: {work.id.toString().padStart(4, '0')}{isPdcWork && work.executorName ? ` | ${work.executorName}` : ''}
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
            {/* Name & ID & Executor */}
            <div className="col-span-2 flex flex-col justify-center">
              <span 
                className="font-semibold text-foreground text-sm line-clamp-3 break-words" 
                style={{ hyphens: 'auto', WebkitHyphens: 'auto' }}
                lang="ru"
                title={displayName}
              >
                {displayName}
              </span>
              <span className="text-xs text-muted-foreground font-mono mt-0.5">
                ID: {work.id.toString().padStart(4, '0')}
              </span>
              {isPdcWork && work.executorName && (
                <span className="text-xs text-muted-foreground truncate" title={work.executorName}>
                  {work.executorName}
                </span>
              )}
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
                <span className="font-mono text-foreground text-xs flex items-center gap-0.5">
                  {calculateDays(localActualStartDate, localActualEndDate).working}
                  {(peopleSummary?.weekendHolidayWorkedDays ?? 0) > 0 && (
                    <span className="text-green-500">(+{peopleSummary?.weekendHolidayWorkedDays})</span>
                  )}
                </span>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="text-muted-foreground font-medium text-[10px] mb-0.5">Выходн.</div>
                <div className="text-[9px] text-muted-foreground">План</div>
                <span className="font-mono text-foreground text-xs">{calculateDays(localPlanStartDate, localPlanEndDate).weekend}</span>
                <div className="text-[9px] text-muted-foreground mt-0.5">Факт</div>
                <span className="font-mono text-foreground text-xs flex items-center gap-0.5">
                  {calculateDays(localActualStartDate, localActualEndDate).weekend}
                  {(peopleSummary?.weekendHolidayWorkedDays ?? 0) > 0 && (
                    <span className="text-red-500">(-{peopleSummary?.weekendHolidayWorkedDays})</span>
                  )}
                </span>
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

              {/* Fact Progress - Slider for single section, read-only aggregate for multiple sections */}
              {hasMultipleSections ? (
                // Read-only aggregated progress for multi-section works
                <div className="flex items-center gap-2 p-1 rounded transition-all">
                  <span className="text-[10px] text-muted-foreground w-8 shrink-0">Факт</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${aggregatedProgress}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono w-16 text-right" data-testid={`text-aggregated-progress-${work.id}`}>
                    {aggregatedProgress}%
                  </span>
                </div>
              ) : (
                // Editable slider for single-section works
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
              )}

              {/* Progress Approval Buttons - only for single-section works */}
              <div className="flex items-center justify-end gap-1 mt-1">
                {/* User submit/cancel buttons - shown when editing and has permission (single-section only) */}
                {!hasMultipleSections && canSetProgress && isEditingProgress && (
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

                {/* Admin approve/reject buttons - shown for pending submissions (single-section only) */}
                {!hasMultipleSections && !isEditingProgress && isAdmin && progressSubmission?.status === "submitted" && (
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
            <div className="flex gap-2">
              {hasMultipleSections && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={(e) => { e.stopPropagation(); setIsSectionsOpen(!isSectionsOpen); }}
                  data-testid={`button-sections-${work.id}`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Секции ({sectionsCount})
                  <ChevronDown className={cn("w-3 h-3 transition-transform", isSectionsOpen && "rotate-180")} />
                </Button>
              )}
              {isPdcWork && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={(e) => { e.stopPropagation(); setIsVolumesOpen(!isVolumesOpen); }}
                  data-testid={`button-volumes-${work.id}`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  Объёмы, деньги
                  <ChevronDown className={cn("w-3 h-3 transition-transform", isVolumesOpen && "rotate-180")} />
                </Button>
              )}
            </div>
            
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <EditWorkDialog work={work} />
            </div>
          </div>

          {/* Sections Spoiler */}
          {hasMultipleSections && isSectionsOpen && (
            <SectionsSpoiler 
              workId={work.id} 
              sectionsCount={sectionsCount} 
              sectionProgress={sectionProgress}
              displayQuantityPlan={displayQuantityPlan}
              displayCostPlan={displayCostPlan}
              displayUnit={displayUnit}
              showCost={showCost}
              canSetProgress={canSetProgress}
              isAdmin={isAdmin}
            />
          )}


          {/* Volumes & Money Spoiler */}
          {isPdcWork && isVolumesOpen && (
            <VolumesMoneySpoiler 
              workId={work.id} 
              showCost={showCost} 
              planStartDate={work.planStartDate}
              planEndDate={work.planEndDate}
            />
          )}
        </>
      )}
    </motion.div>
  );
}

function SectionsSpoiler({ 
  workId, 
  sectionsCount, 
  sectionProgress,
  displayQuantityPlan,
  displayCostPlan,
  displayUnit,
  showCost,
  canSetProgress,
  isAdmin
}: { 
  workId: number; 
  sectionsCount: number; 
  sectionProgress: WorkSectionProgressItem[];
  displayQuantityPlan: number;
  displayCostPlan: number;
  displayUnit: string;
  showCost: boolean;
  canSetProgress: boolean;
  isAdmin: boolean;
}) {
  const { data: sectionSubmissions = [] } = useLatestSectionSubmissions(workId);
  const { data: peopleSummaries = [] } = useSectionPeopleSummary(workId);
  
  const sectionProgressMap = new Map<number, WorkSectionProgressItem>();
  for (const sp of sectionProgress) {
    sectionProgressMap.set(sp.sectionNumber, sp);
  }
  
  const sectionSubmissionsMap = new Map<number, SectionSubmission>();
  for (const ss of sectionSubmissions) {
    if (ss.sectionNumber !== null) {
      sectionSubmissionsMap.set(ss.sectionNumber, ss);
    }
  }
  
  const peopleSummaryMap = new Map<number, SectionPeopleSummary>();
  for (const ps of peopleSummaries) {
    peopleSummaryMap.set(ps.sectionNumber, ps);
  }
  
  const sectionQuantity = displayQuantityPlan / sectionsCount;
  const sectionCost = displayCostPlan / sectionsCount;

  const gridCols = showCost 
    ? '40px 90px 90px 180px 70px 50px 120px 1fr'
    : '40px 100px 180px 70px 50px 120px 1fr';

  return (
    <div className="mt-3 bg-muted/50 rounded-lg border border-border/50 overflow-hidden" onClick={(e) => e.stopPropagation()}>
      <div className="grid gap-2 px-3 py-2 bg-muted/70 text-[10px] font-semibold text-muted-foreground uppercase" style={{ gridTemplateColumns: gridCols }}>
        <div>Сек</div>
        <div className="text-center">Объём</div>
        {showCost && <div className="text-center">Стоимость</div>}
        <div className="text-center">Даты</div>
        <div className="text-center">Люди</div>
        <div className="text-center">Средн.</div>
        <div className="text-center">
          <div>Трудоёмкость</div>
          <div className="grid grid-cols-3 gap-0 text-[8px] mt-0.5">
            <span>Календ.</span>
            <span>Рабочие</span>
            <span>Выходн.</span>
          </div>
        </div>
        <div className="text-right">Прогресс</div>
      </div>
      <div className="divide-y divide-border/30">
        {Array.from({ length: sectionsCount }, (_, i) => i + 1).map((sectionNum) => {
          const progress = sectionProgressMap.get(sectionNum);
          const submission = sectionSubmissionsMap.get(sectionNum);
          const peopleSummary = peopleSummaryMap.get(sectionNum);
          
          return (
            <SectionRow
              key={sectionNum}
              workId={workId}
              sectionNumber={sectionNum}
              sectionQuantity={sectionQuantity}
              sectionCost={sectionCost}
              progress={progress}
              peopleSummary={peopleSummary}
              displayUnit={displayUnit}
              showCost={showCost}
              canSetProgress={canSetProgress}
              isAdmin={isAdmin}
              pendingSubmission={submission?.status === 'submitted' ? submission : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}`;
  }
  return dateStr;
}

function formatDateWithYear(dateStr: string | null): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return dateStr;
}

function getDeviationClass(actual: number, plan: number, isExpense: boolean): string {
  if (plan === 0) return '';
  const diff = actual - plan;
  if (diff === 0) return '';
  if (isExpense) {
    return diff > 0 ? 'text-red-500' : 'text-green-500';
  }
  return diff > 0 ? 'text-green-500' : 'text-red-500';
}

function SectionRow({
  workId,
  sectionNumber,
  sectionQuantity,
  sectionCost,
  progress,
  peopleSummary,
  displayUnit,
  showCost,
  canSetProgress,
  isAdmin,
  pendingSubmission
}: {
  workId: number;
  sectionNumber: number;
  sectionQuantity: number;
  sectionCost: number;
  progress?: WorkSectionProgressItem;
  peopleSummary?: SectionPeopleSummary;
  displayUnit: string;
  showCost: boolean;
  canSetProgress: boolean;
  isAdmin: boolean;
  pendingSubmission?: SectionSubmission;
}) {
  const actualVolume = progress?.volumeActual || 0;
  const actualCost = progress?.costActual || 0;
  const progressPercent = progress?.progressPercentage || 0;
  const planStartDate = progress?.planStartDate || null;
  const planEndDate = progress?.planEndDate || null;
  const actualStartDate = progress?.actualStartDate || null;
  const actualEndDate = progress?.actualEndDate || null;
  const plannedPeople = progress?.plannedPeople || 0;
  
  const actualPeopleToday = peopleSummary?.actualToday || 0;
  const avgPeople = peopleSummary?.averageActual || 0;
  const workload = peopleSummary?.workload || 0;
  
  const [localProgress, setLocalProgress] = useState(progressPercent);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    planStartDate: planStartDate || '',
    planEndDate: planEndDate || '',
    actualStartDate: actualStartDate || '',
    actualEndDate: actualEndDate || '',
    volumeActual: actualVolume,
    costActual: actualCost,
    plannedPeople: plannedPeople,
  });
  
  useEffect(() => {
    setFormData({
      planStartDate: planStartDate || '',
      planEndDate: planEndDate || '',
      actualStartDate: actualStartDate || '',
      actualEndDate: actualEndDate || '',
      volumeActual: actualVolume,
      costActual: actualCost,
      plannedPeople: plannedPeople,
    });
  }, [planStartDate, planEndDate, actualStartDate, actualEndDate, actualVolume, actualCost, plannedPeople]);
  
  const { mutate: submitSectionProgress, isPending: isSubmitting } = useSubmitSectionProgress();
  const { mutate: approveProgress, isPending: isApproving } = useApproveProgress();
  const { mutate: rejectProgress, isPending: isRejecting } = useRejectProgress();
  const { mutate: updateSectionProgress, isPending: isSaving } = useUpdateSectionProgress();
  
  const handleSaveSection = () => {
    const dataToSave: any = {
      workId,
      sectionNumber,
    };
    
    const origPlanStart = planStartDate || '';
    const origPlanEnd = planEndDate || '';
    const origActualStart = actualStartDate || '';
    const origActualEnd = actualEndDate || '';
    
    if (formData.planStartDate !== origPlanStart) {
      dataToSave.planStartDate = formData.planStartDate || null;
    }
    if (formData.planEndDate !== origPlanEnd) {
      dataToSave.planEndDate = formData.planEndDate || null;
    }
    if (formData.actualStartDate !== origActualStart) {
      dataToSave.actualStartDate = formData.actualStartDate || null;
    }
    if (formData.actualEndDate !== origActualEnd) {
      dataToSave.actualEndDate = formData.actualEndDate || null;
    }
    if (formData.volumeActual !== actualVolume) {
      dataToSave.volumeActual = formData.volumeActual;
    }
    if (formData.costActual !== actualCost) {
      dataToSave.costActual = formData.costActual;
    }
    if (formData.plannedPeople !== plannedPeople) {
      dataToSave.plannedPeople = formData.plannedPeople;
    }
    
    const hasChanges = Object.keys(dataToSave).length > 2;
    if (!hasChanges) {
      setIsEditDialogOpen(false);
      return;
    }
    
    updateSectionProgress(dataToSave, {
      onSuccess: () => setIsEditDialogOpen(false),
    });
  };
  
  useEffect(() => {
    setLocalProgress(progressPercent);
  }, [progressPercent]);
  
  const handleSubmit = () => {
    submitSectionProgress({ workId, sectionNumber, percent: localProgress });
  };
  
  const isPending = pendingSubmission !== undefined;
  const pendingPercent = pendingSubmission?.percent;
  
  const volumeDevClass = getDeviationClass(actualVolume, sectionQuantity, true);
  const costDevClass = getDeviationClass(actualCost, sectionCost, true);
  const volumeProgress = sectionQuantity > 0 ? Math.round((actualVolume / sectionQuantity) * 100) : 0;
  
  const gridCols = showCost 
    ? '40px 90px 90px 180px 70px 50px 120px 1fr'
    : '40px 100px 180px 70px 50px 120px 1fr';
  
  const planCalendar = peopleSummary?.planCalendarDays || 0;
  const planWorking = peopleSummary?.planWorkingDays || 0;
  const planWeekend = peopleSummary?.planWeekendDays || 0;
  const actualCalendar = peopleSummary?.actualCalendarDays || 0;
  const actualWorking = peopleSummary?.actualWorkingDays || 0;
  const actualWeekend = peopleSummary?.actualWeekendDays || 0;

  return (
    <div 
      className={cn(
        "grid gap-2 px-3 py-2 text-xs hover:bg-muted/30 transition-colors items-center",
        isPending && "bg-yellow-500/10"
      )}
      style={{ gridTemplateColumns: gridCols }}
      data-testid={`section-row-${workId}-${sectionNumber}`}
    >
      <div className="flex items-center gap-1">
        <span className="font-mono text-muted-foreground font-semibold">{sectionNumber}с</span>
        {(canSetProgress || isAdmin) && (
          <Button
            size="icon"
            variant="ghost"
            className="h-4 w-4"
            onClick={() => setIsEditDialogOpen(true)}
            data-testid={`button-edit-section-data-${workId}-${sectionNumber}`}
          >
            <Settings2 className="h-2.5 w-2.5" />
          </Button>
        )}
      </div>
      
      <div className="text-center">
        <div className="font-mono text-muted-foreground text-xs">{sectionQuantity.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}</div>
        <div className={cn("font-mono font-semibold text-xs", volumeDevClass)}>
          {actualVolume.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}
          <span className="text-muted-foreground text-[10px] ml-0.5">{displayUnit}</span>
        </div>
      </div>
      
      {showCost && (
        <div className="text-center">
          <div className="font-mono text-muted-foreground text-xs">{sectionCost.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}</div>
          <div className={cn("font-mono font-semibold text-xs", costDevClass)}>
            {actualCost.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
            <span className="text-muted-foreground text-[10px] ml-0.5">р</span>
          </div>
        </div>
      )}
      
      <div className="text-center">
        <div className="font-mono text-muted-foreground text-xs">
          {formatDateWithYear(planStartDate)} - {formatDateWithYear(planEndDate)}
        </div>
        <div className="font-mono text-xs font-semibold">
          {formatDateWithYear(actualStartDate)} - {formatDateWithYear(actualEndDate)}
        </div>
      </div>
      
      <div className="text-center">
        <div className="font-mono text-muted-foreground text-xs">план: {plannedPeople}</div>
        <div className="font-mono text-xs">
          <span className="text-muted-foreground">факт: </span>
          <span className={cn(
            "font-semibold",
            actualPeopleToday >= plannedPeople ? "text-green-500" : "text-red-500"
          )}>{actualPeopleToday}</span>
        </div>
      </div>
      
      <div className="text-center">
        <div className={cn(
          "font-mono text-xs font-semibold",
          avgPeople < plannedPeople ? "text-red-500" : "text-green-500"
        )}>{avgPeople.toFixed(1)}</div>
      </div>
      
      <div className="text-center">
        <div className="grid grid-cols-4 gap-0 font-mono text-xs">
          <div className="text-left text-muted-foreground text-[9px]">план</div>
          <div className="text-center text-muted-foreground">{planCalendar}</div>
          <div className="text-center text-muted-foreground">{planWorking}</div>
          <div className="text-center text-muted-foreground">{planWeekend}</div>
          <div className="text-left text-muted-foreground text-[9px]">факт</div>
          <div className={cn("text-center font-semibold", actualCalendar <= planCalendar ? "text-green-500" : "text-red-500")}>{actualCalendar}</div>
          <div className={cn("text-center font-semibold", actualWorking <= planWorking ? "text-green-500" : "text-red-500")}>{actualWorking}</div>
          <div className={cn("text-center font-semibold", actualWeekend <= planWeekend ? "text-green-500" : "text-red-500")}>{actualWeekend}</div>
        </div>
      </div>
      
      <div className="flex flex-col gap-1">
        {/* План прогресс на основе объёма */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground w-8">План</span>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all",
                volumeProgress >= 100 ? "bg-blue-500" : volumeProgress > 0 ? "bg-blue-400" : "bg-muted-foreground/20"
              )}
              style={{ width: `${Math.min(volumeProgress, 100)}%` }}
            />
          </div>
          <span className={cn(
            "font-mono text-[10px] w-8 text-right",
            volumeProgress > 100 ? "text-red-500" : "text-muted-foreground"
          )}>{volumeProgress}%</span>
        </div>
        {/* Факт прогресс с слайдером */}
        <div className={cn(
          "flex items-center gap-2",
          isPending && "border border-dashed border-yellow-500 rounded px-1"
        )}>
          <span className="text-[10px] text-muted-foreground w-8">Факт</span>
          {isPending ? (
            <>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all bg-yellow-500"
                  style={{ width: `${pendingPercent}%` }}
                />
              </div>
              <span className="font-mono text-[10px] w-8 text-right text-yellow-600">{pendingPercent}%</span>
              {isAdmin && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 text-green-600 hover:text-green-700"
                    onClick={() => approveProgress(pendingSubmission.id)}
                    disabled={isApproving}
                    data-testid={`button-approve-section-${workId}-${sectionNumber}`}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 text-red-600 hover:text-red-700"
                    onClick={() => rejectProgress(pendingSubmission.id)}
                    disabled={isRejecting}
                    data-testid={`button-reject-section-${workId}-${sectionNumber}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </>
              )}
            </>
          ) : (
            <>
              <div className="flex-1 h-2">
                <Slider
                  value={[localProgress]}
                  max={100}
                  step={1}
                  onValueChange={canSetProgress ? (value) => setLocalProgress(value[0]) : undefined}
                  disabled={!canSetProgress}
                  className={cn("h-2", canSetProgress ? "cursor-pointer" : "cursor-not-allowed opacity-60")}
                  data-testid={`slider-section-progress-${workId}-${sectionNumber}`}
                />
              </div>
              <input 
                type="number"
                min={0}
                max={100}
                value={localProgress}
                onChange={canSetProgress ? (e) => setLocalProgress(Math.min(100, Math.max(0, parseInt(e.target.value) || 0))) : undefined}
                disabled={!canSetProgress}
                readOnly={!canSetProgress}
                className={cn(
                  "w-10 text-right bg-transparent border-b border-border focus:outline-none focus:border-primary font-mono text-xs",
                  !canSetProgress && "cursor-not-allowed opacity-60"
                )}
                data-testid={`input-section-progress-${workId}-${sectionNumber}`}
              />
              <span className="text-muted-foreground text-xs w-2">%</span>
              {canSetProgress && localProgress !== progressPercent && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 text-green-600 hover:text-green-700"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    data-testid={`button-submit-section-${workId}-${sectionNumber}`}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 text-red-600 hover:text-red-700"
                    onClick={() => setLocalProgress(progressPercent)}
                    data-testid={`button-cancel-section-${workId}-${sectionNumber}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Секция {sectionNumber} - Редактирование</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`plan-start-${sectionNumber}`} className="text-xs">Дата начала (план)</Label>
                <Input
                  id={`plan-start-${sectionNumber}`}
                  type="date"
                  value={formData.planStartDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, planStartDate: e.target.value }))}
                  className="h-8 text-xs"
                  data-testid={`input-plan-start-${workId}-${sectionNumber}`}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`plan-end-${sectionNumber}`} className="text-xs">Дата конца (план)</Label>
                <Input
                  id={`plan-end-${sectionNumber}`}
                  type="date"
                  value={formData.planEndDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, planEndDate: e.target.value }))}
                  className="h-8 text-xs"
                  data-testid={`input-plan-end-${workId}-${sectionNumber}`}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`actual-start-${sectionNumber}`} className="text-xs">Дата начала (факт)</Label>
                <Input
                  id={`actual-start-${sectionNumber}`}
                  type="date"
                  value={formData.actualStartDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, actualStartDate: e.target.value }))}
                  className="h-8 text-xs"
                  data-testid={`input-actual-start-${workId}-${sectionNumber}`}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`actual-end-${sectionNumber}`} className="text-xs">Дата конца (факт)</Label>
                <Input
                  id={`actual-end-${sectionNumber}`}
                  type="date"
                  value={formData.actualEndDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, actualEndDate: e.target.value }))}
                  className="h-8 text-xs"
                  data-testid={`input-actual-end-${workId}-${sectionNumber}`}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`volume-actual-${sectionNumber}`} className="text-xs">Объём факт ({displayUnit})</Label>
                <Input
                  id={`volume-actual-${sectionNumber}`}
                  type="number"
                  step="0.01"
                  value={formData.volumeActual}
                  onChange={(e) => setFormData(prev => ({ ...prev, volumeActual: parseFloat(e.target.value) || 0 }))}
                  className="h-8 text-xs"
                  data-testid={`input-volume-actual-${workId}-${sectionNumber}`}
                />
              </div>
              {showCost && (
                <div className="space-y-2">
                  <Label htmlFor={`cost-actual-${sectionNumber}`} className="text-xs">Стоимость факт (руб)</Label>
                  <Input
                    id={`cost-actual-${sectionNumber}`}
                    type="number"
                    step="0.01"
                    value={formData.costActual}
                    onChange={(e) => setFormData(prev => ({ ...prev, costActual: parseFloat(e.target.value) || 0 }))}
                    className="h-8 text-xs"
                    data-testid={`input-cost-actual-${workId}-${sectionNumber}`}
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`planned-people-${sectionNumber}`} className="text-xs">Планируемое количество людей</Label>
              <Input
                id={`planned-people-${sectionNumber}`}
                type="number"
                min={0}
                value={formData.plannedPeople}
                onChange={(e) => setFormData(prev => ({ ...prev, plannedPeople: parseInt(e.target.value) || 0 }))}
                className="h-8 text-xs"
                data-testid={`input-planned-people-${workId}-${sectionNumber}`}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">Отмена</Button>
            </DialogClose>
            <Button size="sm" onClick={handleSaveSection} disabled={isSaving} data-testid={`button-save-section-${workId}-${sectionNumber}`}>
              {isSaving ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


function VolumesMoneySpoiler({ 
  workId, 
  showCost,
  planStartDate,
  planEndDate
}: { 
  workId: number; 
  showCost: boolean;
  planStartDate: string | null;
  planEndDate: string | null;
}) {
  const { data: materials = [], isLoading: isLoadingMaterials } = useWorkMaterials(workId);
  const { data: progressData = [], isLoading: isLoadingProgress } = useWorkMaterialProgress(workId);
  const updateProgress = useUpdateWorkMaterialProgress();

  const [editingCell, setEditingCell] = useState<{ pdcElementId: number; sectionNumber: number; field: 'quantity' | 'cost' } | null>(null);
  const [editValue, setEditValue] = useState("");

  if (isLoadingMaterials || isLoadingProgress) {
    return (
      <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border/50">
        <p className="text-xs text-muted-foreground">Загрузка данных...</p>
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

  const hasMultipleSections = materials.some(m => m.sectionsCount > 1 && m.sections && m.sections.length > 0);

  // Calculate plan progress based on dates
  const calculatePlanProgress = (quantity: number) => {
    if (!planStartDate || !planEndDate) return 0;
    const start = new Date(planStartDate);
    const end = new Date(planEndDate);
    const today = new Date();
    
    if (today < start) return 0;
    if (today >= end) return 100;
    
    const totalDays = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const elapsedDays = (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    const progress = (elapsedDays / totalDays) * 100;
    
    return Math.min(100, Math.max(0, Math.round(progress)));
  };

  // Get closed values for a material/section
  const getClosedValues = (pdcElementId: number, sectionNumber: number) => {
    const progress = progressData.find(
      p => p.pdcElementId === pdcElementId && p.sectionNumber === sectionNumber
    );
    return {
      quantityClosed: progress ? parseFloat(progress.quantityClosed || "0") : 0,
      costClosed: progress ? parseFloat(progress.costClosed || "0") : 0,
    };
  };

  const handleStartEdit = (pdcElementId: number, sectionNumber: number, field: 'quantity' | 'cost', currentValue: number) => {
    setEditingCell({ pdcElementId, sectionNumber, field });
    setEditValue(currentValue.toString());
  };

  const handleSaveEdit = () => {
    if (!editingCell) return;
    
    const value = parseFloat(editValue) || 0;
    const currentClosed = getClosedValues(editingCell.pdcElementId, editingCell.sectionNumber);
    
    updateProgress.mutate({
      workId,
      pdcElementId: editingCell.pdcElementId,
      sectionNumber: editingCell.sectionNumber,
      quantityClosed: editingCell.field === 'quantity' ? value.toString() : currentClosed.quantityClosed.toString(),
      costClosed: editingCell.field === 'cost' ? value.toString() : currentClosed.costClosed.toString(),
    });
    
    setEditingCell(null);
    setEditValue("");
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const renderProgressBar = (planPercent: number, factPercent: number, testIdPrefix: string) => {
    const variance = factPercent - planPercent;
    
    return (
      <div className="space-y-1" data-testid={`progress-${testIdPrefix}`}>
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-muted-foreground w-6">План</span>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full bg-blue-400"
              style={{ width: `${Math.min(planPercent, 100)}%` }}
            />
          </div>
          <span className="text-[9px] text-muted-foreground w-8 text-right" data-testid={`text-plan-${testIdPrefix}`}>{planPercent}%</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-muted-foreground w-6">Факт</span>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn("h-full rounded-full", factPercent >= planPercent ? "bg-green-500" : "bg-red-500")}
              style={{ width: `${Math.min(factPercent, 100)}%` }}
            />
          </div>
          <span className={cn(
            "text-[9px] w-8 text-right font-semibold",
            factPercent >= planPercent ? "text-green-500" : "text-red-500"
          )} data-testid={`text-fact-${testIdPrefix}`}>{factPercent}%</span>
        </div>
        {variance !== 0 && (
          <div className="text-right">
            <span className={cn(
              "text-[8px] font-mono",
              variance > 0 ? "text-green-500" : "text-red-500"
            )} data-testid={`text-variance-${testIdPrefix}`}>
              {variance > 0 ? "+" : ""}{variance}%
            </span>
          </div>
        )}
      </div>
    );
  };

  // Build rows for display
  const rows: Array<{
    key: string;
    number: string;
    name: string;
    unit: string;
    quantityPlan: number;
    costPlan: number;
    pdcElementId: number;
    sectionNumber: number;
  }> = [];

  materials.forEach((material, idx) => {
    if (hasMultipleSections && material.sections && material.sections.length > 0) {
      material.sections.forEach((section) => {
        rows.push({
          key: `${material.id}-section-${section.sectionNumber}`,
          number: `${idx + 1}-${section.sectionNumber}с`,
          name: material.name,
          unit: material.unit,
          quantityPlan: section.quantity,
          costPlan: section.costWithVat,
          pdcElementId: material.pdcElementId,
          sectionNumber: section.sectionNumber,
        });
      });
    } else {
      rows.push({
        key: `${material.id}`,
        number: `${idx + 1}`,
        name: material.name,
        unit: material.unit,
        quantityPlan: material.quantity,
        costPlan: material.costWithVat,
        pdcElementId: material.pdcElementId,
        sectionNumber: 1,
      });
    }
  });

  return (
    <div className="mt-3 bg-muted/50 rounded-lg border border-border/50 overflow-hidden" onClick={(e) => e.stopPropagation()}>
      <div className={cn(
        "grid gap-2 px-3 py-2 bg-muted/70 text-[10px] font-semibold text-muted-foreground uppercase",
        showCost ? "grid-cols-[40px_200px_60px_120px_120px_100px_100px]" : "grid-cols-[40px_200px_60px_120px_100px]"
      )}>
        <div>N</div>
        <div>Наименование</div>
        <div>Ед.</div>
        <div className="text-center">Количество</div>
        {showCost && <div className="text-center">Стоимость</div>}
        <div className="text-center">Прогр. матер.</div>
        {showCost && <div className="text-center">Прогр. оплаты</div>}
      </div>
      <div className="divide-y divide-border/30">
        {rows.map((row) => {
          const closed = getClosedValues(row.pdcElementId, row.sectionNumber);
          const planProgress = calculatePlanProgress(row.quantityPlan);
          
          const isEditingQuantity = editingCell?.pdcElementId === row.pdcElementId && 
            editingCell?.sectionNumber === row.sectionNumber && 
            editingCell?.field === 'quantity';
          const isEditingCost = editingCell?.pdcElementId === row.pdcElementId && 
            editingCell?.sectionNumber === row.sectionNumber && 
            editingCell?.field === 'cost';

          return (
            <div 
              key={row.key}
              className={cn(
                "grid gap-2 px-3 py-2 text-xs hover:bg-muted/30 transition-colors items-start",
                showCost ? "grid-cols-[40px_200px_60px_120px_120px_100px_100px]" : "grid-cols-[40px_200px_60px_120px_100px]"
              )}
              data-testid={`volume-row-${row.key}`}
            >
              <div className="font-mono text-muted-foreground">{row.number}</div>
              <div className="whitespace-normal break-words">{row.name}</div>
              <div className="text-muted-foreground">{row.unit}</div>
              
              {/* Quantity column */}
              <div className="text-center">
                <div className="text-muted-foreground text-[12px]">план {row.quantityPlan.toLocaleString('ru-RU')}</div>
                {isEditingQuantity ? (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.01"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="text-xs w-20"
                      autoFocus
                      data-testid={`input-quantity-${row.key}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                    />
                    <Button size="icon" variant="ghost" onClick={handleSaveEdit} data-testid={`save-quantity-${row.key}`}>
                      <Check className="h-3 w-3 text-green-600" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={handleCancelEdit} data-testid={`cancel-quantity-${row.key}`}>
                      <X className="h-3 w-3 text-red-600" />
                    </Button>
                  </div>
                ) : (
                  <div 
                    className="font-semibold cursor-pointer hover:text-primary"
                    onClick={() => handleStartEdit(row.pdcElementId, row.sectionNumber, 'quantity', closed.quantityClosed)}
                    data-testid={`edit-quantity-${row.key}`}
                  >
                    закрыто {closed.quantityClosed.toLocaleString('ru-RU')}
                  </div>
                )}
              </div>

              {/* Cost column */}
              {showCost && (
                <div className="text-center">
                  <div className="text-muted-foreground text-[12px]">план {row.costPlan.toLocaleString('ru-RU')}</div>
                  {isEditingCost ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        step="0.01"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="text-xs w-20"
                        autoFocus
                        data-testid={`input-cost-${row.key}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                      />
                      <Button size="icon" variant="ghost" onClick={handleSaveEdit} data-testid={`save-cost-${row.key}`}>
                        <Check className="h-3 w-3 text-green-600" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={handleCancelEdit} data-testid={`cancel-cost-${row.key}`}>
                        <X className="h-3 w-3 text-red-600" />
                      </Button>
                    </div>
                  ) : (
                    <div 
                      className="font-semibold cursor-pointer hover:text-primary"
                      onClick={() => handleStartEdit(row.pdcElementId, row.sectionNumber, 'cost', closed.costClosed)}
                      data-testid={`edit-cost-${row.key}`}
                    >
                      закрыто {closed.costClosed.toLocaleString('ru-RU')}
                    </div>
                  )}
                </div>
              )}

              {/* Material progress */}
              <div>
                {renderProgressBar(planProgress, row.quantityPlan > 0 ? Math.round((closed.quantityClosed / row.quantityPlan) * 100) : 0, `material-${row.key}`)}
              </div>

              {/* Payment progress */}
              {showCost && (
                <div>
                  {renderProgressBar(planProgress, row.costPlan > 0 ? Math.round((closed.costClosed / row.costPlan) * 100) : 0, `payment-${row.key}`)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
