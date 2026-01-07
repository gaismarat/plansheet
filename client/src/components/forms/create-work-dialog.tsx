import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateWork } from "@/hooks/use-construction";
import { insertWorkSchema } from "@shared/schema";
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
import { PlusCircle } from "lucide-react";

// Use coerce in schema so strings from inputs become numbers
const formSchema = insertWorkSchema;
type FormValues = z.infer<typeof formSchema>;

interface CreateWorkDialogProps {
  groupId: number;
}

export function CreateWorkDialog({ groupId }: CreateWorkDialogProps) {
  const [open, setOpen] = useState(false);
  const { mutate, isPending } = useCreateWork();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      groupId,
      name: "",
      responsiblePerson: "",
      daysEstimated: 0,
      volumeAmount: 0,
      volumeUnit: "м3",
      progressPercentage: 0,
      plannedPeople: 0,
    },
  });

  function onSubmit(values: FormValues) {
    mutate(values, {
      onSuccess: () => {
        setOpen(false);
        form.reset({ ...values, name: "", responsiblePerson: "" }); // keep some defaults
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-primary/80 hover:text-primary hover:bg-primary/5">
          <PlusCircle className="h-4 w-4" />
          Добавить работу
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Добавить работу</DialogTitle>
          <DialogDescription>
            Заполните детали новой строительной работы.
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

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="daysEstimated"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дней (оценка)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} data-testid="input-days-estimated" />
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
                      <Input placeholder="Иванов И.И." {...field} data-testid="input-responsible-person" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="plannedPeople"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Людей (план)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="9999" {...field} data-testid="input-planned-people" />
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
                    <FormLabel>Объём</FormLabel>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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

            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Добавление..." : "Добавить работу"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
