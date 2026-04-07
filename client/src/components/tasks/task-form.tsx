import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { insertTaskSchema, type InsertTask, type Resource } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Type, Clock, CalendarDays, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

interface TaskFormProps {
  projectId: number;
  onSuccess?: () => void;
}

const formatDateTimeLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function TaskForm({ projectId, onSuccess }: TaskFormProps) {
  const { toast } = useToast();

  const { data: resources, isLoading: resourcesLoading } = useQuery<Resource[]>({
    queryKey: ["/api/resources"],
  });

  const defaultStartDate = new Date();
  const defaultEndDate = new Date();
  defaultEndDate.setDate(defaultEndDate.getDate() + 1);

  const form = useForm<InsertTask>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: {
      projectId: projectId,
      name: "",
      description: "",
      duration: 1,
      startDate: defaultStartDate,
      endDate: defaultEndDate,
      completed: false,
      dependsOn: null,
    },
    mode: "onChange",
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/tasks`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId.toString(), "tasks"] });
      toast({
        title: "Success",
        description: "Task created successfully",
      });
      form.reset();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create task",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertTask) => {
    mutation.mutate(data);
  };

  if (resourcesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Error Summary */}
        {Object.keys(form.formState.errors).length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please fix the errors below before submitting.
            </AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Type className="h-4 w-4 text-muted-foreground" />
                Task Name
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Enter task name"
                  aria-invalid={form.formState.errors.name ? "true" : "false"}
                />
              </FormControl>
              <FormDescription>
                A clear name helps team members understand the task.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Type className="h-4 w-4 text-muted-foreground" />
                Description
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe what needs to be done"
                  rows={3}
                  value={field.value || ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                  disabled={field.disabled}
                />
              </FormControl>
              <FormDescription>
                Optional: Add details about requirements and deliverables.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Duration (days)
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  value={field.value}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                  aria-invalid={form.formState.errors.duration ? "true" : "false"}
                />
              </FormControl>
              <FormDescription>
                Estimated time needed to complete this task.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  Start Date
                </FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    value={formatDateTimeLocal(field.value)}
                    onChange={(e) => field.onChange(new Date(e.target.value))}
                    aria-invalid={form.formState.errors.startDate ? "true" : "false"}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  End Date
                </FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    value={formatDateTimeLocal(field.value)}
                    onChange={(e) => field.onChange(new Date(e.target.value))}
                    aria-invalid={form.formState.errors.endDate ? "true" : "false"}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            disabled={mutation.isPending}
          >
            Reset
          </Button>
          <Button
            type="submit"
            disabled={mutation.isPending || !form.formState.isValid}
          >
            {mutation.isPending ? (
              <>
                <span className="animate-spin mr-2">⌛</span>
                Creating...
              </>
            ) : (
              "Create Task"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
