import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { 
  HardHat, 
  ArrowLeft, 
  Plus, 
  Download, 
  ChevronDown, 
  ChevronRight,
  ChevronUp,
  Pencil,
  Trash2,
  X,
  Check,
  Link2,
  Eye,
  EyeOff
} from "lucide-react";
import * as XLSX from "xlsx";
import type { Contract, ContractWithData, BudgetColumn, BudgetRowWithChildren, BudgetValue, Stage, ClassifierCodeWithChildren, BudgetRowCodeWithCode } from "@shared/schema";
import { useProjectContext } from "@/contexts/project-context";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export default function Budget() {
  const { toast } = useToast();
  const { currentProjectId } = useProjectContext();
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null);
  const [editingHeaderText, setEditingHeaderText] = useState(false);
  const [headerText, setHeaderText] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [eyeCollapsedRows, setEyeCollapsedRows] = useState<Set<number>>(new Set());
  const [editingColumnId, setEditingColumnId] = useState<number | null>(null);
  const [editingColumnName, setEditingColumnName] = useState("");
  const [newContractName, setNewContractName] = useState("");
  const [showNewContractDialog, setShowNewContractDialog] = useState(false);
  const [addRowParentId, setAddRowParentId] = useState<number | null>(null);
  const [addRowLevel, setAddRowLevel] = useState<string>("section");
  const [addRowName, setAddRowName] = useState("");
  const [showAddRowDialog, setShowAddRowDialog] = useState(false);
  const [addRowChapterType, setAddRowChapterType] = useState<string>("income");
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editingRowName, setEditingRowName] = useState("");
  const [editingValueRowId, setEditingValueRowId] = useState<number | null>(null);
  const [editingValueColumnId, setEditingValueColumnId] = useState<number | null>(null);
  const [editingValueRubles, setEditingValueRubles] = useState<string>("");
  const [editingValueRowName, setEditingValueRowName] = useState<string>("");
  const [showValueDrawer, setShowValueDrawer] = useState(false);
  const [codesDialogRowId, setCodesDialogRowId] = useState<number | null>(null);
  const [selectedCodeIds, setSelectedCodeIds] = useState<Set<number>>(new Set());
  const [expandedCodeNodes, setExpandedCodeNodes] = useState<Set<number>>(new Set());

  const { data: contracts = [], isLoading: contractsLoading } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });

  const { data: contractData, isLoading: contractDataLoading } = useQuery<ContractWithData>({
    queryKey: ["/api/contracts", selectedContractId],
    enabled: !!selectedContractId,
  });

  const { data: stages = [] } = useQuery<Stage[]>({
    queryKey: [`/api/projects/${currentProjectId}/stages`],
    enabled: !!currentProjectId,
  });

  const { data: classifierCodes = [] } = useQuery<ClassifierCodeWithChildren[]>({
    queryKey: ["/api/classifier-codes"],
  });

  const { data: rowCodes = [] } = useQuery<BudgetRowCodeWithCode[]>({
    queryKey: ["/api/budget-rows", codesDialogRowId, "codes"],
    enabled: !!codesDialogRowId,
  });

  // Actual costs from PDC (grouped by rowId and stageId)
  const { data: actualCosts = [] } = useQuery<{ rowId: number; stageId: number; actualCost: number }[]>({
    queryKey: [`/api/budget-actual-costs/${currentProjectId}`],
    enabled: !!currentProjectId,
  });

  useEffect(() => {
    if (codesDialogRowId && rowCodes.length > 0) {
      setSelectedCodeIds(new Set(rowCodes.map(rc => rc.codeId)));
    } else if (!codesDialogRowId) {
      setSelectedCodeIds(new Set());
    }
  }, [rowCodes, codesDialogRowId]);

  useEffect(() => {
    if (contractData?.headerText) {
      setHeaderText(contractData.headerText);
    }
  }, [contractData]);

  useEffect(() => {
    if (contracts.length > 0 && !selectedContractId) {
      setSelectedContractId(contracts[0].id);
    }
  }, [contracts, selectedContractId]);

  const createContract = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest("POST", "/api/contracts", { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      setShowNewContractDialog(false);
      setNewContractName("");
      toast({ title: "Бюджет создан" });
    },
  });

  const updateContract = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Contract> }) => {
      return await apiRequest("PUT", `/api/contracts/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts", selectedContractId] });
    },
  });

  const createColumn = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest("POST", "/api/budget-columns", { 
        contractId: selectedContractId, 
        name,
        isTotal: 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts", selectedContractId] });
      toast({ title: "Столбец добавлен" });
    },
  });

  const updateColumn = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      return await apiRequest("PUT", `/api/budget-columns/${id}`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts", selectedContractId] });
      setEditingColumnId(null);
    },
  });

  const deleteColumn = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/budget-columns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts", selectedContractId] });
      toast({ title: "Столбец удалён" });
    },
  });

  const createRow = useMutation({
    mutationFn: async ({ parentId, name, level, chapterType }: { parentId: number | null; name: string; level: string; chapterType?: string }) => {
      const parentRow = parentId ? findRowById(contractData?.rows || [], parentId) : null;
      const finalChapterType = level === "section" ? chapterType : parentRow?.chapterType;
      return await apiRequest("POST", "/api/budget-rows", { 
        contractId: selectedContractId, 
        parentId,
        name,
        level,
        chapterType: finalChapterType || null,
        rowType: "manual"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts", selectedContractId] });
      setShowAddRowDialog(false);
      setAddRowName("");
      setAddRowParentId(null);
      setAddRowLevel("section");
      setAddRowChapterType("income");
      toast({ title: "Строка добавлена" });
    },
  });

  const deleteRow = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/budget-rows/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts", selectedContractId] });
      toast({ title: "Строка удалена" });
    },
  });

  const updateRow = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      return await apiRequest("PUT", `/api/budget-rows/${id}`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts", selectedContractId] });
      setEditingRowId(null);
    },
  });

  const updateValue = useMutation({
    mutationFn: async ({ rowId, columnId, manualValue }: { rowId: number; columnId: number; manualValue: number }) => {
      return await apiRequest("POST", "/api/budget-values", { rowId, columnId, manualValue });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts", selectedContractId] });
    },
  });

  const reorderRow = useMutation({
    mutationFn: async ({ id, direction }: { id: number; direction: 'up' | 'down' }) => {
      return await apiRequest("PUT", `/api/budget-rows/${id}/reorder`, { direction });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts", selectedContractId] });
    },
  });

  const updateColumnStage = useMutation({
    mutationFn: async ({ id, stageId }: { id: number; stageId: number | null }) => {
      return await apiRequest("PUT", `/api/budget-columns/${id}`, { stageId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts", selectedContractId] });
    },
  });

  const updateRowCodes = useMutation({
    mutationFn: async ({ rowId, codeIds }: { rowId: number; codeIds: number[] }) => {
      return await apiRequest("PUT", `/api/budget-rows/${rowId}/codes`, { codeIds });
    },
    onSuccess: () => {
      if (codesDialogRowId) {
        queryClient.invalidateQueries({ queryKey: ["/api/budget-rows", codesDialogRowId, "codes"] });
      }
      setCodesDialogRowId(null);
      toast({ title: "Коды сохранены" });
    },
  });

  const findRowById = (rows: BudgetRowWithChildren[], id: number): BudgetRowWithChildren | null => {
    for (const row of rows) {
      if (row.id === id) return row;
      if (row.children) {
        const found = findRowById(row.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const getAvailableParents = (level: string): { id: number; name: string; chapterType?: string | null }[] => {
    if (!contractData?.rows) return [];
    
    if (level === "section") {
      return contractData.rows.filter(r => r.level === "chapter").map(r => ({ 
        id: r.id, 
        name: r.name,
        chapterType: r.chapterType
      }));
    }
    
    if (level === "group") {
      const sections: { id: number; name: string; chapterType?: string | null }[] = [];
      const collectSections = (rows: BudgetRowWithChildren[]) => {
        for (const row of rows) {
          if (row.level === "section") {
            sections.push({ id: row.id, name: row.name, chapterType: row.chapterType });
          }
          if (row.children) collectSections(row.children);
        }
      };
      collectSections(contractData.rows);
      return sections;
    }
    
    if (level === "item") {
      const groups: { id: number; name: string; chapterType?: string | null }[] = [];
      const collectGroups = (rows: BudgetRowWithChildren[]) => {
        for (const row of rows) {
          if (row.level === "group" || row.level === "section") {
            groups.push({ id: row.id, name: `${row.level === "section" ? "[Р] " : "[Г] "}${row.name}`, chapterType: row.chapterType });
          }
          if (row.children) collectGroups(row.children);
        }
      };
      collectGroups(contractData.rows);
      return groups;
    }
    
    return [];
  };

  // Get all descendant row IDs (for expanding entire hierarchy)
  const getAllDescendantIds = (row: BudgetRowWithChildren): number[] => {
    let ids: number[] = [];
    for (const child of row.children || []) {
      ids.push(child.id);
      ids = ids.concat(getAllDescendantIds(child));
    }
    return ids;
  };

  const toggleRow = (rowId: number) => {
    const row = contractData?.rows ? findRowById(contractData.rows, rowId) : null;
    const isChapter = row?.level === "chapter";
    
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId);
    } else {
      newExpanded.add(rowId);
      
      // For chapter: expand all descendants and reset their eyes
      if (isChapter && row) {
        const descendantIds = getAllDescendantIds(row);
        descendantIds.forEach(id => newExpanded.add(id));
        
        // Reset eyes for all descendants
        const newEyeCollapsed = new Set(eyeCollapsedRows);
        descendantIds.forEach(id => newEyeCollapsed.delete(id));
        setEyeCollapsedRows(newEyeCollapsed);
      }
    }
    setExpandedRows(newExpanded);
  };

  const handleSaveHeaderText = () => {
    if (selectedContractId) {
      updateContract.mutate({ id: selectedContractId, updates: { headerText } });
      setEditingHeaderText(false);
    }
  };

  const parseValue = (val: string | number | null | undefined): number => {
    if (val === null || val === undefined) return 0;
    return typeof val === 'string' ? parseFloat(val) || 0 : val;
  };

  // Build actual cost map: key = "rowId-stageId", value = actualCost
  const actualCostMap = new Map<string, number>();
  actualCosts.forEach(ac => {
    actualCostMap.set(`${ac.rowId}-${ac.stageId}`, ac.actualCost);
  });

  // Get stageId for a column
  const getColumnStageId = (columnId: number): number | null => {
    const col = contractData?.columns?.find(c => c.id === columnId);
    return col?.stageId ?? null;
  };

  // Get actual cost for row+column from PDC data
  const getActualCostForCell = (rowId: number, columnId: number): number => {
    const stageId = getColumnStageId(columnId);
    if (!stageId) return 0;
    return actualCostMap.get(`${rowId}-${stageId}`) || 0;
  };

  // Recursive function to get all descendant item row IDs
  const getDescendantItemRowIds = (row: BudgetRowWithChildren): number[] => {
    if (row.level === "item") {
      return [row.id];
    }
    let ids: number[] = [];
    for (const child of row.children || []) {
      ids = ids.concat(getDescendantItemRowIds(child));
    }
    return ids;
  };

  const calculateAggregatedValues = (row: BudgetRowWithChildren, columnId: number): { manual: number; pdc: number; hasActual: boolean } => {
    const stageId = getColumnStageId(columnId);
    
    if (row.level === "item") {
      const value = row.values?.find(v => v.columnId === columnId);
      const manualVal = parseValue(value?.manualValue);
      // Get actual cost from PDC for this row and stage
      const actualFromPdc = stageId ? (actualCostMap.get(`${row.id}-${stageId}`) || 0) : 0;
      const hasActual = actualFromPdc > 0;
      return { 
        manual: manualVal, 
        pdc: actualFromPdc,
        hasActual
      };
    }

    let manual = 0;
    let pdc = 0;
    for (const child of row.children || []) {
      const childValues = calculateAggregatedValues(child, columnId);
      manual += childValues.manual;
      // For parent rows: use actual if available, otherwise use plan
      pdc += childValues.hasActual ? childValues.pdc : childValues.manual;
    }
    return { manual, pdc, hasActual: true };
  };

  const getDeviationColor = (row: BudgetRowWithChildren, manual: number, pdc: number): string => {
    if (manual === 0 || pdc === manual) return "";
    
    const isIncome = row.chapterType === "income";
    const isOverBudget = pdc > manual;
    
    if (isIncome) {
      return isOverBudget ? "text-green-500" : "text-red-500";
    } else {
      return isOverBudget ? "text-red-500" : "text-green-500";
    }
  };

  const formatNumber = (rubles: number): string => {
    const millions = rubles / 1_000_000;
    return millions.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatRubles = (rubles: number): string => {
    return rubles.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const calculateTotalAcrossColumns = (row: BudgetRowWithChildren, stageColumns: BudgetColumn[]): { manual: number; pdc: number; hasActual: boolean } => {
    let totalManual = 0;
    let totalPdc = 0;
    let hasAnyActual = false;
    for (const col of stageColumns) {
      const values = calculateAggregatedValues(row, col.id);
      totalManual += values.manual;
      // For items: add actual if exists, otherwise add plan; for parents: values.pdc already has correct logic
      if (row.level === "item") {
        totalPdc += values.hasActual ? values.pdc : values.manual;
        if (values.hasActual) hasAnyActual = true;
      } else {
        totalPdc += values.pdc;
        hasAnyActual = true;
      }
    }
    return { manual: totalManual, pdc: totalPdc, hasActual: hasAnyActual };
  };

  const getStageColumns = () => {
    return (contractData?.columns || []).filter(c => !c.isTotal);
  };

  const getTotalColumn = () => {
    return (contractData?.columns || []).find(c => c.isTotal);
  };

  const exportToExcel = () => {
    if (!contractData) return;

    const data: any[] = [];
    const stageColumns = (contractData.columns || []).filter(c => !c.isTotal);

    const toMillions = (rubles: number) => rubles / 1_000_000;
    
    const processRow = (row: BudgetRowWithChildren, indent: number) => {
      const rowData: any = {
        "Статья затрат": "  ".repeat(indent) + row.name,
      };

      const totalValues = calculateTotalAcrossColumns(row, stageColumns);
      rowData["ВСЕГО (Бюджет), млн"] = toMillions(totalValues.manual).toFixed(2);
      if (row.level !== "item" || row.rowType === "linked") {
        rowData["ВСЕГО (ПДЦ), млн"] = toMillions(totalValues.pdc).toFixed(2);
      }

      stageColumns.forEach(col => {
        const values = calculateAggregatedValues(row, col.id);
        rowData[col.name + " (Бюджет), млн"] = toMillions(values.manual).toFixed(2);
        if (row.level !== "item" || row.rowType === "linked") {
          rowData[col.name + " (ПДЦ), млн"] = toMillions(values.pdc).toFixed(2);
        }
      });

      data.push(rowData);

      if (row.children) {
        row.children.forEach(child => processRow(child, indent + 1));
      }
    };

    (contractData.rows || []).forEach(row => processRow(row, 0));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Бюджет");
    XLSX.writeFile(wb, `budget_${contractData.name}.xlsx`);
  };

  const renderRow = (row: BudgetRowWithChildren, columns: BudgetColumn[], depth: number = 0, siblingIndex: number = 0, totalSiblings: number = 1, hideByEye: boolean = false, parentHasEye: boolean = false) => {
    // Eye-collapse pattern: hide grandchildren and below when grandparent has eye
    // hideByEye comes from grandparent (parent's parent had eye)
    if (hideByEye) return null;
    
    const isExpanded = expandedRows.has(row.id);
    const hasChildren = row.children && row.children.length > 0;
    const isChapter = row.level === "chapter";
    const isSection = row.level === "section";
    const isGroup = row.level === "group";
    const isItem = row.level === "item";
    const hasEye = eyeCollapsedRows.has(row.id);

    const canMoveUp = siblingIndex > 0;
    const canMoveDown = siblingIndex < totalSiblings - 1;

    const paddingLeft = isChapter ? 12 : isSection ? 24 : isGroup ? 36 : 48;

    const toggleEye = (e: React.MouseEvent) => {
      e.stopPropagation();
      const descendantIds = getAllDescendantIds(row);
      
      if (eyeCollapsedRows.has(row.id)) {
        // Removing eye - also expand all descendants and remove their eyes
        setEyeCollapsedRows(prev => {
          const next = new Set(prev);
          next.delete(row.id);
          descendantIds.forEach(id => next.delete(id));
          return next;
        });
        // Also expand all descendants so collapsed groups become visible
        setExpandedRows(prev => {
          const next = new Set(prev);
          next.add(row.id);
          descendantIds.forEach(id => next.add(id));
          return next;
        });
      } else {
        // Adding eye
        setEyeCollapsedRows(prev => {
          const next = new Set(prev);
          next.add(row.id);
          return next;
        });
      }
    };

    const getRowContent = () => {
      if (isChapter) {
        return <span className="text-sm font-bold uppercase">{row.name}</span>;
      }
      if (isSection) {
        return (
          <div className="flex items-center gap-2">
            {hasChildren && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 shrink-0"
                data-testid={`button-eye-${row.id}`}
                onClick={toggleEye}
              >
                {hasEye ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </Button>
            )}
            <div className="w-1 self-stretch bg-primary rounded-sm shrink-0" />
            <span className="text-sm font-semibold uppercase">{row.name}</span>
          </div>
        );
      }
      if (isGroup) {
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{row.name}</span>
          </div>
        );
      }
      return (
        <span className="text-sm">
          <span className="mr-2">–</span>{row.name}
        </span>
      );
    };

    return (
      <div key={row.id}>
        <div 
          className={`flex items-stretch border-b border-border hover:bg-muted/20 ${isChapter ? 'bg-[#F2F4F7] dark:bg-muted/40' : ''}`}
        >
          <div 
            className="flex-1 min-w-[300px] flex items-center gap-2 py-2 cursor-pointer group"
            style={{ paddingLeft }}
            onClick={() => hasChildren && toggleRow(row.id)}
          >
            {isChapter ? (
              hasChildren ? (
                isExpanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />
              ) : (
                <div className="w-4" />
              )
            ) : null}
            {editingRowId === row.id ? (
              <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                <Input
                  value={editingRowName}
                  onChange={(e) => setEditingRowName(e.target.value)}
                  className="h-7 text-sm flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      updateRow.mutate({ id: row.id, name: editingRowName });
                    } else if (e.key === "Escape") {
                      setEditingRowId(null);
                    }
                  }}
                />
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-6 w-6"
                  onClick={() => updateRow.mutate({ id: row.id, name: editingRowName })}
                >
                  <Check className="w-3 h-3" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-6 w-6"
                  onClick={() => setEditingRowId(null)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <>
                {getRowContent()}
                <div className="flex gap-1 ml-auto mr-2 invisible group-hover:visible">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    data-testid={`button-edit-row-${row.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingRowId(row.id);
                      setEditingRowName(row.name);
                    }}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  {isSection && canMoveUp && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      data-testid={`button-move-up-${row.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        reorderRow.mutate({ id: row.id, direction: 'up' });
                      }}
                    >
                      <ChevronUp className="w-3 h-3" />
                    </Button>
                  )}
                  {isSection && canMoveDown && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      data-testid={`button-move-down-${row.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        reorderRow.mutate({ id: row.id, direction: 'down' });
                      }}
                    >
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  )}
                  {isItem && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      data-testid={`button-link-codes-${row.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCodesDialogRowId(row.id);
                      }}
                    >
                      <Link2 className="w-3 h-3" />
                    </Button>
                  )}
                  {!isChapter && row.level !== "item" && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      data-testid={`button-add-child-${row.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setAddRowParentId(row.id);
                        setAddRowLevel(row.level === "section" ? "group" : "item");
                        setShowAddRowDialog(true);
                      }}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  )}
                  {!isChapter && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-destructive"
                      data-testid={`button-delete-row-${row.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRow.mutate(row.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>

          {(() => {
            const stageColumns = columns.filter(c => !c.isTotal);
            const totalCol = columns.find(c => c.isTotal);
            if (!totalCol) return null;
            const totalValues = calculateTotalAcrossColumns(row, stageColumns);
            const isItemRow = row.level === "item";
            const showPdc = !isItemRow || totalValues.hasActual;
            const deviation = totalValues.manual !== 0 ? ((totalValues.pdc - totalValues.manual) / totalValues.manual * 100) : 0;
            const deviationColor = getDeviationColor(row, totalValues.manual, totalValues.pdc);
            return (
              <div key={totalCol.id} className="w-[120px] shrink-0 border-l border-border flex flex-col justify-center px-2 py-1 text-right bg-muted/30">
                <div className="text-xs font-sans font-semibold">{formatNumber(totalValues.manual)}</div>
                {isItemRow && !totalValues.hasActual ? (
                  <div className="text-xs font-sans text-muted-foreground">—</div>
                ) : showPdc && totalValues.pdc !== totalValues.manual ? (
                  <div className={`text-xs font-sans ${deviationColor}`}>
                    {formatNumber(totalValues.pdc)} 
                    <span className="ml-1">
                      ({deviation > 0 ? "+" : ""}{deviation.toFixed(1)}%)
                    </span>
                  </div>
                ) : null}
              </div>
            );
          })()}
          {columns.filter(c => !c.isTotal).map(col => {
            const values = calculateAggregatedValues(row, col.id);
            const isItemRow = row.level === "item";
            const showPdc = !isItemRow || values.hasActual;
            const pdcForCalc = isItemRow ? (values.hasActual ? values.pdc : values.manual) : values.pdc;
            const deviation = values.manual !== 0 ? ((pdcForCalc - values.manual) / values.manual * 100) : 0;
            const deviationColor = getDeviationColor(row, values.manual, pdcForCalc);

            return (
              <div key={col.id} className="w-[120px] shrink-0 border-l border-border flex flex-col justify-center px-2 py-1 text-right group/cell">
                {isItem && row.rowType === "manual" ? (
                  <>
                    <div className="flex items-center justify-end gap-1">
                      <div className="text-xs font-sans">{formatNumber(values.manual)}</div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 invisible group-hover/cell:visible"
                        data-testid={`button-edit-value-${row.id}-${col.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const currentValue = parseValue(row.values?.find(v => v.columnId === col.id)?.manualValue);
                          setEditingValueRowId(row.id);
                          setEditingValueColumnId(col.id);
                          setEditingValueRubles(currentValue.toFixed(2));
                          setEditingValueRowName(row.name);
                          setShowValueDrawer(true);
                        }}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </div>
                    {values.hasActual ? (
                      <div className={`text-xs font-sans ${deviationColor}`}>
                        {formatNumber(values.pdc)} 
                        <span className="ml-1">
                          ({deviation > 0 ? "+" : ""}{deviation.toFixed(1)}%)
                        </span>
                      </div>
                    ) : (
                      <div className="text-xs font-sans text-muted-foreground">—</div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="text-xs font-sans">{formatNumber(values.manual)}</div>
                    {isItemRow && !values.hasActual ? (
                      <div className="text-xs font-sans text-muted-foreground">—</div>
                    ) : showPdc && pdcForCalc !== values.manual ? (
                      <div className={`text-xs font-sans ${deviationColor}`}>
                        {formatNumber(pdcForCalc)} 
                        <span className="ml-1">
                          ({deviation > 0 ? "+" : ""}{deviation.toFixed(1)}%)
                        </span>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            );
          })}
          <div className="w-[120px] shrink-0 border-l border-transparent" />
        </div>

        {isExpanded && row.children?.map((child, idx) => renderRow(child, columns, depth + 1, idx, row.children?.length || 1, parentHasEye, hasEye))}
      </div>
    );
  };

  if (contractsLoading) {
    return (
      <div className="min-h-screen bg-background/50 p-8">
        <Skeleton className="h-12 w-64 mb-4" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background/50">
      <header className="bg-card border-b border-border sticky top-0 z-10 backdrop-blur-sm bg-card/80">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="bg-primary text-primary-foreground p-2 rounded-lg">
              <HardHat className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold font-display tracking-tight text-foreground">
              Бюджет
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Select 
              value={selectedContractId?.toString() || ""} 
              onValueChange={(v) => setSelectedContractId(parseInt(v))}
            >
              <SelectTrigger className="w-[200px]" data-testid="select-contract">
                <SelectValue placeholder="Выберите бюджет" />
              </SelectTrigger>
              <SelectContent>
                {contracts.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={showNewContractDialog} onOpenChange={setShowNewContractDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" data-testid="button-new-budget">
                  <Plus className="w-4 h-4" />
                  Новый бюджет
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Создать бюджет</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input 
                    placeholder="Название бюджета"
                    value={newContractName}
                    onChange={(e) => setNewContractName(e.target.value)}
                    data-testid="input-contract-name"
                  />
                  <Button 
                    onClick={() => createContract.mutate(newContractName)}
                    disabled={!newContractName.trim()}
                    data-testid="button-create-contract"
                  >
                    Создать
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="sm" className="gap-2" onClick={exportToExcel} data-testid="button-export-budget">
              <Download className="w-4 h-4" />
              Выгрузка
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-8">
        {selectedContractId && contractData ? (
          <Card className="overflow-hidden">
            <div className="flex justify-between items-start p-4 border-b border-border">
              <h2 className="text-lg font-bold">{contractData.name}</h2>
              <div className="text-right max-w-[400px]">
                {editingHeaderText ? (
                  <div className="flex gap-2 items-start">
                    <Textarea
                      value={headerText}
                      onChange={(e) => setHeaderText(e.target.value)}
                      className="text-xs text-right min-h-[80px]"
                      data-testid="textarea-header"
                    />
                    <div className="flex flex-col gap-1">
                      <Button size="icon" variant="ghost" onClick={handleSaveHeaderText}>
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditingHeaderText(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="text-xs text-muted-foreground whitespace-pre-line cursor-pointer hover:bg-muted/50 p-2 rounded"
                    onClick={() => setEditingHeaderText(true)}
                  >
                    {contractData.headerText || "Нажмите для добавления текста шапки..."}
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-max">
                <div className="flex items-center border-b border-border bg-muted/50 font-semibold text-sm">
                  <div className="flex-1 min-w-[300px] px-3 py-2">Статья затрат</div>
                  {contractData.columns?.find(c => c.isTotal) && (
                    <div className="w-[120px] shrink-0 border-l border-border px-2 py-2 text-center bg-muted/30">
                      <span className="font-semibold">ВСЕГО</span>
                    </div>
                  )}
                  {contractData.columns?.filter(c => !c.isTotal).map(col => (
                    <div key={col.id} className="w-[120px] shrink-0 border-l border-border px-2 py-1 text-center flex flex-col gap-1">
                      {editingColumnId === col.id ? (
                        <div className="flex gap-1">
                          <Input
                            value={editingColumnName}
                            onChange={(e) => setEditingColumnName(e.target.value)}
                            className="h-6 text-xs"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                updateColumn.mutate({ id: col.id, name: editingColumnName });
                              }
                            }}
                          />
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateColumn.mutate({ id: col.id, name: editingColumnName })}>
                            <Check className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1 group">
                          <span>{col.name}</span>
                          <div className="opacity-0 group-hover:opacity-100 flex gap-0.5">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-5 w-5"
                              onClick={() => {
                                setEditingColumnId(col.id);
                                setEditingColumnName(col.name);
                              }}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-5 w-5 text-destructive"
                              onClick={() => deleteColumn.mutate(col.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                      <Select 
                        value={col.stageId?.toString() || "none"} 
                        onValueChange={(v) => updateColumnStage.mutate({ id: col.id, stageId: v === "none" ? null : parseInt(v) })}
                      >
                        <SelectTrigger className="h-5 text-[10px] px-1" data-testid={`select-stage-${col.id}`}>
                          <SelectValue placeholder="Этап..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Нет этапа</SelectItem>
                          {stages.map(stage => (
                            <SelectItem key={stage.id} value={stage.id.toString()}>{stage.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                  <div className="w-[120px] shrink-0 border-l border-border px-2 py-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full h-6 text-xs"
                      onClick={() => createColumn.mutate("Новый этап")}
                      data-testid="button-add-column"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Столбец
                    </Button>
                  </div>
                </div>

                {contractData.rows?.map(row => renderRow(row, contractData.columns || []))}
              </div>
            </div>

            <div className="p-4 border-t border-border">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setAddRowParentId(null);
                  setAddRowLevel("section");
                  setAddRowChapterType("income");
                  setAddRowName("");
                  setShowAddRowDialog(true);
                }}
                data-testid="button-add-row"
              >
                <Plus className="w-4 h-4 mr-1" />
                Добавить
              </Button>
            </div>
          </Card>
        ) : (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-4">Выберите или создайте бюджет</p>
            <Button onClick={() => setShowNewContractDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Создать бюджет
            </Button>
          </div>
        )}
      </main>

      <Dialog open={showAddRowDialog} onOpenChange={setShowAddRowDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Добавить строку</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Тип</Label>
              <Select 
                value={addRowLevel} 
                onValueChange={(value) => {
                  setAddRowLevel(value);
                  setAddRowParentId(null);
                }}
              >
                <SelectTrigger data-testid="select-row-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="section">Раздел</SelectItem>
                  <SelectItem value="group">Группа</SelectItem>
                  <SelectItem value="item">Элемент</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {addRowLevel === "section" && (
              <div className="space-y-2">
                <Label>Категория</Label>
                <RadioGroup 
                  value={addRowChapterType} 
                  onValueChange={setAddRowChapterType}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="income" id="income" data-testid="radio-income" />
                    <Label htmlFor="income" className="cursor-pointer">Доход</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="expense" id="expense" data-testid="radio-expense" />
                    <Label htmlFor="expense" className="cursor-pointer">Расход</Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {(addRowLevel === "group" || addRowLevel === "item") && (
              <div className="space-y-2">
                <Label>{addRowLevel === "group" ? "Раздел" : "Родительский элемент"}</Label>
                <Select 
                  value={addRowParentId?.toString() || ""} 
                  onValueChange={(value) => setAddRowParentId(parseInt(value))}
                >
                  <SelectTrigger data-testid="select-parent">
                    <SelectValue placeholder="Выберите..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableParents(addRowLevel).map(parent => (
                      <SelectItem key={parent.id} value={parent.id.toString()}>
                        {parent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Название</Label>
              <Input 
                placeholder="Введите название"
                value={addRowName}
                onChange={(e) => setAddRowName(e.target.value)}
                data-testid="input-row-name"
              />
            </div>

            <div className="pt-4">
              <Button 
                className="w-full"
                onClick={() => {
                  const parentId = addRowLevel === "section" 
                    ? contractData?.rows?.find(r => r.level === "chapter" && r.chapterType === addRowChapterType)?.id || null
                    : addRowParentId;
                  createRow.mutate({ 
                    parentId, 
                    name: addRowName, 
                    level: addRowLevel,
                    chapterType: addRowChapterType 
                  });
                }}
                disabled={!addRowName.trim() || ((addRowLevel === "group" || addRowLevel === "item") && !addRowParentId)}
                data-testid="button-create-row"
              >
                Добавить
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Drawer open={showValueDrawer} onOpenChange={setShowValueDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Ввод стоимости: {editingValueRowName}</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Сумма в рублях (с копейками)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Введите сумму в рублях"
                value={editingValueRubles}
                onChange={(e) => setEditingValueRubles(e.target.value)}
                className="text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                data-testid="input-value-rubles"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Будет отображаться: {formatNumber(parseFloat(editingValueRubles) || 0)} млн
              </p>
            </div>
          </div>
          <DrawerFooter>
            <Button 
              onClick={() => {
                if (editingValueRowId && editingValueColumnId !== null) {
                  const valueInRubles = parseFloat(editingValueRubles) || 0;
                  updateValue.mutate({
                    rowId: editingValueRowId,
                    columnId: editingValueColumnId,
                    manualValue: valueInRubles
                  });
                  setShowValueDrawer(false);
                }
              }}
              data-testid="button-save-value"
            >
              Сохранить
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Отмена</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Dialog open={!!codesDialogRowId} onOpenChange={(open) => !open && setCodesDialogRowId(null)}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Привязка кодов классификатора</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {classifierCodes.filter(c => c.type === "article").map(article => (
              <ClassifierCodeTree
                key={article.id}
                code={article}
                allCodes={classifierCodes}
                selectedIds={selectedCodeIds}
                expandedIds={expandedCodeNodes}
                onToggleSelect={(id) => {
                  const newSelected = new Set(selectedCodeIds);
                  if (newSelected.has(id)) {
                    newSelected.delete(id);
                  } else {
                    newSelected.add(id);
                  }
                  setSelectedCodeIds(newSelected);
                }}
                onToggleExpand={(id) => {
                  const newExpanded = new Set(expandedCodeNodes);
                  if (newExpanded.has(id)) {
                    newExpanded.delete(id);
                  } else {
                    newExpanded.add(id);
                  }
                  setExpandedCodeNodes(newExpanded);
                }}
              />
            ))}
            {classifierCodes.filter(c => c.type === "article").length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Нет кодов классификатора. Создайте их на странице "Коды".</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setCodesDialogRowId(null)}>
              Отмена
            </Button>
            <Button 
              onClick={() => {
                if (codesDialogRowId) {
                  updateRowCodes.mutate({ rowId: codesDialogRowId, codeIds: Array.from(selectedCodeIds) });
                }
              }}
              data-testid="button-save-codes"
            >
              Сохранить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClassifierCodeTree({
  code,
  allCodes,
  selectedIds,
  expandedIds,
  onToggleSelect,
  onToggleExpand,
  depth = 0,
}: {
  code: ClassifierCodeWithChildren;
  allCodes: ClassifierCodeWithChildren[];
  selectedIds: Set<number>;
  expandedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onToggleExpand: (id: number) => void;
  depth?: number;
}) {
  const children = allCodes.filter(c => c.parentId === code.id);
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(code.id);
  const isSelected = selectedIds.has(code.id);
  const isLeaf = code.type === "detail" || !hasChildren;

  return (
    <div className="space-y-1">
      <div 
        className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50"
        style={{ paddingLeft: depth * 16 + 8 }}
      >
        {hasChildren ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0"
            onClick={() => onToggleExpand(code.id)}
          >
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </Button>
        ) : (
          <div className="w-5 shrink-0" />
        )}
        {isLeaf && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(code.id)}
            data-testid={`checkbox-code-${code.id}`}
          />
        )}
        <span className="text-sm">
          <span className="font-sans text-xs text-muted-foreground mr-2">{code.cipher}</span>
          {code.name}
        </span>
      </div>
      {hasChildren && isExpanded && (
        <div>
          {children.map(child => (
            <ClassifierCodeTree
              key={child.id}
              code={child}
              allCodes={allCodes}
              selectedIds={selectedIds}
              expandedIds={expandedIds}
              onToggleSelect={onToggleSelect}
              onToggleExpand={onToggleExpand}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
