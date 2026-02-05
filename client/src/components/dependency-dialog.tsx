import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Link2, Plus, Trash2 } from "lucide-react";
import { useAllDependencies, useCreateDependency, useDeleteDependency } from "@/hooks/use-construction";
import type { WorkDependency } from "@shared/schema";

interface WorkItem {
  id: number;
  groupNumber: string;
  groupName: string;
}

interface DependencyDialogProps {
  workId: number;
  workNumber: string;
  workName: string;
  allWorks: WorkItem[];
}

const DEPENDENCY_TYPES = [
  { value: "FS", label: "ОН (Окончание-Начало)", description: "Текущая начинается после окончания предшественника" },
  { value: "SS", label: "НН (Начало-Начало)", description: "Текущая начинается одновременно с предшественником" },
  { value: "FF", label: "ОО (Окончание-Окончание)", description: "Обе работы заканчиваются одновременно" },
  { value: "SF", label: "НО (Начало-Окончание)", description: "Текущая заканчивается с началом предшественника" },
];

export function DependencyDialog({ workId, workNumber, workName, allWorks }: DependencyDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedPredecessor, setSelectedPredecessor] = useState<string>("");
  const [dependencyType, setDependencyType] = useState<string>("FS");
  const [lagDays, setLagDays] = useState<string>("0");

  const { data: allDependencies = [] } = useAllDependencies();
  const createDependency = useCreateDependency();
  const deleteDependency = useDeleteDependency();

  const workDependencies = useMemo((): WorkDependency[] => {
    return allDependencies.filter((d: WorkDependency) => d.workId === workId);
  }, [allDependencies, workId]);

  const availablePredecessors = useMemo(() => {
    const existingPredecessorIds = workDependencies.map(d => d.dependsOnWorkId);
    return allWorks.filter(w => w.id !== workId && !existingPredecessorIds.includes(w.id));
  }, [allWorks, workId, workDependencies]);

  const handleAddDependency = () => {
    if (!selectedPredecessor) return;
    
    createDependency.mutate({
      workId,
      dependsOnWorkId: parseInt(selectedPredecessor),
      dependencyType: dependencyType as "FS" | "SS" | "FF" | "SF",
      lagDays: parseInt(lagDays) || 0,
    }, {
      onSuccess: () => {
        setSelectedPredecessor("");
        setDependencyType("FS");
        setLagDays("0");
      }
    });
  };

  const handleDeleteDependency = (id: number) => {
    deleteDependency.mutate(id);
  };

  const getDependencyTypeLabel = (type: string) => {
    const found = DEPENDENCY_TYPES.find(t => t.value === type);
    return found ? found.label.split(" ")[0] : type;
  };

  const getPredecessorName = (predecessorId: number) => {
    const work = allWorks.find(w => w.id === predecessorId);
    return work ? `${work.groupNumber} ${work.groupName}` : `ID: ${predecessorId}`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6"
          data-testid={`button-dependencies-${workId}`}
        >
          <Link2 className="w-3.5 h-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Зависимости: {workNumber}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{workName}</p>
          
          {workDependencies.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Текущие зависимости</Label>
              <div className="space-y-1">
                {workDependencies.map((dep: WorkDependency) => (
                  <div 
                    key={dep.id}
                    className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-md text-sm"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {getDependencyTypeLabel(dep.dependencyType)}
                      </Badge>
                      <span className="truncate text-xs">
                        {getPredecessorName(dep.dependsOnWorkId)}
                      </span>
                      {dep.lagDays !== 0 && (
                        <span className="text-muted-foreground text-xs shrink-0">
                          ({dep.lagDays > 0 ? "+" : ""}{dep.lagDays}д)
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => handleDeleteDependency(dep.id)}
                      disabled={deleteDependency.isPending}
                      data-testid={`button-delete-dependency-${dep.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <Label className="text-xs text-muted-foreground mb-2 block">Добавить зависимость</Label>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Предшественник</Label>
                <Select value={selectedPredecessor} onValueChange={setSelectedPredecessor}>
                  <SelectTrigger data-testid="select-predecessor">
                    <SelectValue placeholder="Выберите работу..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePredecessors.map(w => (
                      <SelectItem key={w.id} value={w.id.toString()}>
                        {w.groupNumber} {w.groupName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs">Тип связи</Label>
                  <Select value={dependencyType} onValueChange={setDependencyType}>
                    <SelectTrigger data-testid="select-dependency-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPENDENCY_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-20">
                  <Label className="text-xs">Лаг (дни)</Label>
                  <Input
                    type="number"
                    value={lagDays}
                    onChange={e => setLagDays(e.target.value)}
                    data-testid="input-lag-days"
                  />
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">
                {DEPENDENCY_TYPES.find(t => t.value === dependencyType)?.description}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            onClick={handleAddDependency}
            disabled={!selectedPredecessor || createDependency.isPending}
            data-testid="button-add-dependency"
          >
            <Plus className="w-4 h-4 mr-1" />
            Добавить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
