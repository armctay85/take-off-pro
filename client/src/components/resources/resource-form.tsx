import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { insertResourceSchema, type InsertResource } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User, Briefcase, DollarSign, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ResourceFormProps {
  onSuccess?: () => void;
}

export default function ResourceForm({ onSuccess }: ResourceFormProps) {
  const { toast } = useToast();

  const form = useForm<InsertResource>({
    resolver: zodResolver(insertResourceSchema),
    defaultValues: {
      name: "",
      role: "",
      costPerHour: 0,
    },
    mode: "onChange",
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertResource) => {
      const res = await apiRequest("POST", "/api/resources", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      toast({
        title: "Success",
        description: "Resource created successfully",
      });
      form.reset();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create resource",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertResource) => {
    mutation.mutate(data);
  };

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
                <User className="h-4 w-4 text-muted-foreground" />
                Resource Name
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="e.g., John Smith"
                  data-testid="input-resource-name"
                  aria-invalid={form.formState.errors.name ? "true" : "false"}
                />
              </FormControl>
              <FormDescription>
                Enter the name of the team member or resource.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                Role
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="e.g., Senior Developer"
                  data-testid="input-resource-role"
                  aria-invalid={form.formState.errors.role ? "true" : "false"}
                />
              </FormControl>
              <FormDescription>
                Specify the role or position of this resource.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="costPerHour"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Cost per Hour ($)
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  {...field}
                  value={field.value}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  data-testid="input-resource-cost"
                  aria-invalid={form.formState.errors.costPerHour ? "true" : "false"}
                />
              </FormControl>
              <FormDescription>
                Hourly rate for cost calculations.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

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
            data-testid="button-submit-resource"
          >
            {mutation.isPending ? (
              <>
                <span className="animate-spin mr-2">⌛</span>
                Creating...
              </>
            ) : (
              "Create Resource"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
