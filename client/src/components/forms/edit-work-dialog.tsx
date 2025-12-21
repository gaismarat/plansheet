import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUpdateWork } from "@/hooks/use-construction";
import { insertWorkSchema, type Work } from "@shared/schema";
import { z } from "zod";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit2 } from "lucide-react";

const formSchema = insertWorkSchema;
type FormValues = z.infer<typeof formSchema>;

interface EditWorkDialogProps {
  work: Work;
}

export function EditWorkDialog({ work }: EditWorkDialogProps) {
  const [open, setOpen] = useState(false);
  const { mutate, isPending } = useUpdateWork();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      groupId: work.groupId,
      name: work.name,
      responsiblePerson: work.responsiblePerson,
      daysEstimated: work.daysEstimated,
      volumeAmount: work.volumeAmount,
      volumeUnit: work.volumeUnit,
      daysActual: work.daysActual,
      volumeActual: work.volumeActual,
      progressPercentage: work.progressPercentage,
      planStartDate: work.planStartDate || '',
      planEndDate: work.planEndDate || '',
      actualStartDate: work.actualStartDate || '',
      actualEndDate: work.actualEndDate || '',
    },
  });

  function onSubmit(values: FormValues) {
    mutate({ id: work.id, ...values }, {
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
        >
          <Edit2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Редактировать работу</DialogTitle>
          <DialogDescription>
            Измените детали строительной работы.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название работы</FormLabel>
                  <FormControl>
                    <Input placeholder="Заливка бетона" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="daysEstimated"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дней (оценка)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="responsiblePerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ответственный</FormLabel>
                    <FormControl>
                      <Input placeholder="Иванов И.И." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="volumeAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Объём (план)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="volumeUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ед. изм.</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите ед. изм." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white">
                        <SelectItem value="шт">шт (pcs)</SelectItem>
                        <SelectItem value="м3">м³</SelectItem>
                        <SelectItem value="м2">м²</SelectItem>
                        <SelectItem value="п.м">п.м (lm)</SelectItem>
                        <SelectItem value="компл">компл (set)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="volumeActual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Объём (факт)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="daysActual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дней (факт)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="planStartDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>План начало</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="actualStartDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Факт начало</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="planEndDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>План конец</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="actualEndDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Факт конец</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Сохранение..." : "Сохранить изменения"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
