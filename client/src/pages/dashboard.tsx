import { useState } from "react";
import { useBlocks, useUnassignedGroups, useDeleteWorkGroup, useDeleteBlock, useHolidays } from "@/hooks/use-construction";
import { CreateWorkGroupDialog } from "@/components/forms/create-work-group-dialog";
import { CreateBlockDialog } from "@/components/forms/create-block-dialog";
import { EditGroupDialog } from "@/components/forms/edit-group-dialog";
import { CreateWorkDialog } from "@/components/forms/create-work-dialog";
import { WorkItemRow } from "@/components/work-item-row";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Trash2, FolderOpen, HardHat, TrendingUp, BarChart3, Download, Layers } from "lucide-react";
import * as XLSX from "xlsx";
import { CalendarDialog } from "@/components/calendar-dialog";
import { Link } from "wouter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { type WorkGroupResponse, type BlockResponse } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Dashboard() {
  const { data: blocksData, isLoading: blocksLoading } = useBlocks();
  const { data: unassignedGroups, isLoading: groupsLoading } = useUnassignedGroups();
  const { data: holidays = [] } = useHolidays();
  const holidayDates = new Set(holidays.map(h => h.date));

  const isLoading = blocksLoading || groupsLoading;
  const blocks = blocksData || [];
  const groups = unassignedGroups || [];

  const allGroups = [...(blocks.flatMap(b => b.groups || [])), ...groups];
  const totalGroups = allGroups.length;
  const totalWorks = allGroups.reduce((acc, g) => acc + (g.works?.length || 0), 0);
  const avgProgress = totalWorks > 0 
    ? Math.round(allGroups.reduce((acc, g) => acc + (g.works?.reduce((wAcc, w) => wAcc + w.progressPercentage, 0) || 0), 0) / totalWorks)
    : 0;

  const exportToExcel = () => {
    const data: any[] = [];
    
    blocks.forEach((block) => {
      data.push({
        "Блок": block.name,
        "Группа": "",
        "Наименование работы": "",
        "ID": "",
        "Объём (план)": "",
        "Объём (факт)": "",
        "Ед. изм.": "",
        "Стоимость (план)": "",
        "Стоимость (факт)": "",
        "Дата начала (план)": "",
        "Дата начала (факт)": "",
        "Дата окончания (план)": "",
        "Дата окончания (факт)": "",
        "Ответственный": "",
        "Прогресс %": "",
      });
      
      block.groups?.forEach((group) => {
        data.push({
          "Блок": "",
          "Группа": group.name,
          "Наименование работы": "",
          "ID": "",
          "Объём (план)": "",
          "Объём (факт)": "",
          "Ед. изм.": "",
          "Стоимость (план)": "",
          "Стоимость (факт)": "",
          "Дата начала (план)": "",
          "Дата начала (факт)": "",
          "Дата окончания (план)": "",
          "Дата окончания (факт)": "",
          "Ответственный": "",
          "Прогресс %": "",
        });
        
        group.works?.forEach((work) => {
          data.push({
            "Блок": "",
            "Группа": "",
            "Наименование работы": work.name,
            "ID": work.id,
            "Объём (план)": work.volumeAmount,
            "Объём (факт)": work.volumeActual,
            "Ед. изм.": work.volumeUnit,
            "Стоимость (план)": work.costPlan,
            "Стоимость (факт)": work.costActual,
            "Дата начала (план)": work.planStartDate || "",
            "Дата начала (факт)": work.actualStartDate || "",
            "Дата окончания (план)": work.planEndDate || "",
            "Дата окончания (факт)": work.actualEndDate || "",
            "Ответственный": work.responsiblePerson || "",
            "Прогресс %": work.progressPercentage,
          });
        });
      });
    });
    
    groups.forEach((group) => {
      data.push({
        "Блок": "",
        "Группа": group.name,
        "Наименование работы": "",
        "ID": "",
        "Объём (план)": "",
        "Объём (факт)": "",
        "Ед. изм.": "",
        "Стоимость (план)": "",
        "Стоимость (факт)": "",
        "Дата начала (план)": "",
        "Дата начала (факт)": "",
        "Дата окончания (план)": "",
        "Дата окончания (факт)": "",
        "Ответственный": "",
        "Прогресс %": "",
      });
      
      group.works?.forEach((work) => {
        data.push({
          "Блок": "",
          "Группа": "",
          "Наименование работы": work.name,
          "ID": work.id,
          "Объём (план)": work.volumeAmount,
          "Объём (факт)": work.volumeActual,
          "Ед. изм.": work.volumeUnit,
          "Стоимость (план)": work.costPlan,
          "Стоимость (факт)": work.costActual,
          "Дата начала (план)": work.planStartDate || "",
          "Дата начала (факт)": work.actualStartDate || "",
          "Дата окончания (план)": work.planEndDate || "",
          "Дата окончания (факт)": work.actualEndDate || "",
          "Ответственный": work.responsiblePerson || "",
          "Прогресс %": work.progressPercentage,
        });
      });
    });
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Работы");
    XLSX.writeFile(wb, "construction_works.xls");
  };

  if (isLoading) return <DashboardSkeleton />;

  const hasNoData = blocks.length === 0 && groups.length === 0;

  return (
    <div className="min-h-screen bg-background/50">
      <header className="bg-card border-b border-border sticky top-0 z-10 backdrop-blur-sm bg-card/80">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground p-2 rounded-lg">
              <HardHat className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold font-display tracking-tight text-foreground">
              СтройКонтроль <span className="text-primary/60 font-sans font-normal text-sm ml-2 hidden sm:inline-block">v1.0</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" size="sm" className="gap-2" onClick={exportToExcel} data-testid="button-export">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Выгрузка</span>
            </Button>
            <CalendarDialog />
            <Link href="/analytics">
              <Button variant="ghost" size="sm" className="gap-2" data-testid="button-analytics">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Аналитика</span>
              </Button>
            </Link>
            <CreateBlockDialog />
            <CreateWorkGroupDialog />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard 
            title="Всего групп" 
            value={totalGroups} 
            icon={<FolderOpen className="w-5 h-5 text-blue-500" />} 
          />
          <StatsCard 
            title="Всего работ" 
            value={totalWorks} 
            icon={<HardHat className="w-5 h-5 text-orange-500" />} 
          />
          <StatsCard 
            title="Средний прогресс" 
            value={`${avgProgress}%`} 
            icon={<TrendingUp className="w-5 h-5 text-green-500" />} 
          />
        </div>

        <div className="space-y-6">
          {hasNoData ? (
            <EmptyState />
          ) : (
            <>
              {blocks.length > 0 && (
                <Accordion type="multiple" defaultValue={blocks.map(b => `block-${b.id}`)} className="space-y-4">
                  {blocks.map((block) => (
                    <BlockAccordionItem key={block.id} block={block} holidayDates={holidayDates} />
                  ))}
                </Accordion>
              )}
              
              {groups.length > 0 && (
                <div className="space-y-4">
                  {blocks.length > 0 && (
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-2">
                      Группы без блока
                    </h3>
                  )}
                  <Accordion type="multiple" defaultValue={groups.map(g => `group-${g.id}`)} className="space-y-4">
                    {groups.map((group) => (
                      <GroupAccordionItem key={group.id} group={group} holidayDates={holidayDates} />
                    ))}
                  </Accordion>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function BlockAccordionItem({ block, holidayDates }: { block: BlockResponse; holidayDates: Set<string> }) {
  const { mutate: deleteBlock } = useDeleteBlock();
  const [showAllGroups, setShowAllGroups] = useState(true);
  
  const totalGroups = block.groups?.length || 0;
  const totalWorks = block.groups?.reduce((acc, g) => acc + (g.works?.length || 0), 0) || 0;
  const avgProgress = totalWorks > 0 
    ? Math.round(block.groups!.reduce((acc, g) => acc + (g.works?.reduce((wAcc, w) => wAcc + w.progressPercentage, 0) || 0), 0) / totalWorks)
    : 0;

  return (
    <AccordionItem value={`block-${block.id}`} className="border rounded-xl bg-card shadow-sm overflow-hidden border-primary/30">
      <div className="flex items-center px-6 py-4 hover:bg-secondary/30 transition-colors">
        <AccordionTrigger className="flex-1 hover:no-underline p-0">
          <div className="flex items-center gap-4">
            <div className="bg-primary/20 p-2 rounded-md text-primary">
              <Layers className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="font-display text-lg font-bold text-foreground">{block.name}</h3>
              <p className="text-xs text-muted-foreground font-sans font-medium flex gap-2">
                <span>Групп: {totalGroups}</span>
                <span className="text-border">|</span>
                <span>Работ: {totalWorks}</span>
              </p>
            </div>
          </div>
        </AccordionTrigger>
        
        <div className="flex items-center gap-6 ml-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">Показать/скрыть группы</span>
            <Switch 
              checked={showAllGroups} 
              onCheckedChange={setShowAllGroups}
              className={`${showAllGroups ? 'bg-green-500' : 'bg-red-500'}`}
              data-testid={`switch-block-groups-${block.id}`}
            />
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">ВЫПОЛНЕНИЕ</span>
            <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500" 
                style={{ width: `${avgProgress}%` }}
              />
            </div>
            <span className="text-xs font-mono w-8 text-right">{avgProgress}%</span>
          </div>
        </div>
      </div>
      
      <AccordionContent className="bg-secondary/10 border-t border-border/50 px-6 py-6">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Группы в блоке</h4>
          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" data-testid={`button-delete-block-${block.id}`}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Удалить блок
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Это действие удалит блок "{block.name}". Группы, входящие в блок, станут неприкрепленными.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction 
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => deleteBlock(block.id)}
                  >
                    Удалить
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {totalGroups === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-border rounded-lg bg-background/50">
            <p className="text-muted-foreground mb-2">В этом блоке пока нет групп.</p>
            <p className="text-xs text-muted-foreground">Создайте группу и добавьте её в этот блок через редактирование.</p>
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={showAllGroups ? block.groups?.map(g => `group-${g.id}`) : []} className="space-y-3">
            {block.groups?.map((group) => (
              <GroupAccordionItem key={group.id} group={group} holidayDates={holidayDates} isNested forceHideWorks={!showAllGroups} />
            ))}
          </Accordion>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

function GroupAccordionItem({ group, holidayDates, isNested = false, forceHideWorks = false }: { group: WorkGroupResponse; holidayDates: Set<string>; isNested?: boolean; forceHideWorks?: boolean }) {
  const { mutate: deleteGroup } = useDeleteWorkGroup();
  const [showAllWorks, setShowAllWorks] = useState(!isNested);
  const effectiveShowWorks = forceHideWorks ? false : showAllWorks;
  const totalWorks = group.works?.length || 0;
  const completedWorks = group.works?.filter(w => w.progressPercentage === 100).length || 0;
  const avgProgress = totalWorks > 0 
    ? Math.round(group.works!.reduce((acc, w) => acc + w.progressPercentage, 0) / totalWorks)
    : 0;

  if (forceHideWorks) {
    return (
      <div className={`border rounded-xl bg-card shadow-sm overflow-hidden border-border/60 ${isNested ? 'bg-background' : ''}`}>
        <div className="flex items-center px-6 py-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="bg-primary/10 p-2 rounded-md text-primary">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="font-display text-lg font-bold text-foreground">{group.name}</h3>
              <p className="text-xs text-muted-foreground font-sans font-medium flex gap-2">
                <span>Работ: {totalWorks}</span>
                <span className="text-border">|</span>
                <span>Завершено: {completedWorks}</span>
              </p>
            </div>
          </div>
          
          <div className="hidden sm:flex items-center gap-2 ml-4">
            <span className="text-xs font-bold text-muted-foreground">ВЫПОЛНЕНИЕ</span>
            <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500" 
                style={{ width: `${avgProgress}%` }}
              />
            </div>
            <span className="text-xs font-mono w-8 text-right">{avgProgress}%</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AccordionItem value={`group-${group.id}`} className={`border rounded-xl bg-card shadow-sm overflow-hidden border-border/60 ${isNested ? 'bg-background' : ''}`}>
      <div className="flex items-center px-6 py-4 hover:bg-secondary/30 transition-colors">
        <AccordionTrigger className="flex-1 hover:no-underline p-0">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-2 rounded-md text-primary">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="font-display text-lg font-bold text-foreground">{group.name}</h3>
              <p className="text-xs text-muted-foreground font-sans font-medium flex gap-2">
                <span>Работ: {totalWorks}</span>
                <span className="text-border">|</span>
                <span>Завершено: {completedWorks}</span>
              </p>
            </div>
          </div>
        </AccordionTrigger>
        
        <div className="flex items-center gap-6 ml-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">Показать/скрыть работы</span>
            <Switch 
              checked={showAllWorks} 
              onCheckedChange={setShowAllWorks}
              className={`${showAllWorks ? 'bg-green-500' : 'bg-red-500'}`}
              data-testid={`switch-group-works-${group.id}`}
            />
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">ВЫПОЛНЕНИЕ</span>
            <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500" 
                style={{ width: `${avgProgress}%` }}
              />
            </div>
            <span className="text-xs font-mono w-8 text-right">{avgProgress}%</span>
          </div>
        </div>
      </div>
      
      <AccordionContent className="bg-secondary/10 border-t border-border/50 px-6 py-6">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Список работ</h4>
          <div className="flex gap-2">
            <CreateWorkDialog groupId={group.id} />
            <EditGroupDialog group={group} />
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" data-testid={`button-delete-group-${group.id}`}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Удалить группу
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Это действие удалит группу "{group.name}" и все входящие в неё работы. Это действие необратимо.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction 
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => deleteGroup(group.id)}
                  >
                    Удалить
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {totalWorks === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-border rounded-lg bg-background/50">
            <p className="text-muted-foreground mb-2">В этой группе пока нет работ.</p>
            <CreateWorkDialog groupId={group.id} />
          </div>
        ) : (
          <div className="space-y-1">
            {group.works?.map((work) => (
              <WorkItemRow key={work.id} work={work} expandAll={effectiveShowWorks} holidayDates={holidayDates} />
            ))}
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

function StatsCard({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) {
  return (
    <Card className="p-6 border-border/60 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-secondary rounded-xl">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h2 className="text-2xl font-bold font-display text-foreground">{value}</h2>
        </div>
      </div>
    </Card>
  );
}

function EmptyState() {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="bg-secondary p-6 rounded-full mb-6">
        <FolderOpen className="w-12 h-12 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-bold font-display text-foreground mb-2">Нет данных</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        Создайте первый блок или группу работ, чтобы начать отслеживать прогресс по проекту.
      </p>
      <div className="flex gap-4">
        <CreateBlockDialog />
        <CreateWorkGroupDialog />
      </div>
    </motion.div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="container mx-auto space-y-8">
        <div className="flex justify-between items-center h-16">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-3 gap-6">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
