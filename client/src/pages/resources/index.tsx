import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ResourceForm from "@/components/resources/resource-form";
import { Resource } from "@shared/schema";

function ResourceSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-3/4" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Resources() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: resources, isLoading } = useQuery<Resource[]>({
    queryKey: ["/api/resources"],
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-resources">Resources</h1>
          <p className="text-muted-foreground">Manage your team members and their rates</p>
        </div>
        <Button 
          onClick={() => setIsCreateDialogOpen(true)}
          data-testid="button-new-resource"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Resource
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <ResourceSkeleton key={i} />
          ))}
        </div>
      ) : resources && resources.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => (
            <Card key={resource.id} data-testid={`card-resource-${resource.id}`}>
              <CardHeader>
                <CardTitle>{resource.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Role</p>
                    <p data-testid={`text-role-${resource.id}`}>{resource.role}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Cost per Hour</p>
                    <p className="font-semibold" data-testid={`text-cost-${resource.id}`}>
                      ${resource.costPerHour.toLocaleString()}/hr
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-16 w-16 text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No resources yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Start building your team by adding resources. Track roles, skills, and hourly rates for better project planning.
            </p>
            <Button 
              onClick={() => setIsCreateDialogOpen(true)}
              data-testid="button-create-first-resource"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Resource
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent data-testid="dialog-create-resource">
          <DialogHeader>
            <DialogTitle>Create New Resource</DialogTitle>
          </DialogHeader>
          <ResourceForm onSuccess={() => setIsCreateDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
