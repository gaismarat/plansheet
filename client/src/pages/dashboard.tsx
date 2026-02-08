import { useState, useEffect } from "react";
import { useWorksTree, useHolidays, useWorkPeopleSummary, useLatestProgressSubmissions, useUpdateWork } from "@/hooks/use-construction";
import { queryClient } from "@/lib/queryClient";
import { WorkItemRow } from "@/components/work-item-row";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FolderOpen, HardHat, TrendingUp, BarChart3, Download, Layers, CalendarDays, Wallet, User, LogOut, Shield, FileText, Users, ChevronDown, ChevronRight, Tag } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { type WorkTreeDocument, type WorkTreeBlock, type WorkTreeSection, type WorkTreeGroup, type WorkTreeItem } from "@shared/schema";
import { ProjectSwitcher } from "@/components/project-switcher";
import { NotificationsBell } from "@/components/notifications-bell";
import { useProjectContext } from "@/contexts/project-context";

export default function Dashboard() {
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/works/tree'] });
    queryClient.invalidateQueries({ queryKey: ['/api/work-people/summary'] });
    queryClient.invalidateQueries({ queryKey: ['/api/progress/latest-all'] });
  }, []);

  const { data: worksTree, isLoading } = useWorksTree();
  const { data: holidays = [] } = useHolidays();
  const { data: peopleSummary = {} } = useWorkPeopleSummary();
  const { data: progressSubmissions = {} } = useLatestProgressSubmissions();
  const holidayDates = new Set(holidays.map(h => h.date));
  const { user, logout, canViewField, hasPermission } = useAuth();
  const { myPermission, isOwner, isAdmin: isProjectAdmin, canEdit, canView } = useProjectContext();
  
  const showCostColumn = user?.isAdmin || isOwner || isProjectAdmin || myPermission?.worksSeeAmounts || false;
  const isAdmin = user?.isAdmin ?? false;
  const canSetProgress = isAdmin || isOwner || isProjectAdmin || myPermission?.worksEditProgress || false;

  const documents = worksTree || [];

  const totalDocuments = documents.length;
  const totalWorks = documents.reduce((acc, doc) => 
    acc + doc.blocks.reduce((bAcc, block) => 
      bAcc + block.sections.reduce((sAcc, section) => 
        sAcc + section.groups.reduce((gAcc, group) => 
          gAcc + group.works.length, 0), 0), 0), 0);
  const avgProgress = documents.length > 0 
    ? Math.round(documents.reduce((acc, doc) => acc + doc.progressPercentage, 0) / documents.length)
    : 0;

  const exportToExcel = () => {
    const data: any[] = [];
    const showCost = showCostColumn;
    
    documents.forEach((doc) => {
      data.push({ "Документ": doc.name, "Блок": "", "Раздел": "", "Группа": "", "Работа": "" });
      
      doc.blocks.forEach((block) => {
        data.push({ "Документ": "", "Блок": `${block.number}. ${block.name}`, "Раздел": "", "Группа": "", "Работа": "" });
        
        block.sections.forEach((section) => {
          data.push({ "Документ": "", "Блок": "", "Раздел": `${section.number}. ${section.name}`, "Группа": "", "Работа": "" });
          
          section.groups.forEach((group) => {
            group.works.forEach((work) => {
              const row: any = {
                "Документ": "",
                "Блок": "",
                "Раздел": "",
                "Группа": `${group.number}. ${group.name}`,
                "Работа": work.pdcName,
                "ID": work.id,
                "Объём (план)": work.pdcQuantity,
                "Объём (факт)": work.volumeActual,
                "Ед. изм.": work.pdcUnit,
              };
              
              if (showCost) {
                row["Стоимость (план)"] = work.pdcCostWithVat;
                row["Стоимость (факт)"] = work.costActual;
              }
              
              row["Дата начала (план)"] = work.planStartDate || "";
              row["Дата начала (факт)"] = work.actualStartDate || "";
              row["Дата окончания (план)"] = work.planEndDate || "";
              row["Дата окончания (факт)"] = work.actualEndDate || "";
              row["Ответственный"] = work.responsiblePerson || "";
              row["Прогресс %"] = work.progressPercentage;
              
              data.push(row);
            });
          });
        });
      });
    });
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Работы");
    XLSX.writeFile(wb, "construction_works.xls");
  };

  if (isLoading) return <DashboardSkeleton />;

  const hasNoData = documents.length === 0;

  return (
    <div className="min-h-screen bg-background/50">
      <header className="bg-card border-b border-border sticky top-0 z-10 backdrop-blur-sm bg-card/80">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-2">
          <ProjectSwitcher />
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" size="sm" className="gap-2" onClick={exportToExcel} data-testid="button-export">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Выгрузка</span>
            </Button>
            <CalendarDialog />
            {canView('budget') && (
              <Link href="/budget">
                <Button variant="ghost" size="sm" className="gap-2" data-testid="button-budget">
                  <Wallet className="w-4 h-4" />
                  <span className="hidden sm:inline">Бюджет</span>
                </Button>
              </Link>
            )}
            {canView('pdc') && (
              <Link href="/pdc">
                <Button variant="ghost" size="sm" className="gap-2" data-testid="button-pdc">
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">ПДЦ</span>
                </Button>
              </Link>
            )}
            {canView('ksp') && (
              <Link href="/ksp">
                <Button variant="ghost" size="sm" className="gap-2" data-testid="button-ksp">
                  <CalendarDays className="w-4 h-4" />
                  <span className="hidden sm:inline">КСП</span>
                </Button>
              </Link>
            )}
            {canView('people') && (
              <Link href="/people">
                <Button variant="ghost" size="sm" className="gap-2" data-testid="button-people">
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Люди</span>
                </Button>
              </Link>
            )}
            {canView('analytics') && (
              <Link href="/analytics">
                <Button variant="ghost" size="sm" className="gap-2" data-testid="button-analytics">
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Аналитика</span>
                </Button>
              </Link>
            )}
            {canView('codes') && (
              <Link href="/codes">
                <Button variant="ghost" size="sm" className="gap-2" data-testid="button-codes">
                  <Tag className="w-4 h-4" />
                  <span className="hidden sm:inline">Коды</span>
                </Button>
              </Link>
            )}
            <NotificationsBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" data-testid="button-user-menu">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">{user?.username}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {user?.isAdmin && (
                  <>
                    <Link href="/admin">
                      <DropdownMenuItem data-testid="menu-admin">
                        <Shield className="w-4 h-4 mr-2" />
                        Пользователи
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => logout()} data-testid="menu-logout">
                  <LogOut className="w-4 h-4 mr-2" />
                  Выход
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard 
            title="Всего документов" 
            value={totalDocuments} 
            icon={<FileText className="w-5 h-5 text-blue-500" />} 
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
            <Accordion type="multiple" defaultValue={documents.map(d => `doc-${d.id}`)} className="space-y-4">
              {documents.map((doc) => (
                <DocumentAccordionItem 
                  key={doc.id} 
                  document={doc} 
                  holidayDates={holidayDates} 
                  showCost={showCostColumn} 
                  peopleSummary={peopleSummary} 
                  isAdmin={isAdmin} 
                  progressSubmissions={progressSubmissions} 
                  canSetProgress={canSetProgress} 
                />
              ))}
            </Accordion>
          )}
        </div>
      </main>
    </div>
  );
}

function DocumentAccordionItem({ document, holidayDates, showCost = true, peopleSummary = {}, isAdmin = false, progressSubmissions = {}, canSetProgress = false }: { 
  document: WorkTreeDocument; 
  holidayDates: Set<string>; 
  showCost?: boolean; 
  peopleSummary?: Record<number, { actualToday: number; averageActual: number; weekendHolidayWorkedDays: number }>; 
  isAdmin?: boolean; 
  progressSubmissions?: Record<number, any>; 
  canSetProgress?: boolean 
}) {
  const [showAllBlocks, setShowAllBlocks] = useState(true);

  return (
    <AccordionItem value={`doc-${document.id}`} className="border rounded-xl bg-card shadow-sm overflow-hidden border-primary/50">
      <div className="flex items-center px-6 py-4 hover:bg-secondary/30 transition-colors">
        <AccordionTrigger className="flex-1 hover:no-underline p-0">
          <div className="flex items-center gap-4">
            <div className="bg-primary/20 p-2 rounded-md text-primary">
              <FileText className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="font-display text-lg font-bold text-foreground">{document.name}</h3>
              <p className="text-xs text-muted-foreground font-sans font-medium flex gap-2">
                <span>Блоков: {document.blocks.length}</span>
                {showCost && (
                  <>
                    <span className="text-border">|</span>
                    <span>Стоимость: {document.costWithVat.toLocaleString('ru-RU')} руб.</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </AccordionTrigger>
        
        <div className="flex items-center gap-6 ml-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">Показать/скрыть блоки</span>
            <Switch 
              checked={showAllBlocks} 
              onCheckedChange={setShowAllBlocks}
              className={`${showAllBlocks ? 'bg-green-500' : 'bg-red-500'}`}
              data-testid={`switch-doc-blocks-${document.id}`}
            />
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">ВЫПОЛНЕНИЕ</span>
            <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500" 
                style={{ width: `${document.progressPercentage}%` }}
              />
            </div>
            <span className="text-xs font-sans w-8 text-right">{document.progressPercentage}%</span>
          </div>
        </div>
      </div>
      
      <AccordionContent className="bg-secondary/10 border-t border-border/50 px-6 py-6">
        {document.blocks.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-border rounded-lg bg-background/50">
            <p className="text-muted-foreground mb-2">В этом документе пока нет блоков.</p>
            <p className="text-xs text-muted-foreground">Добавьте блоки через страницу ПДЦ.</p>
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={showAllBlocks ? document.blocks.map(b => `block-${b.id}`) : []} className="space-y-3">
            {document.blocks.map((block) => (
              <BlockAccordionItem 
                key={block.id} 
                block={block} 
                holidayDates={holidayDates} 
                forceHide={!showAllBlocks} 
                showCost={showCost} 
                peopleSummary={peopleSummary} 
                isAdmin={isAdmin} 
                progressSubmissions={progressSubmissions} 
                canSetProgress={canSetProgress} 
              />
            ))}
          </Accordion>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

function BlockAccordionItem({ block, holidayDates, forceHide = false, showCost = true, peopleSummary = {}, isAdmin = false, progressSubmissions = {}, canSetProgress = false }: { 
  block: WorkTreeBlock; 
  holidayDates: Set<string>; 
  forceHide?: boolean; 
  showCost?: boolean; 
  peopleSummary?: Record<number, { actualToday: number; averageActual: number; weekendHolidayWorkedDays: number }>; 
  isAdmin?: boolean; 
  progressSubmissions?: Record<number, any>; 
  canSetProgress?: boolean 
}) {
  const [showAllSections, setShowAllSections] = useState(true);

  if (forceHide) {
    return (
      <div className="border rounded-xl bg-background shadow-sm overflow-hidden border-border/60">
        <div className="flex items-center px-6 py-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="bg-primary/10 p-2 rounded-md text-primary">
              <Layers className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="font-display text-lg font-bold text-foreground">{block.number}. {block.name}</h3>
              <p className="text-xs text-muted-foreground font-sans font-medium flex gap-2">
                <span>Разделов: {block.sections.length}</span>
              </p>
            </div>
          </div>
          
          <div className="hidden sm:flex items-center gap-2 ml-4">
            <span className="text-xs font-bold text-muted-foreground">ВЫПОЛНЕНИЕ</span>
            <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500" 
                style={{ width: `${block.progressPercentage}%` }}
              />
            </div>
            <span className="text-xs font-sans w-8 text-right">{block.progressPercentage}%</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AccordionItem value={`block-${block.id}`} className="border rounded-xl bg-background shadow-sm overflow-hidden border-border/60">
      <div className="flex items-center px-6 py-4 hover:bg-secondary/30 transition-colors">
        <AccordionTrigger className="flex-1 hover:no-underline p-0">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-2 rounded-md text-primary">
              <Layers className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="font-display text-lg font-bold text-foreground">{block.number}. {block.name}</h3>
              <p className="text-xs text-muted-foreground font-sans font-medium flex gap-2">
                <span>Разделов: {block.sections.length}</span>
                {showCost && (
                  <>
                    <span className="text-border">|</span>
                    <span>Стоимость: {block.costWithVat.toLocaleString('ru-RU')} руб.</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </AccordionTrigger>
        
        <div className="flex items-center gap-6 ml-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">Показать/скрыть разделы</span>
            <Switch 
              checked={showAllSections} 
              onCheckedChange={setShowAllSections}
              className={`${showAllSections ? 'bg-green-500' : 'bg-red-500'}`}
              data-testid={`switch-block-sections-${block.id}`}
            />
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">ВЫПОЛНЕНИЕ</span>
            <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500" 
                style={{ width: `${block.progressPercentage}%` }}
              />
            </div>
            <span className="text-xs font-sans w-8 text-right">{block.progressPercentage}%</span>
          </div>
        </div>
      </div>
      
      <AccordionContent className="bg-secondary/5 border-t border-border/50 px-6 py-6">
        {block.sections.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-border rounded-lg bg-background/50">
            <p className="text-muted-foreground">В этом блоке пока нет разделов.</p>
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={showAllSections ? block.sections.map(s => `section-${s.id}`) : []} className="space-y-3">
            {block.sections.map((section) => (
              <SectionAccordionItem 
                key={section.id} 
                section={section} 
                holidayDates={holidayDates} 
                forceHide={!showAllSections} 
                showCost={showCost} 
                peopleSummary={peopleSummary} 
                isAdmin={isAdmin} 
                progressSubmissions={progressSubmissions} 
                canSetProgress={canSetProgress} 
              />
            ))}
          </Accordion>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

function SectionAccordionItem({ section, holidayDates, forceHide = false, showCost = true, peopleSummary = {}, isAdmin = false, progressSubmissions = {}, canSetProgress = false }: { 
  section: WorkTreeSection; 
  holidayDates: Set<string>; 
  forceHide?: boolean; 
  showCost?: boolean; 
  peopleSummary?: Record<number, { actualToday: number; averageActual: number; weekendHolidayWorkedDays: number }>; 
  isAdmin?: boolean; 
  progressSubmissions?: Record<number, any>; 
  canSetProgress?: boolean 
}) {
  const [showAllGroups, setShowAllGroups] = useState(true);

  if (forceHide) {
    return (
      <div className="border rounded-lg bg-card shadow-sm overflow-hidden border-border/40">
        <div className="flex items-center px-5 py-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="bg-secondary p-1.5 rounded-md text-muted-foreground">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div className="text-left">
              <h4 className="font-semibold text-foreground">{section.number}. {section.name}</h4>
              <p className="text-xs text-muted-foreground">Групп: {section.groups.length}</p>
            </div>
          </div>
          
          <div className="hidden sm:flex items-center gap-2 ml-4">
            <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500" 
                style={{ width: `${section.progressPercentage}%` }}
              />
            </div>
            <span className="text-xs font-sans w-8 text-right">{section.progressPercentage}%</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AccordionItem value={`section-${section.id}`} className="border rounded-lg bg-card shadow-sm overflow-hidden border-border/40">
      <div className="flex items-center px-5 py-3 hover:bg-secondary/30 transition-colors">
        <AccordionTrigger className="flex-1 hover:no-underline p-0">
          <div className="flex items-center gap-3">
            <div className="bg-secondary p-1.5 rounded-md text-muted-foreground">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div className="text-left">
              <h4 className="font-semibold text-foreground">{section.number}. {section.name}</h4>
              <p className="text-xs text-muted-foreground flex gap-2">
                <span>Групп: {section.groups.length}</span>
                {showCost && (
                  <>
                    <span className="text-border">|</span>
                    <span>Стоимость: {section.costWithVat.toLocaleString('ru-RU')} руб.</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </AccordionTrigger>
        
        <div className="flex items-center gap-4 ml-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">Показать/скрыть группы</span>
            <Switch 
              checked={showAllGroups} 
              onCheckedChange={setShowAllGroups}
              className={`${showAllGroups ? 'bg-green-500' : 'bg-red-500'}`}
              data-testid={`switch-section-groups-${section.id}`}
            />
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500" 
                style={{ width: `${section.progressPercentage}%` }}
              />
            </div>
            <span className="text-xs font-sans w-8 text-right">{section.progressPercentage}%</span>
          </div>
        </div>
      </div>
      
      <AccordionContent className="bg-secondary/5 border-t border-border/30 px-5 py-4">
        {section.groups.length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed border-border rounded-lg bg-background/50">
            <p className="text-muted-foreground text-sm">В этом разделе пока нет групп.</p>
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={showAllGroups ? section.groups.map(g => `group-${g.id}`) : []} className="space-y-2">
            {section.groups.map((group) => (
              <GroupAccordionItem 
                key={group.id} 
                group={group} 
                holidayDates={holidayDates} 
                forceHide={!showAllGroups} 
                showCost={showCost} 
                peopleSummary={peopleSummary} 
                isAdmin={isAdmin} 
                progressSubmissions={progressSubmissions} 
                canSetProgress={canSetProgress} 
              />
            ))}
          </Accordion>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

function GroupAccordionItem({ group, holidayDates, forceHide = false, showCost = true, peopleSummary = {}, isAdmin = false, progressSubmissions = {}, canSetProgress = false }: { 
  group: WorkTreeGroup; 
  holidayDates: Set<string>; 
  forceHide?: boolean; 
  showCost?: boolean; 
  peopleSummary?: Record<number, { actualToday: number; averageActual: number; weekendHolidayWorkedDays: number }>; 
  isAdmin?: boolean; 
  progressSubmissions?: Record<number, any>; 
  canSetProgress?: boolean 
}) {
  const [showAllWorks, setShowAllWorks] = useState(true);

  if (forceHide) {
    return (
      <div className="border rounded-md bg-background shadow-sm overflow-hidden border-border/30">
        <div className="flex items-center px-4 py-2">
          <div className="flex items-center gap-2 flex-1">
            <div className="bg-muted p-1 rounded text-muted-foreground">
              <HardHat className="w-3.5 h-3.5" />
            </div>
            <div className="text-left">
              <h5 className="font-medium text-sm text-foreground">{group.number}. {group.name}</h5>
              <p className="text-xs text-muted-foreground">Работ: {group.works.length}</p>
            </div>
          </div>
          
          <div className="hidden sm:flex items-center gap-2 ml-4">
            <div className="w-16 h-1 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500" 
                style={{ width: `${group.progressPercentage}%` }}
              />
            </div>
            <span className="text-xs font-sans w-8 text-right">{group.progressPercentage}%</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AccordionItem value={`group-${group.id}`} className="border rounded-md bg-background shadow-sm overflow-hidden border-border/30">
      <div className="flex items-center px-4 py-2 hover:bg-secondary/20 transition-colors">
        <AccordionTrigger className="flex-1 hover:no-underline p-0">
          <div className="flex items-center gap-2">
            <div className="bg-muted p-1 rounded text-muted-foreground">
              <HardHat className="w-3.5 h-3.5" />
            </div>
            <div className="text-left">
              <h5 className="font-medium text-sm text-foreground">{group.number}. {group.name}</h5>
              <p className="text-xs text-muted-foreground flex gap-2">
                <span>Работ: {group.works.length}</span>
                <span className="text-border">|</span>
                <span>{group.quantity} {group.unit}</span>
                {showCost && (
                  <>
                    <span className="text-border">|</span>
                    <span>{group.costWithVat.toLocaleString('ru-RU')} руб.</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </AccordionTrigger>
        
        <div className="flex items-center gap-4 ml-4">
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
            <div className="w-16 h-1 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500" 
                style={{ width: `${group.progressPercentage}%` }}
              />
            </div>
            <span className="text-xs font-sans w-8 text-right">{group.progressPercentage}%</span>
          </div>
        </div>
      </div>
      
      <AccordionContent className="bg-muted/30 border-t border-border/20 px-4 py-3">
        {group.works.length === 0 ? (
          <div className="text-center py-4 border border-dashed border-border rounded bg-background/50">
            <p className="text-muted-foreground text-sm">В этой группе пока нет работ.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {group.works.map((work) => (
              <WorkItemRow 
                key={work.id} 
                work={work} 
                expandAll={showAllWorks} 
                holidayDates={holidayDates} 
                showCost={showCost} 
                peopleSummary={peopleSummary[work.id]} 
                isAdmin={isAdmin} 
                progressSubmission={progressSubmissions[work.id]} 
                canSetProgress={canSetProgress} 
              />
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
        <FileText className="w-12 h-12 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-bold font-display text-foreground mb-2">Нет данных</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        Создайте ПДЦ документ на странице ПДЦ, чтобы работы появились здесь автоматически.
      </p>
      <Link href="/pdc">
        <Button className="gap-2">
          <FileText className="w-4 h-4" />
          Перейти к ПДЦ
        </Button>
      </Link>
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
