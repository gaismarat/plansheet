import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerCellProps {
  value: string | null;
  onChange: (date: string | null) => void;
  disabled?: boolean;
  disabledDays?: (date: Date) => boolean;
  isPlan?: boolean;
  className?: string;
  placeholder?: string;
}

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    const date = parseISO(dateStr);
    return format(date, "dd.MM.yy", { locale: ru });
  } catch {
    return "—";
  }
}

export function DatePickerCell({
  value,
  onChange,
  disabled = false,
  disabledDays,
  isPlan = false,
  className,
  placeholder = "—",
}: DatePickerCellProps) {
  const [open, setOpen] = useState(false);

  const selectedDate = value ? parseISO(value) : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      const formatted = format(date, "yyyy-MM-dd");
      onChange(formatted);
    } else {
      onChange(null);
    }
    setOpen(false);
  };

  if (disabled) {
    return (
      <span className={cn(isPlan ? "text-muted-foreground" : "font-medium", className)}>
        {value ? formatDateShort(value) : placeholder}
      </span>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "cursor-pointer hover:underline focus:outline-none focus:underline",
            isPlan ? "text-muted-foreground" : "font-medium",
            className
          )}
          data-testid={`date-picker-${isPlan ? 'plan' : 'actual'}`}
        >
          {value ? formatDateShort(value) : placeholder}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="center">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          disabled={disabledDays}
          locale={ru}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
