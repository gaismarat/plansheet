import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { PriceChangeWithUser } from "@shared/schema";

const REASON_OPTIONS = [
  { value: "indexation", label: "Индексация" },
  { value: "material_change", label: "Замена материала" },
  { value: "other", label: "Другое" },
];

interface PriceHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId?: number;
  elementId?: number;
  priceType: "materials" | "smr";
  currentPrice: number;
  onPriceUpdated: (newPrice: number) => void;
  title: string;
}

export function PriceHistoryDialog({
  open,
  onOpenChange,
  groupId,
  elementId,
  priceType,
  currentPrice,
  onPriceUpdated,
  title,
}: PriceHistoryDialogProps) {
  const [newPrice, setNewPrice] = useState(currentPrice.toString());
  const [reason, setReason] = useState("indexation");
  const [customReason, setCustomReason] = useState("");

  const queryKey = groupId 
    ? ["/api/price-history", { groupId, priceType }]
    : ["/api/price-history", { elementId, priceType }];

  const { data: history = [] } = useQuery<PriceChangeWithUser[]>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({ priceType });
      if (groupId) params.append("groupId", groupId.toString());
      if (elementId) params.append("elementId", elementId.toString());
      const res = await fetch(`/api/price-history?${params}`, { credentials: "include" });
      return res.json();
    },
    enabled: open,
  });

  const createPriceChange = useMutation({
    mutationFn: async (data: { price: string; reason: string }) => {
      return await apiRequest("POST", "/api/price-changes", {
        groupId: groupId || null,
        elementId: elementId || null,
        priceType,
        price: data.price,
        reason: data.reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/price-history"] });
      onPriceUpdated(parseFloat(newPrice));
      onOpenChange(false);
    },
  });

  const initialPrice = history.length > 0 ? parseFloat(history[0].price) : currentPrice;

  const handleSave = () => {
    const finalReason = reason === "other" && customReason ? customReason : REASON_OPTIONS.find(r => r.value === reason)?.label || reason;
    createPriceChange.mutate({ price: newPrice, reason: finalReason });
  };

  const formatPriceDiff = (price: number) => {
    const diff = price - initialPrice;
    const percent = initialPrice !== 0 ? ((diff / initialPrice) * 100).toFixed(2) : "0.00";
    
    if (diff === 0) return null;
    
    const sign = diff > 0 ? "+" : "";
    const color = diff > 0 ? "text-red-500" : "text-green-500";
    
    return (
      <span className={color}>
        {sign}{diff.toFixed(2)} ₽ ({sign}{percent}%)
      </span>
    );
  };

  const newPriceNum = parseFloat(newPrice) || 0;
  const newPriceDiff = formatPriceDiff(newPriceNum);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[550px]" data-testid="dialog-price-history">
        <DialogHeader>
          <DialogTitle data-testid="text-price-history-title">{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b bg-muted/50">
                  <td className="px-3 py-2 font-medium">Начальная цена</td>
                  <td className="px-3 py-2 text-right font-sans min-w-[100px]">{initialPrice.toFixed(2)} ₽</td>
                  <td className="px-3 py-2"></td>
                  <td className="px-3 py-2"></td>
                </tr>
                
                {history.slice(1).map((change, idx) => {
                  const price = parseFloat(change.price);
                  return (
                    <tr key={change.id} className="border-b">
                      <td className="px-3 py-2 text-muted-foreground">
                        {change.createdAt ? format(new Date(change.createdAt), "dd.MM.yy", { locale: ru }) : ""}
                      </td>
                      <td className="px-3 py-2 text-right font-sans">{price.toFixed(2)} ₽</td>
                      <td className="px-3 py-2">{formatPriceDiff(price)}</td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">
                        {change.reason}
                        {change.user && <span className="ml-2 text-primary">{change.user.username}</span>}
                      </td>
                    </tr>
                  );
                })}
                
                <tr className="bg-muted/30">
                  <td className="px-3 py-2 font-medium">Текущая цена</td>
                  <td className="px-3 py-2 text-right font-sans font-bold">{currentPrice.toFixed(2)} ₽</td>
                  <td className="px-3 py-2">{formatPriceDiff(currentPrice)}</td>
                  <td className="px-3 py-2"></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Новая цена</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="font-sans"
                  data-testid="input-new-price"
                />
                <span className="text-sm text-muted-foreground">₽</span>
                {newPriceDiff && <span className="text-sm">{newPriceDiff}</span>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Причина изменения</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger data-testid="select-reason">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REASON_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} data-testid={`reason-option-${opt.value}`}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {reason === "other" && (
              <div className="space-y-1.5">
                <Label>Укажите причину</Label>
                <Input
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Введите причину..."
                  data-testid="input-custom-reason"
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-price"
          >
            Отмена
          </Button>
          <Button 
            onClick={handleSave}
            disabled={createPriceChange.isPending || (reason === "other" && !customReason)}
            data-testid="button-save-price"
          >
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
