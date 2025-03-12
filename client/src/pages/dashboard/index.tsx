import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Project, Task, Resource } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export default function Dashboard() {
  const { data: projects } = useQuery<Project[]>({ 
    queryKey: ["/api/projects"]
  });

  const { data: resources } = useQuery<Resource[]>({
    queryKey: ["/api/resources"]
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{projects?.length || 0}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Active Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {projects?.reduce((acc, project) => acc + (project.tasks?.length || 0), 0) || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Available Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{resources?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart
            width={800}
            height={300}
            data={projects || []}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="completedTasks" fill="#82ca9d" name="Completed Tasks" />
            <Bar dataKey="totalTasks" fill="#8884d8" name="Total Tasks" />
          </BarChart>
        </CardContent>
      </Card>
    </div>
  );
}
