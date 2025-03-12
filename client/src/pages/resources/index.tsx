import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ResourceForm from "@/components/resources/resource-form";
import { Resource } from "@shared/schema";

export default function Resources() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: resources, isLoading } = useQuery<Resource[]>({
    queryKey: ["/api/resources"],
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Resources</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Resource
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {resources?.map((resource) => (
          <Card key={resource.id}>
            <CardHeader>
              <CardTitle>{resource.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Role</p>
                  <p>{resource.role}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cost per Hour</p>
                  <p>${resource.costPerHour.toLocaleString()}/hr</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!resources || resources.length === 0) && (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center text-muted-foreground">
              No resources available. Create your first resource to get started.
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Resource</DialogTitle>
          </DialogHeader>
          <ResourceForm onSuccess={() => setIsCreateDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
