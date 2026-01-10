import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { 
  HardHat, 
  ArrowLeft, 
  ChevronUp,
  ChevronDown,
  Trash2,
  Eye,
  EyeOff,
  Plus,
  Copy
} from "lucide-react";
import type { ClassifierCode } from "@shared/schema";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useProjectContext } from "@/contexts/project-context";
import { useAuth } from "@/hooks/use-auth";

type CodeType = "article" | "zone" | "element" | "detail";

const TYPE_LABELS: Record<CodeType, string> = {
  article: "Статья",
  zone: "Зона",
  element: "Элемент",
  detail: "Деталь",
};

const TYPE_HIERARCHY: CodeType[] = ["article", "zone", "element", "detail"];

const TYPE_INDENT: Record<CodeType, number> = {
  article: 0,
  zone: 1,
  element: 2,
  detail: 3,
};

type ClassifierCodeWithChildren = ClassifierCode & {
  children: ClassifierCodeWithChildren[];
  fullCode: string;
};

function buildTree(codes: ClassifierCode[]): ClassifierCodeWithChildren[] {
  const codeMap = new Map<number, ClassifierCodeWithChildren>();
  const rootNodes: ClassifierCodeWithChildren[] = [];

  codes.forEach(code => {
    codeMap.set(code.id, { ...code, children: [], fullCode: "" });
  });

  codes.forEach(code => {
    const node = codeMap.get(code.id)!;
    if (code.parentId && codeMap.has(code.parentId)) {
      codeMap.get(code.parentId)!.children.push(node);
    } else {
      rootNodes.push(node);
    }
  });

  const computeFullCode = (node: ClassifierCodeWithChildren, parentFullCode: string) => {
    node.fullCode = parentFullCode ? `${parentFullCode}_${node.cipher}` : node.cipher;
    node.children.forEach(child => computeFullCode(child, node.fullCode));
  };

  rootNodes.forEach(root => computeFullCode(root, ""));

  const sortByOrder = (nodes: ClassifierCodeWithChildren[]) => {
    nodes.sort((a, b) => a.orderIndex - b.orderIndex || a.id - b.id);
    nodes.forEach(n => sortByOrder(n.children));
  };

  sortByOrder(rootNodes);
  return rootNodes;
}

function flattenTree(
  nodes: ClassifierCodeWithChildren[],
  collapsedCodes: Set<number>,
  eyeCollapsed: Set<number>
): ClassifierCodeWithChildren[] {
  const result: ClassifierCodeWithChildren[] = [];

  const traverse = (nodeList: ClassifierCodeWithChildren[], depth: number, parentCollapsed: boolean, grandparentEyeCollapsed: boolean) => {
    for (const node of nodeList) {
      if (parentCollapsed) continue;
      if (grandparentEyeCollapsed && depth >= 2) continue;
      
      result.push(node);
      
      const isCodeCollapsed = collapsedCodes.has(node.id);
      const isEyeCollapsed = eyeCollapsed.has(node.id);
      
      traverse(node.children, depth + 1, isCodeCollapsed, isEyeCollapsed);
    }
  };

  traverse(nodes, 0, false, false);
  return result;
}

export default function Codes() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { canEdit, isOwner, isAdmin: isProjectAdmin } = useProjectContext();
  
  const canEditCodes = user?.isAdmin || isOwner || isProjectAdmin || canEdit('codes');
  
  const [collapsedCodes, setCollapsedCodes] = useState<Set<number>>(new Set());
  const [eyeCollapsed, setEyeCollapsed] = useState<Set<number>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingCipher, setEditingCipher] = useState("");
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
  const [addTypePopoverOpen, setAddTypePopoverOpen] = useState<number | null>(null);

  const { data: codes = [], isLoading } = useQuery<ClassifierCode[]>({
    queryKey: ["/api/classifier-codes"],
  });

  const tree = useMemo(() => buildTree(codes), [codes]);
  const flatList = useMemo(() => flattenTree(tree, collapsedCodes, eyeCollapsed), [tree, collapsedCodes, eyeCollapsed]);

  const createCode = useMutation({
    mutationFn: async (data: { type: CodeType; name: string; cipher: string; parentId?: number }) => {
      return await apiRequest("POST", "/api/classifier-codes", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classifier-codes"] });
      toast({ title: "Код добавлен" });
    },
  });

  const updateCode = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<ClassifierCode> }) => {
      return await apiRequest("PUT", `/api/classifier-codes/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classifier-codes"] });
      setEditingId(null);
    },
  });

  const deleteCode = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/classifier-codes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classifier-codes"] });
      toast({ title: "Код удалён" });
    },
  });

  const reorderCode = useMutation({
    mutationFn: async ({ id, direction }: { id: number; direction: 'up' | 'down' }) => {
      return await apiRequest("POST", `/api/classifier-codes/${id}/reorder`, { direction });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classifier-codes"] });
    },
  });

  const toggleCodeCollapse = (id: number) => {
    setCollapsedCodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleEyeCollapse = (id: number) => {
    setEyeCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startEditing = (code: ClassifierCodeWithChildren) => {
    if (!canEditCodes) return;
    setEditingId(code.id);
    setEditingName(code.name);
    setEditingCipher(code.cipher);
  };

  const saveEditing = () => {
    if (editingId !== null) {
      updateCode.mutate({ id: editingId, updates: { name: editingName, cipher: editingCipher } });
    }
  };

  const handleAddCode = (insertAfterIndex: number, type: CodeType) => {
    const insertAfter = flatList[insertAfterIndex];
    
    let parentId: number | undefined;
    if (type === "article") {
      parentId = undefined;
    } else {
      const parentTypeIndex = TYPE_HIERARCHY.indexOf(type) - 1;
      const parentType = TYPE_HIERARCHY[parentTypeIndex];
      for (let i = insertAfterIndex; i >= 0; i--) {
        if (flatList[i].type === parentType) {
          parentId = flatList[i].id;
          break;
        }
      }
    }

    createCode.mutate({
      type,
      name: "...",
      cipher: "...",
      parentId,
    });
    setAddTypePopoverOpen(null);
  };

  const handleDuplicateRow = (code: ClassifierCodeWithChildren) => {
    createCode.mutate({
      type: code.type as CodeType,
      name: code.name,
      cipher: code.cipher + "_копия",
      parentId: code.parentId || undefined,
    });
  };

  const getAvailableTypes = (insertAfterIndex: number): CodeType[] => {
    if (insertAfterIndex < 0) return ["article"];
    
    const afterCode = flatList[insertAfterIndex];
    const afterTypeIndex = TYPE_HIERARCHY.indexOf(afterCode.type as CodeType);
    
    const available: CodeType[] = [];
    for (let i = 0; i <= afterTypeIndex + 1 && i < TYPE_HIERARCHY.length; i++) {
      available.push(TYPE_HIERARCHY[i]);
    }
    return available;
  };

  const hasChildren = useCallback((code: ClassifierCodeWithChildren) => {
    return code.children.length > 0;
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Skeleton className="h-10 w-64 mb-4" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <HardHat className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Коды классификатора</h1>
        </div>
      </header>

      <main className="p-4">
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="border border-border px-3 py-2 text-left font-medium text-sm w-[400px]">
                    Код классификатора
                  </th>
                  <th className="border border-border px-3 py-2 text-left font-medium text-sm w-[300px]">
                    Наименование
                  </th>
                  <th className="border border-border px-3 py-2 text-left font-medium text-sm w-[100px]">
                    Шифр
                  </th>
                  <th className="border border-border px-3 py-2 text-center font-medium text-sm w-[120px]">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                {flatList.length === 0 && (
                  <tr>
                    <td colSpan={4} className="border border-border px-3 py-8 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <span>Таблица пуста</span>
                        {canEditCodes && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => createCode.mutate({ type: "article", name: "...", cipher: "..." })}
                            data-testid="button-add-first-code"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Добавить статью
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                
                {flatList.map((code, index) => {
                  const indent = TYPE_INDENT[code.type as CodeType] * 24;
                  const isEditing = editingId === code.id;
                  const isCollapsed = collapsedCodes.has(code.id);
                  const isEyeCollapsedState = eyeCollapsed.has(code.id);
                  const showChildren = hasChildren(code);

                  return (
                    <>
                      <tr
                        key={code.id}
                        className={`hover:bg-muted/30 ${code.type === "article" ? "bg-primary/5 font-semibold" : ""}`}
                        onMouseEnter={() => setHoveredRowIndex(index)}
                        onMouseLeave={() => setHoveredRowIndex(null)}
                        data-testid={`row-code-${code.id}`}
                      >
                        <td className="border border-border px-3 py-2">
                          <div className="flex items-center gap-2" style={{ paddingLeft: indent }}>
                            {showChildren && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => toggleEyeCollapse(code.id)}
                                data-testid={`button-eye-${code.id}`}
                              >
                                {isEyeCollapsedState ? (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                            )}
                            <span
                              className={`cursor-pointer hover:text-primary ${showChildren ? "" : "ml-8"}`}
                              onClick={() => showChildren && toggleCodeCollapse(code.id)}
                              data-testid={`code-fullcode-${code.id}`}
                            >
                              {code.fullCode}
                              {showChildren && (
                                <span className="ml-1 text-muted-foreground">
                                  {isCollapsed ? "▶" : "▼"}
                                </span>
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="border border-border px-3 py-2">
                          {isEditing ? (
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onBlur={saveEditing}
                              onKeyDown={(e) => e.key === "Enter" && saveEditing()}
                              autoFocus
                              className="h-8"
                              data-testid={`input-name-${code.id}`}
                            />
                          ) : (
                            <span
                              className={`cursor-pointer hover:bg-muted/50 px-1 rounded ${code.type !== "article" ? "italic" : ""}`}
                              onClick={() => startEditing(code)}
                              data-testid={`text-name-${code.id}`}
                            >
                              {code.name}
                            </span>
                          )}
                        </td>
                        <td className="border border-border px-3 py-2">
                          {isEditing ? (
                            <Input
                              value={editingCipher}
                              onChange={(e) => setEditingCipher(e.target.value)}
                              onBlur={saveEditing}
                              onKeyDown={(e) => e.key === "Enter" && saveEditing()}
                              className="h-8"
                              data-testid={`input-cipher-${code.id}`}
                            />
                          ) : (
                            <span
                              className="cursor-pointer hover:bg-muted/50 px-1 rounded"
                              onClick={() => startEditing(code)}
                              data-testid={`text-cipher-${code.id}`}
                            >
                              {code.cipher}
                            </span>
                          )}
                        </td>
                        <td className="border border-border px-3 py-2">
                          {canEditCodes && (
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => reorderCode.mutate({ id: code.id, direction: 'up' })}
                                data-testid={`button-up-${code.id}`}
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => reorderCode.mutate({ id: code.id, direction: 'down' })}
                                data-testid={`button-down-${code.id}`}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => deleteCode.mutate(code.id)}
                                data-testid={`button-delete-${code.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                      
                      {canEditCodes && hoveredRowIndex === index && (
                        <tr key={`add-${code.id}`} className="h-0">
                          <td colSpan={4} className="p-0 border-0 relative">
                            <div className="absolute left-0 right-0 top-0 flex items-center justify-center h-6 -translate-y-3 z-10">
                              <div className="flex items-center gap-2">
                                <Popover 
                                  open={addTypePopoverOpen === index} 
                                  onOpenChange={(open) => setAddTypePopoverOpen(open ? index : null)}
                                >
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 opacity-50 hover:opacity-100 bg-background border border-border rounded-full"
                                      data-testid={`button-add-left-${index}`}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-40 p-1" align="start">
                                    {getAvailableTypes(index).map(type => (
                                      <Button
                                        key={type}
                                        variant="ghost"
                                        className="w-full justify-start text-sm"
                                        onClick={() => handleAddCode(index, type)}
                                        data-testid={`button-add-type-${type}`}
                                      >
                                        {TYPE_LABELS[type]}
                                      </Button>
                                    ))}
                                  </PopoverContent>
                                </Popover>
                                
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-50 hover:opacity-100 bg-background border border-border rounded-full"
                                  onClick={() => handleDuplicateRow(code)}
                                  data-testid={`button-duplicate-${index}`}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}
