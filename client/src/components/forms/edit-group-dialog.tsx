import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUpdateWorkGroup, useBlocks } from "@/hooks/use-construction";
import { insertWorkGroupSchema, type WorkGroup } from "@shared/schema";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Edit2 } from "lucide-react";

const formSchema = insertWorkGroupSchema.extend({
  name: z.string().min(1, "Название обязательно"),
});
type FormValues = z.infer<typeof formSchema>;

interface EditGroupDialogProps {
  group: WorkGroup;
}

export function EditGroupDialog({ group }: EditGroupDialogProps) {
  const [open, setOpen] = useState(false);
  const { mutate, isPending } = useUpdateWorkGroup();
  const { data: blocks = [] } = useBlocks();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: group.name,
      blockId: group.blockId ?? undefined,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: group.name,
        blockId: group.blockId ?? undefined,
      });
    }
  }, [open, group.name, group.blockId, form]);

  function onSubmit(values: FormValues) {
    mutate({ id: group.id, ...values }, {
      onSuccess: () => {
        setOpen(false);
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" data-testid={`button-edit-group-${group.id}`}>
          <Edit2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Редактировать группу</DialogTitle>
          <DialogDescription>
            Измените название группы или переместите в другой блок.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название группы</FormLabel>
                  <FormControl>
                    <Input placeholder="Название группы" {...field} data-testid="input-group-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="blockId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Блок (опционально)</FormLabel>
                  <Select
                    value={field.value?.toString() ?? "none"}
                    onValueChange={(val) => field.onChange(val === "none" ? null : parseInt(val))}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-group-block">
                        <SelectValue placeholder="Без блока" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Без блока</SelectItem>
                      {blocks.map((block) => (
                        <SelectItem key={block.id} value={block.id.toString()}>
                          {block.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isPending} data-testid="button-submit-group-edit">
                {isPending ? "Сохранение..." : "Сохранить"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
