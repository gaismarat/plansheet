import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  showLabel?: boolean;
}

const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  ({ className, value, showLabel = false, ...props }, ref) => {
    // Determine color based on completion
    const getColor = (val: number) => {
      if (val >= 100) return "bg-[hsl(142,71%,45%)]"; // Success green
      if (val > 50) return "bg-[hsl(215,25%,27%)]"; // Primary blue
      return "bg-[hsl(25,95%,53%)]"; // Accent orange
    };

    return (
      <div className="flex items-center gap-3 w-full">
        <div
          ref={ref}
          className={cn(
            "relative h-2.5 w-full overflow-hidden rounded-full bg-secondary shadow-inner",
            className
          )}
          {...props}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={cn("h-full transition-colors duration-300", getColor(value))}
          />
        </div>
        {showLabel && (
          <span className="font-mono text-xs font-medium w-9 text-right tabular-nums text-muted-foreground">
            {Math.round(value)}%
          </span>
        )}
      </div>
    );
  }
);
ProgressBar.displayName = "ProgressBar";

export { ProgressBar };
