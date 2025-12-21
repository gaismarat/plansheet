import { useState, useRef, useEffect } from "react";
import { type Work } from "@shared/schema";
import { useUpdateWork, useDeleteWork, useMoveWorkUp, useMoveWorkDown } from "@/hooks/use-construction";
import { EditWorkDialog } from "@/components/forms/edit-work-dialog";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Trash2, Edit2, Check, ArrowUp, ArrowDown } from "lucide-react";
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
}

export function WorkItemRow({ work }: WorkItemRowProps) {
  const { mutate: updateWork } = useUpdateWork();
  const { mutate: deleteWork, isPending: isDeleting } = useDeleteWork();
  const { mutate: moveUp } = useMoveWorkUp();
  const { mutate: moveDown } = useMoveWorkDown();
  
  const [localProgress, setLocalProgress] = useState(work.progressPercentage);
  const [isEditingProgress, setIsEditingProgress] = useState(false);
  const sliderTimeoutRef = useRef<NodeJS.Timeout>();

  // Sync local state if external data changes (and we aren't dragging)
  useEffect(() => {
    if (!isEditingProgress) {
      setLocalProgress(work.progressPercentage);
    }
  }, [work.progressPercentage, isEditingProgress]);

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="group grid grid-cols-12 gap-4 items-center p-4 bg-card rounded-lg border border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300 mb-3"
    >
      {/* Name & ID */}
      <div className="col-span-12 md:col-span-3 flex flex-col justify-center">
        <span className="font-semibold text-foreground truncate" title={work.name}>
          {work.name}
        </span>
        <span className="text-xs text-muted-foreground font-mono mt-0.5">
          ID: {work.id.toString().padStart(4, '0')}
        </span>
      </div>

      {/* Plan: Volume & Days */}
      <div className="col-span-6 md:col-span-2 flex flex-col justify-center text-sm">
        <div className="text-xs text-muted-foreground font-medium mb-1">План</div>
        <div className="flex items-center gap-1.5 text-foreground/90">
          <span className="font-mono font-medium">{work.volumeAmount}</span>
          <span className="text-muted-foreground text-xs">{work.volumeUnit}</span>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {work.daysEstimated} дн.
        </div>
      </div>

      {/* Actual: Volume & Days */}
      <div className="col-span-6 md:col-span-2 flex flex-col justify-center text-sm">
        <div className="text-xs text-muted-foreground font-medium mb-1">Факт</div>
        <div className="flex items-center gap-1.5 text-foreground/90">
          <span className="font-mono font-medium">{work.volumeActual}</span>
          <span className="text-muted-foreground text-xs">{work.volumeUnit}</span>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {work.daysActual} дн.
        </div>
      </div>

      {/* Overage: Volume & Days */}
      <div className="col-span-6 md:col-span-2 flex flex-col justify-center text-sm">
        <div className="text-xs text-muted-foreground font-medium mb-1">Превышение</div>
        <div className="flex flex-col gap-1">
          {(() => {
            const volumePercent = work.volumeAmount > 0 ? ((work.volumeActual - work.volumeAmount) / work.volumeAmount) * 100 : 0;
            const daysPercent = work.daysEstimated > 0 ? ((work.daysActual - work.daysEstimated) / work.daysEstimated) * 100 : 0;
            const volumeColor = volumePercent > 0 ? 'text-red-500' : volumePercent < 0 ? 'text-green-500' : 'text-foreground/90';
            const daysColor = daysPercent > 0 ? 'text-red-500' : daysPercent < 0 ? 'text-green-500' : 'text-foreground/90';
            
            return (
              <>
                <span className={`font-mono text-sm ${volumeColor}`}>
                  {volumePercent > 0 ? '+' : ''}{volumePercent.toFixed(1)}%
                </span>
                <span className={`font-mono text-sm ${daysColor}`}>
                  {daysPercent > 0 ? '+' : ''}{daysPercent.toFixed(1)}%
                </span>
              </>
            );
          })()}
        </div>
      </div>

      {/* Responsible */}
      <div className="col-span-6 md:col-span-2 flex items-center">
        <div className="flex items-center gap-2 bg-secondary/50 px-2 py-1 rounded text-xs text-secondary-foreground font-medium truncate max-w-full">
          <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
          <span className="truncate" title={work.responsiblePerson}>{work.responsiblePerson}</span>
        </div>
      </div>

      {/* Progress Control */}
      <div className="col-span-10 md:col-span-4 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground font-medium">Прогресс</span>
          <div className="flex items-center gap-1">
            <input 
               type="number"
               min={0}
               max={100}
               value={localProgress}
               onChange={handleProgressInputChange}
               onBlur={handleProgressInputBlur}
               className="w-10 text-right bg-transparent border-b border-border focus:outline-none focus:border-primary text-foreground font-mono"
            />
            <span className="text-muted-foreground">%</span>
          </div>
        </div>
        
        <div className="relative group/slider pt-1 pb-1">
           <Slider
            defaultValue={[work.progressPercentage]}
            value={[localProgress]}
            max={100}
            step={1}
            onValueChange={handleSliderChange}
            className="cursor-pointer"
          />
          {/* Visual track underneath is handled by slider, but let's add the color logic to slider primitive or wrapper if needed, 
              but Shadcn Slider is generic. Let's rely on standard styling for now or wrap in ProgressBar if read-only.
              Actually, let's use the Slider for interaction and a color overlay if we want dynamic color.
           */}
        </div>
      </div>

      {/* Actions */}
      <div className="col-span-2 md:col-span-1 flex items-center justify-end gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => moveUp(work.id)}
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
              onClick={() => moveDown(work.id)}
            >
              <ArrowDown className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Переместить вниз</TooltipContent>
        </Tooltip>
        <EditWorkDialog work={work} />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => deleteWork(work.id)}
              disabled={isDeleting}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Удалить работу</TooltipContent>
        </Tooltip>
      </div>
    </motion.div>
  );
}
