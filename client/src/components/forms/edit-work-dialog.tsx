import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUpdateWork } from "@/hooks/use-construction";
import { type Work } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Edit2 } from "lucide-react";

const editWorkFormSchema = z.object({
  plannedPeople: z.coerce.number().min(0).max(9999),
  volumeActual: z.coerce.number().min(0),
});

type EditWorkFormValues = z.infer<typeof editWorkFormSchema>;

interface EditWorkDialogProps {
  work: Work;
}

export function EditWorkDialog({ work }: EditWorkDialogProps) {
  const [open, setOpen] = useState(false);
  const { mutate, isPending } = useUpdateWork();

  const form = useForm<EditWorkFormValues>({
    resolver: zodResolver(editWorkFormSchema),
    defaultValues: {
      plannedPeople: work.plannedPeople ?? 0,
      volumeActual: work.volumeActual ?? 0,
    },
  });

  function onSubmit(values: EditWorkFormValues) {
    mutate({ 
      id: work.id, 
      plannedPeople: values.plannedPeople,
      volumeActual: values.volumeActual,
    }, {
      onSuccess: () => {
        setOpen(false);
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          title="Редактировать работу"
          data-testid={`button-edit-work-${work.id}`}
        >
          <Edit2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Редактировать работу</DialogTitle>
          <DialogDescription>
            Измените детали строительной работы.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormItem>
              <FormLabel>Название работы</FormLabel>
              <FormControl>
                <Input 
                  value={work.name} 
                  disabled 
                  className="bg-muted cursor-not-allowed"
                  data-testid={`input-work-name-${work.id}`}
                />
              </FormControl>
            </FormItem>

            <FormField
              control={form.control}
              name="plannedPeople"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Людей (план)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      max="9999"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      data-testid={`input-planned-people-${work.id}`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="volumeActual"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Объём (факт)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.1" 
                      min="0"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      data-testid={`input-volume-actual-${work.id}`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-muted/30 p-3 rounded-md space-y-2">
              <p className="text-xs text-muted-foreground">
                Даты редактируются на странице КСП (Гантт)
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">План начало</p>
                  <p className="text-sm" data-testid={`text-plan-start-${work.id}`}>
                    {work.planStartDate || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">План конец</p>
                  <p className="text-sm" data-testid={`text-plan-end-${work.id}`}>
                    {work.planEndDate || "—"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Факт начало</p>
                  <p className="text-sm" data-testid={`text-actual-start-${work.id}`}>
                    {work.actualStartDate || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Факт конец</p>
                  <p className="text-sm" data-testid={`text-actual-end-${work.id}`}>
                    {work.actualEndDate || "—"}
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button 
                type="submit" 
                disabled={isPending}
                data-testid={`button-save-work-${work.id}`}
              >
                {isPending ? "Сохранение..." : "Сохранить изменения"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
