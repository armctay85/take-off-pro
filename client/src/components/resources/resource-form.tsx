import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { insertResourceSchema, type InsertResource } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
      costPerHour: 0
    }
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
        description: "Resource created successfully"
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: InsertResource) => {
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Resource Name</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-resource-name" />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-resource-role" />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="costPerHour"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cost per Hour ($)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min="0"
                  step="0.01"
                  {...field}
                  value={field.value}
                  onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                  data-testid="input-resource-cost"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-resource">
            {mutation.isPending ? "Creating..." : "Create Resource"}
          </Button>
        </div>
      </form>
    </Form>
  );
}