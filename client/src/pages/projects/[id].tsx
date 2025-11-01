import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Plus, GitFork, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TaskForm from "@/components/tasks/task-form";
import { Badge } from "@/components/ui/badge";
import { Project, Task } from "@shared/schema";
import { useCollaboration } from "@/hooks/use-collaboration";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";

// Add a component to show active users
const ActiveUsers = ({ count }: { count: number }) => {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Users className="h-4 w-4 text-muted-foreground" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
        )}
      </div>
      <span className="text-sm text-muted-foreground">
        {count} active user{count !== 1 ? 's' : ''}
      </span>
    </div>
  );
};

export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);
  const [activeUserCount, setActiveUserCount] = useState(0);
  const { user } = useAuth();

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", id],
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/projects", id, "tasks"],
  });

  // Use the collaboration hook with authenticated user ID
  const { sendTaskUpdate } = useCollaboration({
    projectId: parseInt(id),
    userId: user?.id,
    onTaskUpdate: (updatedTask) => {
      console.log('Task updated by another user:', updatedTask);
      // Invalidate tasks query to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "tasks"] });
    },
    onUserJoined: (userId) => {
      console.log('User joined:', userId);
      setActiveUserCount(prev => prev + 1);
    },
    onUserLeft: (userId) => {
      console.log('User left:', userId);
      setActiveUserCount(prev => Math.max(0, prev - 1));
    }
  });

  if (projectLoading || tasksLoading) {
    return <div>Loading...</div>;
  }

  if (!project) {
    return <div>Project not found</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground">{project.description}</p>
        </div>
        <div className="flex items-center gap-4">
          <ActiveUsers count={activeUserCount} />
          <Link href={`/projects/${id}/critical-path`} data-testid="link-critical-path">
            <Button variant="outline">
              <GitFork className="mr-2 h-4 w-4" />
              Critical Path
            </Button>
          </Link>
          <Button onClick={() => setIsCreateTaskDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                <p>{new Date(project.startDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">End Date</p>
                <p>{new Date(project.endDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Budget</p>
                <p>${project.budget.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                  {project.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tasks?.map((task) => (
                <Card key={task.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{task.name}</h3>
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">Duration: {task.duration} days</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(task.startDate).toLocaleDateString()} - {new Date(task.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!tasks || tasks.length === 0) && (
                <p className="text-center text-muted-foreground">No tasks created yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isCreateTaskDialogOpen} onOpenChange={setIsCreateTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <TaskForm 
            projectId={parseInt(id)} 
            onSuccess={(task) => {
              setIsCreateTaskDialogOpen(false);
              // Notify other users about the new task
              sendTaskUpdate(task);
            }} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}