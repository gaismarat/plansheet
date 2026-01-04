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
  Check
} from "lucide-react";
import * as XLSX from "xlsx";
import type { 
  PdcDocument, 
  PdcDocumentWithData, 
  PdcBlockWithSections,
  PdcSectionWithGroups,
  PdcGroupWithElements,
  PdcElement
} from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const UNIT_OPTIONS = ["шт.", "п.м", "м²", "м³", "кг", "компл."];

export default function PDC() {
  const { toast } = useToast();
  const [expandedDocuments, setExpandedDocuments] = useState<Set<number>>(new Set());
  const [expandedBlocks, setExpandedBlocks] = useState<Set<number>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [newDocName, setNewDocName] = useState("");
  const [showNewDocDialog, setShowNewDocDialog] = useState(false);
  const [editingHeaderDocId, setEditingHeaderDocId] = useState<number | null>(null);
  const [headerText, setHeaderText] = useState("");
  const [editingVatDocId, setEditingVatDocId] = useState<number | null>(null);
  const [vatRate, setVatRate] = useState("20");

  const { data: documents = [], isLoading } = useQuery<PdcDocument[]>({
    queryKey: ["/api/pdc-documents"],
  });

  const createDocument = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest("POST", "/api/pdc-documents", { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdc-documents"] });
      setShowNewDocDialog(false);
      setNewDocName("");
      toast({ title: "ПДЦ создан" });
    },
  });

  const updateDocument = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<PdcDocument> }) => {
      return await apiRequest("PUT", `/api/pdc-documents/${id}`, updates);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdc-documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pdc-documents", id] });
      setEditingHeaderDocId(null);
      setEditingVatDocId(null);
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/pdc-documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdc-documents"] });
      toast({ title: "ПДЦ удалён" });
    },
  });

  const toggleDocument = (docId: number) => {
    const newExpanded = new Set(expandedDocuments);
    if (newExpanded.has(docId)) {
      newExpanded.delete(docId);
    } else {
      newExpanded.add(docId);
    }
    setExpandedDocuments(newExpanded);
  };

  const formatRubles = (value: number): string => {
    return value.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₽";
  };

  const parseNumeric = (val: string | number | null | undefined): number => {
    if (val === null || val === undefined) return 0;
    return typeof val === 'string' ? parseFloat(val) || 0 : val;
  };

  const calculateGroupTotal = (group: PdcGroupWithElements): number => {
    const quantity = parseNumeric(group.quantity);
    const smrPnr = parseNumeric(group.smrPnrPrice);
    let groupSmrTotal = quantity * smrPnr;
    
    let elementsTotal = 0;
    for (const element of group.elements || []) {
      const coef = parseNumeric(element.consumptionCoef);
      const qty = parseNumeric(element.quantity);
      const materialPrice = parseNumeric(element.materialPrice);
      elementsTotal += coef * qty * materialPrice;
    }
    
    return groupSmrTotal + elementsTotal;
  };

  const calculateSectionTotal = (section: PdcSectionWithGroups): number => {
    let total = 0;
    for (const group of section.groups || []) {
      total += calculateGroupTotal(group);
    }
    return total;
  };

  const calculateBlockTotal = (block: PdcBlockWithSections): number => {
    let total = 0;
    for (const section of block.sections || []) {
      total += calculateSectionTotal(section);
    }
    return total;
  };

  const calculateDocumentTotal = (doc: PdcDocumentWithData): number => {
    let total = 0;
    for (const block of doc.blocks || []) {
      total += calculateBlockTotal(block);
    }
    return total;
  };

  if (isLoading) {
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
        <div className="px-4 md:px-6 h-16 flex items-center justify-between gap-2">
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
              ПДЦ
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showNewDocDialog} onOpenChange={setShowNewDocDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" data-testid="button-new-pdc">
                  <Plus className="w-4 h-4" />
                  Новый ПДЦ
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Создать ПДЦ</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input 
                    placeholder="Название ПДЦ"
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    data-testid="input-pdc-name"
                  />
                  <Button 
                    onClick={() => createDocument.mutate(newDocName)}
                    disabled={!newDocName.trim()}
                    data-testid="button-create-pdc"
                  >
                    Создать
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="px-4 md:px-6 py-8">
        {documents.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">Нет созданных ПДЦ</p>
            <Button onClick={() => setShowNewDocDialog(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Создать первый ПДЦ
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {documents.map(doc => (
              <PDCDocumentCard 
                key={doc.id} 
                document={doc}
                isExpanded={expandedDocuments.has(doc.id)}
                onToggle={() => toggleDocument(doc.id)}
                onDelete={() => deleteDocument.mutate(doc.id)}
                expandedBlocks={expandedBlocks}
                setExpandedBlocks={setExpandedBlocks}
                expandedSections={expandedSections}
                setExpandedSections={setExpandedSections}
                expandedGroups={expandedGroups}
                setExpandedGroups={setExpandedGroups}
                formatRubles={formatRubles}
                parseNumeric={parseNumeric}
                calculateBlockTotal={calculateBlockTotal}
                calculateSectionTotal={calculateSectionTotal}
                calculateGroupTotal={calculateGroupTotal}
                calculateDocumentTotal={calculateDocumentTotal}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

interface PDCDocumentCardProps {
  document: PdcDocument;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  expandedBlocks: Set<number>;
  setExpandedBlocks: React.Dispatch<React.SetStateAction<Set<number>>>;
  expandedSections: Set<number>;
  setExpandedSections: React.Dispatch<React.SetStateAction<Set<number>>>;
  expandedGroups: Set<number>;
  setExpandedGroups: React.Dispatch<React.SetStateAction<Set<number>>>;
  formatRubles: (value: number) => string;
  parseNumeric: (val: string | number | null | undefined) => number;
  calculateBlockTotal: (block: PdcBlockWithSections) => number;
  calculateSectionTotal: (section: PdcSectionWithGroups) => number;
  calculateGroupTotal: (group: PdcGroupWithElements) => number;
  calculateDocumentTotal: (doc: PdcDocumentWithData) => number;
}

function PDCDocumentCard({ 
  document, 
  isExpanded, 
  onToggle, 
  onDelete,
  expandedBlocks,
  setExpandedBlocks,
  expandedSections,
  setExpandedSections,
  expandedGroups,
  setExpandedGroups,
  formatRubles,
  parseNumeric,
  calculateBlockTotal,
  calculateSectionTotal,
  calculateGroupTotal,
  calculateDocumentTotal
}: PDCDocumentCardProps) {
  const { toast } = useToast();
  const [editingName, setEditingName] = useState(false);
  const [docName, setDocName] = useState(document.name);
  const [editingHeader, setEditingHeader] = useState(false);
  const [headerText, setHeaderText] = useState(document.headerText || "");
  const [editingVat, setEditingVat] = useState(false);
  const [vatRate, setVatRate] = useState(document.vatRate || "20");
  const [addBlockDialogOpen, setAddBlockDialogOpen] = useState(false);
  const [newBlockName, setNewBlockName] = useState("");

  const { data: documentData } = useQuery<PdcDocumentWithData>({
    queryKey: ["/api/pdc-documents", document.id],
    enabled: isExpanded,
  });

  const updateDocument = useMutation({
    mutationFn: async (updates: Partial<PdcDocument>) => {
      return await apiRequest("PUT", `/api/pdc-documents/${document.id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdc-documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pdc-documents", document.id] });
      setEditingName(false);
      setEditingHeader(false);
      setEditingVat(false);
    },
  });

  const reorderDocument = useMutation({
    mutationFn: async (direction: 'up' | 'down') => {
      return await apiRequest("PUT", `/api/pdc-documents/${document.id}/reorder`, { direction });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdc-documents"] });
    },
  });

  const createBlock = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest("POST", "/api/pdc-blocks", { documentId: document.id, name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdc-documents", document.id] });
      setAddBlockDialogOpen(false);
      setNewBlockName("");
      toast({ title: "Блок добавлен" });
    },
  });

  const total = documentData ? calculateDocumentTotal(documentData) : 0;
  const vat = parseNumeric(documentData?.vatRate || document.vatRate || "20");
  const totalWithVat = total * (1 + vat / 100);
  const vatAmount = total * (vat / 100);

  const toggleBlock = (blockId: number) => {
    const newExpanded = new Set(expandedBlocks);
    if (newExpanded.has(blockId)) {
      newExpanded.delete(blockId);
    } else {
      newExpanded.add(blockId);
      const block = (documentData?.blocks || []).find(b => b.id === blockId);
      if (block) {
        const newSections = new Set(expandedSections);
        const newGroups = new Set(expandedGroups);
        for (const section of block.sections || []) {
          newSections.add(section.id);
          for (const group of section.groups || []) {
            newGroups.add(group.id);
          }
        }
        setExpandedSections(newSections);
        setExpandedGroups(newGroups);
      }
    }
    setExpandedBlocks(newExpanded);
  };

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 group">
            <div className="flex items-center gap-3">
              {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              {editingName ? (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Input
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    className="h-8 text-lg font-semibold w-[300px]"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") updateDocument.mutate({ name: docName });
                      if (e.key === "Escape") setEditingName(false);
                    }}
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateDocument.mutate({ name: docName })}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingName(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <span className="font-semibold text-lg">{document.name}</span>
                  <div className="flex gap-1 invisible group-hover:visible" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingName(true); setDocName(document.name); }}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => reorderDocument.mutate('up')}>
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => reorderDocument.mutate('down')}>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right mr-[100px]">
                <div className="text-sm text-muted-foreground">Итого без НДС</div>
                <div className="font-mono font-semibold">{formatRubles(total)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Итого с НДС</div>
                <div className="font-mono font-semibold">{formatRubles(totalWithVat)}</div>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                className="text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                data-testid={`button-delete-pdc-${document.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border">
            <div className="flex justify-between items-start p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Dialog open={addBlockDialogOpen} onOpenChange={setAddBlockDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Plus className="w-4 h-4" />
                      Добавить блок
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Добавить блок</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input 
                        placeholder="Название блока"
                        value={newBlockName}
                        onChange={(e) => setNewBlockName(e.target.value)}
                      />
                      <Button 
                        onClick={() => createBlock.mutate(newBlockName)}
                        disabled={!newBlockName.trim()}
                      >
                        Добавить
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="text-right max-w-[400px]">
                {editingHeader ? (
                  <div className="flex gap-2 items-start">
                    <Textarea
                      value={headerText}
                      onChange={(e) => setHeaderText(e.target.value)}
                      className="text-xs text-right min-h-[80px]"
                    />
                    <div className="flex flex-col gap-1">
                      <Button size="icon" variant="ghost" onClick={() => updateDocument.mutate({ headerText })}>
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditingHeader(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="text-xs text-muted-foreground whitespace-pre-line cursor-pointer hover:bg-muted/50 p-2 rounded"
                    onClick={() => setEditingHeader(true)}
                  >
                    {document.headerText || "Нажмите для добавления текста шапки..."}
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <PDCTable 
                documentData={documentData}
                expandedBlocks={expandedBlocks}
                toggleBlock={toggleBlock}
                expandedSections={expandedSections}
                setExpandedSections={setExpandedSections}
                expandedGroups={expandedGroups}
                setExpandedGroups={setExpandedGroups}
                formatRubles={formatRubles}
                parseNumeric={parseNumeric}
                calculateBlockTotal={calculateBlockTotal}
                calculateSectionTotal={calculateSectionTotal}
                calculateGroupTotal={calculateGroupTotal}
              />
            </div>

            <div className="border-t border-border bg-muted/30 min-w-max">
              <div className="text-sm font-semibold px-3 py-2 border-b border-border">Итого по разделам:</div>
              {(documentData?.blocks || []).map((block, idx) => (
                <div key={block.id} className="flex items-stretch border-b border-border">
                  <div className="w-16 shrink-0 px-2 py-2 text-center text-sm">{idx + 1}</div>
                  <div className="flex-1 min-w-[170px] px-3 py-2 text-sm">{block.name}</div>
                  <div className="w-[100px] shrink-0 border-l border-border" />
                  <div className="w-[80px] shrink-0 border-l border-border" />
                  <div className="w-[80px] shrink-0 border-l border-border" />
                  <div className="w-[80px] shrink-0 border-l border-border" />
                  <div className="w-[100px] shrink-0 border-l border-border" />
                  <div className="w-[100px] shrink-0 border-l border-border" />
                  <div className="w-[130px] shrink-0 border-l border-border" />
                  <div className="w-[200px] shrink-0 border-l border-border px-2 py-2 text-right font-mono text-sm">
                    {formatRubles(calculateBlockTotal(block))}
                  </div>
                </div>
              ))}
              <div className="flex items-stretch border-b border-border font-semibold">
                <div className="w-16 shrink-0 px-2 py-2" />
                <div className="flex-1 min-w-[170px] px-3 py-2 text-sm">Общая стоимость работ, руб.</div>
                <div className="w-[100px] shrink-0 border-l border-border" />
                <div className="w-[80px] shrink-0 border-l border-border" />
                <div className="w-[80px] shrink-0 border-l border-border" />
                <div className="w-[80px] shrink-0 border-l border-border" />
                <div className="w-[100px] shrink-0 border-l border-border" />
                <div className="w-[100px] shrink-0 border-l border-border" />
                <div className="w-[130px] shrink-0 border-l border-border" />
                <div className="w-[200px] shrink-0 border-l border-border px-2 py-2 text-right font-mono text-sm">
                  {formatRubles(total)}
                </div>
              </div>
              <div className="flex items-stretch border-b border-border font-semibold">
                <div className="w-16 shrink-0 px-2 py-2" />
                <div className="flex-1 min-w-[170px] px-3 py-2 text-sm">Общая стоимость работ, руб. с НДС</div>
                <div className="w-[100px] shrink-0 border-l border-border" />
                <div className="w-[80px] shrink-0 border-l border-border" />
                <div className="w-[80px] shrink-0 border-l border-border" />
                <div className="w-[80px] shrink-0 border-l border-border" />
                <div className="w-[100px] shrink-0 border-l border-border" />
                <div className="w-[100px] shrink-0 border-l border-border" />
                <div className="w-[130px] shrink-0 border-l border-border" />
                <div className="w-[200px] shrink-0 border-l border-border px-2 py-2 text-right font-mono text-sm">
                  {formatRubles(totalWithVat)}
                </div>
              </div>
              <div className="flex items-stretch">
                <div className="w-16 shrink-0 px-2 py-2" />
                <div className="flex-1 min-w-[170px] px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                  в т.ч. НДС
                  {editingVat ? (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Input 
                        value={vatRate}
                        onChange={(e) => setVatRate(e.target.value)}
                        className="w-20 h-7 text-right"
                        type="number"
                      />
                      <span>%</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateDocument.mutate({ vatRate })}>
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingVat(false)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 cursor-pointer hover:bg-muted/50 px-2 py-1 rounded" onClick={() => setEditingVat(true)}>
                      <span>{vat}%</span>
                      <Pencil className="w-3 h-3 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="w-[100px] shrink-0 border-l border-border" />
                <div className="w-[80px] shrink-0 border-l border-border" />
                <div className="w-[80px] shrink-0 border-l border-border" />
                <div className="w-[80px] shrink-0 border-l border-border" />
                <div className="w-[100px] shrink-0 border-l border-border" />
                <div className="w-[100px] shrink-0 border-l border-border" />
                <div className="w-[130px] shrink-0 border-l border-border" />
                <div className="w-[200px] shrink-0 border-l border-border px-2 py-2 text-right font-mono text-sm">
                  {formatRubles(vatAmount)}
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

interface PDCTableProps {
  documentData: PdcDocumentWithData | undefined;
  expandedBlocks: Set<number>;
  toggleBlock: (blockId: number) => void;
  expandedSections: Set<number>;
  setExpandedSections: React.Dispatch<React.SetStateAction<Set<number>>>;
  expandedGroups: Set<number>;
  setExpandedGroups: React.Dispatch<React.SetStateAction<Set<number>>>;
  formatRubles: (value: number) => string;
  parseNumeric: (val: string | number | null | undefined) => number;
  calculateBlockTotal: (block: PdcBlockWithSections) => number;
  calculateSectionTotal: (section: PdcSectionWithGroups) => number;
  calculateGroupTotal: (group: PdcGroupWithElements) => number;
}

function PDCTable({
  documentData,
  expandedBlocks,
  toggleBlock,
  expandedSections,
  setExpandedSections,
  expandedGroups,
  setExpandedGroups,
  formatRubles,
  parseNumeric,
  calculateBlockTotal,
  calculateSectionTotal,
  calculateGroupTotal
}: PDCTableProps) {
  const { toast } = useToast();

  const toggleSection = (sectionId: number) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const toggleGroup = (groupId: number) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  if (!documentData) {
    return <div className="p-4"><Skeleton className="h-40 w-full" /></div>;
  }

  const blocks = documentData.blocks || [];

  return (
    <div className="min-w-max">
      <div className="flex flex-col border-b border-border bg-muted/50 font-semibold text-xs">
        <div className="flex items-stretch">
          <div className="w-16 shrink-0 border-r border-border" />
          <div className="flex-1 min-w-[170px] border-r border-border" />
          <div className="w-[100px] shrink-0 border-r border-border" />
          <div className="w-[80px] shrink-0 border-r border-border" />
          <div className="w-[80px] shrink-0 border-r border-border" />
          <div className="w-[80px] shrink-0 border-r border-border" />
          <div className="w-[200px] shrink-0 border-x border-border border-b px-2 py-1 text-center">
            Цена за ед., руб. с НДС
          </div>
          <div className="w-[130px] shrink-0 border-r border-border" />
          <div className="w-[200px] shrink-0" />
        </div>
        <div className="flex items-stretch">
          <div className="w-16 shrink-0 px-2 py-2 flex items-center justify-center border-r border-border">№ п/п</div>
          <div className="flex-1 min-w-[170px] px-3 py-2 flex items-center justify-center border-r border-border">Наименование затрат</div>
          <div className="w-[100px] shrink-0 border-r border-border px-2 py-2 flex items-center justify-center">Примечание</div>
          <div className="w-[80px] shrink-0 border-r border-border px-2 py-2 flex items-center justify-center">Ед. изм.</div>
          <div className="w-[80px] shrink-0 border-r border-border px-2 py-2 flex items-center justify-center">Коэф.</div>
          <div className="w-[80px] shrink-0 border-r border-border px-2 py-2 flex items-center justify-center">Кол-во</div>
          <div className="w-[100px] shrink-0 border-r border-border px-2 py-2 flex items-center justify-center">Материалы</div>
          <div className="w-[100px] shrink-0 border-r border-border px-2 py-2 flex items-center justify-center">СМР, ПНР</div>
          <div className="w-[130px] shrink-0 border-r border-border px-2 py-2 flex items-center justify-center">Цена с НДС</div>
          <div className="w-[200px] shrink-0 px-2 py-2 flex items-center justify-center">Стоимость</div>
        </div>
      </div>

      {blocks.map((block, blockIdx) => (
        <PDCBlockRow 
          key={block.id}
          block={block}
          blockIdx={blockIdx}
          isExpanded={expandedBlocks.has(block.id)}
          onToggle={() => toggleBlock(block.id)}
          expandedSections={expandedSections}
          toggleSection={toggleSection}
          expandedGroups={expandedGroups}
          toggleGroup={toggleGroup}
          formatRubles={formatRubles}
          parseNumeric={parseNumeric}
          calculateBlockTotal={calculateBlockTotal}
          calculateSectionTotal={calculateSectionTotal}
          calculateGroupTotal={calculateGroupTotal}
          documentId={documentData.id}
        />
      ))}
    </div>
  );
}

interface PDCBlockRowProps {
  block: PdcBlockWithSections;
  blockIdx: number;
  isExpanded: boolean;
  onToggle: () => void;
  expandedSections: Set<number>;
  toggleSection: (sectionId: number) => void;
  expandedGroups: Set<number>;
  toggleGroup: (groupId: number) => void;
  formatRubles: (value: number) => string;
  parseNumeric: (val: string | number | null | undefined) => number;
  calculateBlockTotal: (block: PdcBlockWithSections) => number;
  calculateSectionTotal: (section: PdcSectionWithGroups) => number;
  calculateGroupTotal: (group: PdcGroupWithElements) => number;
  documentId: number;
}

function PDCBlockRow({
  block,
  blockIdx,
  isExpanded,
  onToggle,
  expandedSections,
  toggleSection,
  expandedGroups,
  toggleGroup,
  formatRubles,
  parseNumeric,
  calculateBlockTotal,
  calculateSectionTotal,
  calculateGroupTotal,
  documentId
}: PDCBlockRowProps) {
  const { toast } = useToast();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(block.name);
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");

  const updateBlock = useMutation({
    mutationFn: async (updates: { name?: string }) => {
      return await apiRequest("PUT", `/api/pdc-blocks/${block.id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdc-documents", documentId] });
      setEditingName(false);
    },
  });

  const deleteBlock = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/pdc-blocks/${block.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdc-documents", documentId] });
      toast({ title: "Блок удалён" });
    },
  });

  const reorderBlock = useMutation({
    mutationFn: async (direction: 'up' | 'down') => {
      return await apiRequest("PUT", `/api/pdc-blocks/${block.id}/reorder`, { direction });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdc-documents", documentId] });
    },
  });

  const createSection = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest("POST", "/api/pdc-sections", { blockId: block.id, name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdc-documents", documentId] });
      setAddSectionOpen(false);
      setNewSectionName("");
      toast({ title: "Раздел добавлен" });
    },
  });

  const blockNumber = blockIdx + 1;
  const blockTotal = calculateBlockTotal(block);

  return (
    <>
      <div className="flex items-stretch border-b border-border bg-[#F2F4F7] dark:bg-muted/40 group">
        <div className="w-16 shrink-0 px-2 py-2 flex items-center justify-center font-bold">
          {blockNumber}
        </div>
        <div 
          className="flex-1 min-w-[170px] flex items-center gap-2 px-3 py-2 cursor-pointer"
          onClick={onToggle}
        >
          {isExpanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
          {editingName ? (
            <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-7 text-sm flex-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") updateBlock.mutate({ name });
                  if (e.key === "Escape") setEditingName(false);
                }}
              />
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateBlock.mutate({ name })}>
                <Check className="w-3 h-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingName(false)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <>
              <span className="text-sm font-bold uppercase whitespace-pre-wrap break-words flex-1">{block.name}</span>
              <div className="flex gap-1 shrink-0 invisible group-hover:visible">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setEditingName(true); setName(block.name); }}>
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); reorderBlock.mutate('up'); }}>
                  <ChevronUp className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); reorderBlock.mutate('down'); }}>
                  <ChevronDown className="w-3 h-3" />
                </Button>
                <Dialog open={addSectionOpen} onOpenChange={setAddSectionOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent onClick={(e) => e.stopPropagation()}>
                    <DialogHeader>
                      <DialogTitle>Добавить раздел</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input 
                        placeholder="Название раздела"
                        value={newSectionName}
                        onChange={(e) => setNewSectionName(e.target.value)}
                      />
                      <Button onClick={() => createSection.mutate(newSectionName)} disabled={!newSectionName.trim()}>
                        Добавить
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); deleteBlock.mutate(); }}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </>
          )}
        </div>
        <div className="w-[100px] shrink-0 border-l border-border" />
        <div className="w-[80px] shrink-0 border-l border-border" />
        <div className="w-[80px] shrink-0 border-l border-border" />
        <div className="w-[80px] shrink-0 border-l border-border" />
        <div className="w-[100px] shrink-0 border-l border-border" />
        <div className="w-[100px] shrink-0 border-l border-border" />
        <div className="w-[130px] shrink-0 border-l border-border" />
        <div className="w-[200px] shrink-0 border-l border-border px-2 py-2 text-right font-mono font-semibold">
          {formatRubles(blockTotal)}
        </div>
      </div>

      {isExpanded && (block.sections || []).map((section, sectionIdx) => (
        <PDCSectionRow 
          key={section.id}
          section={section}
          blockNumber={blockNumber}
          sectionIdx={sectionIdx}
          isExpanded={expandedSections.has(section.id)}
          onToggle={() => toggleSection(section.id)}
          expandedGroups={expandedGroups}
          toggleGroup={toggleGroup}
          formatRubles={formatRubles}
          parseNumeric={parseNumeric}
          calculateSectionTotal={calculateSectionTotal}
          calculateGroupTotal={calculateGroupTotal}
          documentId={documentId}
        />
      ))}
    </>
  );
}

interface PDCSectionRowProps {
  section: PdcSectionWithGroups;
  blockNumber: number;
  sectionIdx: number;
  isExpanded: boolean;
  onToggle: () => void;
  expandedGroups: Set<number>;
  toggleGroup: (groupId: number) => void;
  formatRubles: (value: number) => string;
  parseNumeric: (val: string | number | null | undefined) => number;
  calculateSectionTotal: (section: PdcSectionWithGroups) => number;
  calculateGroupTotal: (group: PdcGroupWithElements) => number;
  documentId: number;
}

function PDCSectionRow({
  section,
  blockNumber,
  sectionIdx,
  isExpanded,
  onToggle,
  expandedGroups,
  toggleGroup,
  formatRubles,
  parseNumeric,
  calculateSectionTotal,
  calculateGroupTotal,
  documentId
}: PDCSectionRowProps) {
  const { toast } = useToast();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(section.name);
  const [editingDescription, setEditingDescription] = useState(false);
  const [description, setDescription] = useState(section.description || "");
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const updateSection = useMutation({
    mutationFn: async (updates: { name?: string; description?: string }) => {
      return await apiRequest("PUT", `/api/pdc-sections/${section.id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdc-documents", documentId] });
      setEditingName(false);
      setEditingDescription(false);
    },
  });

  const deleteSection = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/pdc-sections/${section.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdc-documents", documentId] });
      toast({ title: "Раздел удалён" });
    },
  });

  const reorderSection = useMutation({
    mutationFn: async (direction: 'up' | 'down') => {
      return await apiRequest("PUT", `/api/pdc-sections/${section.id}/reorder`, { direction });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdc-documents", documentId] });
    },
  });

  const createGroup = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest("POST", "/api/pdc-groups", { sectionId: section.id, name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdc-documents", documentId] });
      setAddGroupOpen(false);
      setNewGroupName("");
      toast({ title: "Группа добавлена" });
    },
  });

  const sectionNumber = `${blockNumber}.${sectionIdx + 1}`;
  const sectionTotal = calculateSectionTotal(section);

  return (
    <>
      <div className="flex items-stretch border-b border-border group">
        <div className="w-16 shrink-0 px-2 py-2 flex items-center justify-center text-sm">
          {sectionNumber}
        </div>
        <div 
          className="flex-1 min-w-[170px] flex gap-2 pl-6 pr-3 py-2 cursor-pointer border-l border-border"
          onClick={onToggle}
        >
          <div className="w-1 self-stretch bg-primary rounded-sm shrink-0" />
          <div className="flex flex-col flex-1 gap-0.5 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-7 text-sm flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") updateSection.mutate({ name });
                    if (e.key === "Escape") setEditingName(false);
                  }}
                />
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateSection.mutate({ name })}>
                  <Check className="w-3 h-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingName(false)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-start gap-1">
                <span className="text-sm font-semibold whitespace-pre-wrap break-words flex-1">{section.name}</span>
                <div className="flex gap-1 shrink-0 invisible group-hover:visible">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setEditingName(true); setName(section.name); }}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); reorderSection.mutate('up'); }}>
                    <ChevronUp className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); reorderSection.mutate('down'); }}>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                  <Dialog open={addGroupOpen} onOpenChange={setAddGroupOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent onClick={(e) => e.stopPropagation()}>
                      <DialogHeader>
                        <DialogTitle>Добавить группу</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Input 
                          placeholder="Название группы"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                        />
                        <Button onClick={() => createGroup.mutate(newGroupName)} disabled={!newGroupName.trim()}>
                          Добавить
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); deleteSection.mutate(); }}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
            {editingDescription ? (
              <div className="flex items-start gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[40px] w-[560px] text-xs italic resize-none text-right"
                  placeholder="Примечание..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setEditingDescription(false);
                  }}
                />
                <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => updateSection.mutate({ description })}>
                  <Check className="w-3 h-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setEditingDescription(false)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div 
                className="text-[11px] italic text-muted-foreground cursor-pointer hover:bg-muted/30 rounded px-1 ml-auto w-[560px] text-right whitespace-pre-wrap break-words"
                onClick={(e) => { e.stopPropagation(); setEditingDescription(true); setDescription(section.description || ""); }}
              >
                {section.description || <span className="invisible group-hover:visible">+ примечание</span>}
              </div>
            )}
          </div>
        </div>
        <div className="w-[100px] shrink-0 border-l border-border" />
        <div className="w-[80px] shrink-0 border-l border-border" />
        <div className="w-[80px] shrink-0 border-l border-border" />
        <div className="w-[80px] shrink-0 border-l border-border" />
        <div className="w-[100px] shrink-0 border-l border-border" />
        <div className="w-[100px] shrink-0 border-l border-border" />
        <div className="w-[130px] shrink-0 border-l border-border" />
        <div className="w-[200px] shrink-0 border-l border-border px-2 py-2 text-right font-mono">
          {formatRubles(sectionTotal)}
        </div>
      </div>

      {isExpanded && (section.groups || []).map((group, groupIdx) => (
        <PDCGroupRow 
          key={group.id}
          group={group}
          sectionNumber={sectionNumber}
          groupIdx={groupIdx}
          isExpanded={expandedGroups.has(group.id)}
          onToggle={() => toggleGroup(group.id)}
          formatRubles={formatRubles}
          parseNumeric={parseNumeric}
          calculateGroupTotal={calculateGroupTotal}
          documentId={documentId}
        />
      ))}
    </>
  );
}

interface PDCGroupRowProps {
  group: PdcGroupWithElements;
  sectionNumber: string;
  groupIdx: number;
  isExpanded: boolean;
  onToggle: () => void;
  formatRubles: (value: number) => string;
  parseNumeric: (val: string | number | null | undefined) => number;
  calculateGroupTotal: (group: PdcGroupWithElements) => number;
  documentId: number;
}

function PDCGroupRow({
  group,
  sectionNumber,
  groupIdx,
  isExpanded,
  onToggle,
  formatRubles,
  parseNumeric,
  calculateGroupTotal,
  documentId
}: PDCGroupRowProps) {
  const { toast } = useToast();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(group.name);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValue, setFieldValue] = useState("");
  const [addElementOpen, setAddElementOpen] = useState(false);
  const [newElementName, setNewElementName] = useState("");

  const updateGroup = useMutation({
    mutationFn: async (updates: Partial<typeof group>) => {
      return await apiRequest("PUT", `/api/pdc-groups/${group.id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdc-documents", documentId] });
      setEditingName(false);
      setEditingField(null);
    },
  });

  const deleteGroup = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/pdc-groups/${group.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdc-documents", documentId] });
      toast({ title: "Группа удалена" });
    },
  });

  const reorderGroup = useMutation({
    mutationFn: async (direction: 'up' | 'down') => {
      return await apiRequest("PUT", `/api/pdc-groups/${group.id}/reorder`, { direction });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdc-documents", documentId] });
    },
  });

  const createElement = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest("POST", "/api/pdc-elements", { groupId: group.id, name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdc-documents", documentId] });
      setAddElementOpen(false);
      setNewElementName("");
      toast({ title: "Элемент добавлен" });
    },
  });

  const groupNumber = `${sectionNumber}.${groupIdx + 1}`;
  const quantity = parseNumeric(group.quantity);
  const smrPnr = parseNumeric(group.smrPnrPrice);
  const groupSmrTotal = quantity * smrPnr;
  const groupTotal = calculateGroupTotal(group);

  const handleFieldClick = (field: string, currentValue: string | number | null | undefined) => {
    setEditingField(field);
    setFieldValue(String(parseNumeric(currentValue)));
  };

  const handleFieldSave = (field: string) => {
    const numValue = parseFloat(fieldValue) || 0;
    updateGroup.mutate({ [field]: numValue.toString() });
  };

  return (
    <>
      <div className="flex items-stretch border-b border-border group">
        <div className="w-16 shrink-0 px-2 py-2 flex items-center justify-center text-xs">
          {groupNumber}
        </div>
        <div 
          className="flex-1 min-w-[170px] flex items-center gap-2 pl-9 pr-3 py-2 cursor-pointer"
          onClick={onToggle}
        >
          {editingName ? (
            <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-7 text-sm flex-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") updateGroup.mutate({ name });
                  if (e.key === "Escape") setEditingName(false);
                }}
              />
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateGroup.mutate({ name })}>
                <Check className="w-3 h-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingName(false)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <>
              <span className="text-sm font-medium whitespace-pre-wrap break-words flex-1">{group.name}</span>
              <div className="flex gap-1 shrink-0 invisible group-hover:visible">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setEditingName(true); setName(group.name); }}>
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); reorderGroup.mutate('up'); }}>
                  <ChevronUp className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); reorderGroup.mutate('down'); }}>
                  <ChevronDown className="w-3 h-3" />
                </Button>
                <Dialog open={addElementOpen} onOpenChange={setAddElementOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent onClick={(e) => e.stopPropagation()}>
                    <DialogHeader>
                      <DialogTitle>Добавить элемент</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input 
                        placeholder="Название элемента"
                        value={newElementName}
                        onChange={(e) => setNewElementName(e.target.value)}
                      />
                      <Button onClick={() => createElement.mutate(newElementName)} disabled={!newElementName.trim()}>
                        Добавить
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); deleteGroup.mutate(); }}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </>
          )}
        </div>
        <div className="w-[100px] shrink-0 border-l border-border" />
        <div className="w-[80px] shrink-0 border-l border-border px-1 py-1 flex items-center justify-center">
          <Select value={group.unit || "шт."} onValueChange={(val) => updateGroup.mutate({ unit: val })}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNIT_OPTIONS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-[80px] shrink-0 border-l border-border" />
        <div 
          className="w-[80px] shrink-0 border-l border-border px-2 py-2 text-right text-xs cursor-pointer hover:bg-muted/50"
          onClick={(e) => { e.stopPropagation(); handleFieldClick('quantity', group.quantity); }}
        >
          {editingField === 'quantity' ? (
            <Input 
              value={fieldValue}
              onChange={(e) => setFieldValue(e.target.value)}
              className="h-6 text-xs text-right"
              autoFocus
              onBlur={() => handleFieldSave('quantity')}
              onKeyDown={(e) => { if (e.key === 'Enter') handleFieldSave('quantity'); if (e.key === 'Escape') setEditingField(null); }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            quantity.toFixed(2)
          )}
        </div>
        <div className="w-[100px] shrink-0 border-l border-border" />
        <div 
          className="w-[100px] shrink-0 border-l border-border px-2 py-2 text-right text-xs cursor-pointer hover:bg-muted/50"
          onClick={(e) => { e.stopPropagation(); handleFieldClick('smrPnrPrice', group.smrPnrPrice); }}
        >
          {editingField === 'smrPnrPrice' ? (
            <Input 
              value={fieldValue}
              onChange={(e) => setFieldValue(e.target.value)}
              className="h-6 text-xs text-right"
              autoFocus
              onBlur={() => handleFieldSave('smrPnrPrice')}
              onKeyDown={(e) => { if (e.key === 'Enter') handleFieldSave('smrPnrPrice'); if (e.key === 'Escape') setEditingField(null); }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            formatRubles(smrPnr)
          )}
        </div>
        <div className="w-[130px] shrink-0 border-l border-border px-2 py-2 text-right text-xs font-mono">
          {formatRubles(groupSmrTotal)}
        </div>
        <div className="w-[200px] shrink-0 border-l border-border px-2 py-2 text-right font-mono text-xs">
          {formatRubles(groupTotal)}
        </div>
      </div>

      {isExpanded && (group.elements || []).map((element, elementIdx) => (
        <PDCElementRow 
          key={element.id}
          element={element}
          groupNumber={groupNumber}
          elementIdx={elementIdx}
          formatRubles={formatRubles}
          parseNumeric={parseNumeric}
          documentId={documentId}
        />
      ))}
    </>
  );
}

interface PDCElementRowProps {
  element: PdcElement;
  groupNumber: string;
  elementIdx: number;
  formatRubles: (value: number) => string;
  parseNumeric: (val: string | number | null | undefined) => number;
  documentId: number;
}

function PDCElementRow({
  element,
  groupNumber,
  elementIdx,
  formatRubles,
  parseNumeric,
  documentId
}: PDCElementRowProps) {
  const { toast } = useToast();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(element.name);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValue, setFieldValue] = useState("");

  const updateElement = useMutation({
    mutationFn: async (updates: Partial<typeof element>) => {
      return await apiRequest("PUT", `/api/pdc-elements/${element.id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdc-documents", documentId] });
      setEditingName(false);
      setEditingField(null);
    },
  });

  const deleteElement = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/pdc-elements/${element.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdc-documents", documentId] });
      toast({ title: "Элемент удалён" });
    },
  });

  const reorderElement = useMutation({
    mutationFn: async (direction: 'up' | 'down') => {
      return await apiRequest("PUT", `/api/pdc-elements/${element.id}/reorder`, { direction });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdc-documents", documentId] });
    },
  });

  const elementNumber = `${groupNumber}.${elementIdx + 1}`;
  const coef = parseNumeric(element.consumptionCoef);
  const quantity = parseNumeric(element.quantity);
  const materialPrice = parseNumeric(element.materialPrice);
  const elementTotal = coef * quantity * materialPrice;

  const handleFieldClick = (field: string, currentValue: string | number | null | undefined) => {
    setEditingField(field);
    setFieldValue(String(parseNumeric(currentValue)));
  };

  const handleFieldSave = (field: string) => {
    const numValue = parseFloat(fieldValue) || 0;
    updateElement.mutate({ [field]: numValue.toString() });
  };

  return (
    <div className="flex items-stretch border-b border-border group hover:bg-muted/20">
      <div className="w-16 shrink-0 px-2 py-2 flex items-center justify-center text-xs">
        {elementNumber}
      </div>
      <div className="flex-1 min-w-[170px] flex items-center gap-2 pl-12 pr-3 py-2">
        {editingName ? (
          <div className="flex items-center gap-1 flex-1 justify-end">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-7 text-sm flex-1 text-right italic"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") updateElement.mutate({ name });
                if (e.key === "Escape") setEditingName(false);
              }}
            />
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateElement.mutate({ name })}>
              <Check className="w-3 h-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingName(false)}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <>
            <span className="text-sm italic whitespace-pre-wrap break-words flex-1">{element.name}</span>
            <div className="flex gap-1 shrink-0 invisible group-hover:visible">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingName(true); setName(element.name); }}>
                <Pencil className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => reorderElement.mutate('up')}>
                <ChevronUp className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => reorderElement.mutate('down')}>
                <ChevronDown className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteElement.mutate()}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </>
        )}
      </div>
      <div 
        className="w-[100px] shrink-0 border-l border-border px-2 py-2 text-xs cursor-pointer hover:bg-muted/50"
        onClick={() => handleFieldClick('note', element.note)}
      >
        {editingField === 'note' ? (
          <Input 
            value={fieldValue}
            onChange={(e) => setFieldValue(e.target.value)}
            className="h-6 text-xs"
            autoFocus
            onBlur={() => updateElement.mutate({ note: fieldValue })}
            onKeyDown={(e) => { if (e.key === 'Enter') updateElement.mutate({ note: fieldValue }); if (e.key === 'Escape') setEditingField(null); }}
          />
        ) : (
          <span className="text-muted-foreground">{element.note || ""}</span>
        )}
      </div>
      <div className="w-[80px] shrink-0 border-l border-border px-1 py-1 flex items-center justify-center">
        <Select value={element.unit || "шт."} onValueChange={(val) => updateElement.mutate({ unit: val })}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UNIT_OPTIONS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div 
        className="w-[80px] shrink-0 border-l border-border px-2 py-2 text-right text-xs cursor-pointer hover:bg-muted/50"
        onClick={() => handleFieldClick('consumptionCoef', element.consumptionCoef)}
      >
        {editingField === 'consumptionCoef' ? (
          <Input 
            value={fieldValue}
            onChange={(e) => setFieldValue(e.target.value)}
            className="h-6 text-xs text-right"
            autoFocus
            onBlur={() => handleFieldSave('consumptionCoef')}
            onKeyDown={(e) => { if (e.key === 'Enter') handleFieldSave('consumptionCoef'); if (e.key === 'Escape') setEditingField(null); }}
          />
        ) : (
          coef.toFixed(2)
        )}
      </div>
      <div 
        className="w-[80px] shrink-0 border-l border-border px-2 py-2 text-right text-xs cursor-pointer hover:bg-muted/50"
        onClick={() => handleFieldClick('quantity', element.quantity)}
      >
        {editingField === 'quantity' ? (
          <Input 
            value={fieldValue}
            onChange={(e) => setFieldValue(e.target.value)}
            className="h-6 text-xs text-right"
            autoFocus
            onBlur={() => handleFieldSave('quantity')}
            onKeyDown={(e) => { if (e.key === 'Enter') handleFieldSave('quantity'); if (e.key === 'Escape') setEditingField(null); }}
          />
        ) : (
          quantity.toFixed(2)
        )}
      </div>
      <div 
        className="w-[100px] shrink-0 border-l border-border px-2 py-2 text-right text-xs cursor-pointer hover:bg-muted/50"
        onClick={() => handleFieldClick('materialPrice', element.materialPrice)}
      >
        {editingField === 'materialPrice' ? (
          <Input 
            value={fieldValue}
            onChange={(e) => setFieldValue(e.target.value)}
            className="h-6 text-xs text-right"
            autoFocus
            onBlur={() => handleFieldSave('materialPrice')}
            onKeyDown={(e) => { if (e.key === 'Enter') handleFieldSave('materialPrice'); if (e.key === 'Escape') setEditingField(null); }}
          />
        ) : (
          formatRubles(materialPrice)
        )}
      </div>
      <div className="w-[100px] shrink-0 border-l border-border" />
      <div className="w-[130px] shrink-0 border-l border-border px-2 py-2 text-right text-xs font-mono">
        {formatRubles(elementTotal)}
      </div>
      <div className="w-[200px] shrink-0 border-l border-border" />
    </div>
  );
}
