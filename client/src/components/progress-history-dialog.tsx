import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollText } from "lucide-react";
import { type ProgressSubmissionWithUsers } from "@shared/schema";

interface ProgressHistoryDialogProps {
  workId: number;
  workName: string;
}

function formatDate(date: Date | string | null): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "submitted": return "Отправлен";
    case "approved": return "Согласован";
    case "rejected": return "Не согласован";
    default: return status;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "submitted": return "text-yellow-600";
    case "approved": return "text-green-600";
    case "rejected": return "text-red-600";
    default: return "text-muted-foreground";
  }
}

export function ProgressHistoryDialog({ workId, workName }: ProgressHistoryDialogProps) {
  const [open, setOpen] = useState(false);

  const { data: history = [], isLoading } = useQuery<ProgressSubmissionWithUsers[]>({
    queryKey: ["/api/progress/history", workId],
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          data-testid={`button-progress-history-${workId}`}
        >
          <ScrollText className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>История согласований: {workName}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="text-center py-4 text-muted-foreground">Загрузка...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">Нет записей</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-2 font-medium">№</th>
                  <th className="text-left p-2 font-medium">Имя</th>
                  <th className="text-center p-2 font-medium">Секция</th>
                  <th className="text-right p-2 font-medium">%</th>
                  <th className="text-left p-2 font-medium">Статус</th>
                  <th className="text-left p-2 font-medium">Дата</th>
                  <th className="text-left p-2 font-medium">Согласовал</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, index) => (
                  <tr key={item.id} className="border-b border-border/50">
                    <td className="p-2 text-muted-foreground">{index + 1}</td>
                    <td className="p-2">{item.submitterName || "-"}</td>
                    <td className="p-2 text-center font-sans text-muted-foreground">
                      {item.sectionNumber ? `${item.sectionNumber}с` : "-"}
                    </td>
                    <td className="p-2 text-right font-sans">{item.percent}%</td>
                    <td className={`p-2 ${getStatusColor(item.status)}`}>
                      {getStatusLabel(item.status)}
                    </td>
                    <td className="p-2 text-muted-foreground">{formatDate(item.createdAt)}</td>
                    <td className="p-2">{item.approverName || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
