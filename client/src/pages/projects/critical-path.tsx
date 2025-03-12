import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Project, Task, CriticalPath } from "@shared/schema";

export default function CriticalPathView() {
  const { id } = useParams<{ id: string }>();

  const { data: project } = useQuery<Project>({
    queryKey: ["/api/projects", id],
  });

  const { data: criticalPath, isLoading } = useQuery<CriticalPath[]>({
    queryKey: ["/api/projects", id, "critical-path"],
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Critical Path Analysis</h1>
        <p className="text-muted-foreground">
          {project?.name} - Critical path and slack time analysis
        </p>
      </div>

      <div className="grid gap-4">
        {criticalPath?.map((path) => (
          <Card key={path.id}>
            <CardHeader>
              <CardTitle>Task: {path.taskId}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">Earliest Times</h3>
                  <div className="space-y-2">
                    <p className="text-sm">
                      Start: {new Date(path.earliestStart).toLocaleString()}
                    </p>
                    <p className="text-sm">
                      Finish: {new Date(path.earliestFinish).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Latest Times</h3>
                  <div className="space-y-2">
                    <p className="text-sm">
                      Start: {new Date(path.latestStart).toLocaleString()}
                    </p>
                    <p className="text-sm">
                      Finish: {new Date(path.latestFinish).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="col-span-2">
                  <h3 className="font-medium mb-2">Slack Time</h3>
                  <p className={path.slack === 0 ? "text-destructive" : ""}>
                    {path.slack} days
                    {path.slack === 0 && " (Critical Task)"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!criticalPath || criticalPath.length === 0) && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No critical path analysis available.
              This could be because there are not enough tasks or dependencies defined.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
