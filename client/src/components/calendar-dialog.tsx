import { useState } from "react";
import { useHolidays, useToggleHoliday } from "@/hooks/use-construction";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

const WEEKDAYS_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function isWeekend(year: number, month: number, day: number): boolean {
  const date = new Date(year, month, day);
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

function formatDate(year: number, month: number, day: number): string {
  const m = (month + 1).toString().padStart(2, '0');
  const d = day.toString().padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function CalendarDialog() {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const { data: holidays = [] } = useHolidays();
  const toggleHoliday = useToggleHoliday();

  const holidayDates = new Map(holidays.map(h => [h.date, h]));

  const handleDayClick = (dateStr: string) => {
    toggleHoliday.mutate(dateStr);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2" data-testid="button-calendar">
          <Calendar className="w-4 h-4" />
          <span className="hidden sm:inline">Календарь</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-4">
            <span>Календарь праздничных дней</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setYear(y => y - 1)}
                data-testid="button-prev-year"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-lg font-bold min-w-[80px] text-center">{year}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setYear(y => y + 1)}
                data-testid="button-next-year"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="text-sm text-muted-foreground mb-4">
          Нажмите на день, чтобы отметить его как праздничный. Праздничные дни будут учитываться при расчёте рабочих и выходных дней.
        </div>

        <div className="grid grid-cols-3 gap-4">
          {MONTHS_RU.map((monthName, monthIndex) => (
            <MonthCalendar
              key={monthIndex}
              year={year}
              month={monthIndex}
              monthName={monthName}
              holidayDates={holidayDates}
              onDayClick={handleDayClick}
            />
          ))}
        </div>

        <div className="flex items-center gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800" />
            <span>Праздничные дни</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-muted border border-border" />
            <span>Выходные (Сб, Вс)</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface MonthCalendarProps {
  year: number;
  month: number;
  monthName: string;
  holidayDates: Map<string, { id: number; date: string; name: string | null }>;
  onDayClick: (dateStr: string) => void;
}

function MonthCalendar({ year, month, monthName, holidayDates, onDayClick }: MonthCalendarProps) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return (
    <div className="border rounded-md p-2">
      <div className="text-center font-semibold mb-2 text-sm">{monthName}</div>
      <div className="grid grid-cols-7 gap-0.5 text-xs">
        {WEEKDAYS_RU.map((day, i) => (
          <div
            key={day}
            className={cn(
              "text-center font-medium py-1",
              i >= 5 ? "text-muted-foreground" : "text-foreground"
            )}
          >
            {day}
          </div>
        ))}
        {days.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="aspect-square" />;
          }
          
          const dateStr = formatDate(year, month, day);
          const isHoliday = holidayDates.has(dateStr);
          const isWeekendDay = isWeekend(year, month, day);
          
          return (
            <button
              key={day}
              onClick={() => onDayClick(dateStr)}
              className={cn(
                "aspect-square flex items-center justify-center rounded text-xs hover-elevate active-elevate-2 transition-colors",
                isHoliday && "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-bold",
                !isHoliday && isWeekendDay && "bg-muted text-muted-foreground",
                !isHoliday && !isWeekendDay && "text-foreground"
              )}
              data-testid={`day-${dateStr}`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
