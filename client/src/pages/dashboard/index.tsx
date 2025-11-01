import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Project, Task, Resource } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { FolderKanban, CheckCircle2, Users, DollarSign, TrendingUp, AlertCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendLabel,
  isLoading 
}: { 
  title: string; 
  value: string | number; 
  icon: any; 
  trend?: number;
  trendLabel?: string;
  isLoading?: boolean;
}) {
  return (
    <Card data-testid={`card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {trend !== undefined && trendLabel && (
              <p className="text-xs text-muted-foreground mt-1">
                <span className={trend >= 0 ? "text-green-600" : "text-red-600"}>
                  {trend >= 0 ? "+" : ""}{trend}%
                </span>{" "}
                {trendLabel}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({ 
    queryKey: ["/api/projects"]
  });

  const { data: resources, isLoading: resourcesLoading } = useQuery<Resource[]>({
    queryKey: ["/api/resources"]
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!projects) return null;

    const activeProjects = projects.filter(p => p.status === 'active').length;
    const totalBudget = projects.reduce((sum, p) => sum + parseFloat(String(p.budget)), 0);
    const completedProjects = projects.filter(p => p.status === 'completed').length;

    const statusData = [
      { name: 'Active', value: projects.filter(p => p.status === 'active').length, color: '#3b82f6' },
      { name: 'Completed', value: projects.filter(p => p.status === 'completed').length, color: '#10b981' },
      { name: 'On Hold', value: projects.filter(p => p.status === 'on-hold').length, color: '#f59e0b' },
    ].filter(item => item.value > 0);

    return {
      totalProjects: projects.length,
      activeProjects,
      totalBudget,
      completedProjects,
      statusData
    };
  }, [projects]);

  const projectChartData = useMemo(() => {
    if (!projects) return [];
    return projects.slice(0, 6).map(project => ({
      name: project.name.length > 15 ? project.name.substring(0, 15) + '...' : project.name,
      budget: parseFloat(String(project.budget)),
      status: project.status
    }));
  }, [projects]);

  const recentProjects = useMemo(() => {
    if (!projects) return [];
    return projects.slice(0, 5);
  }, [projects]);

  const isLoading = projectsLoading || resourcesLoading;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-dashboard">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your projects and resources</p>
        </div>
        <Link href="/projects">
          <Button data-testid="button-new-project">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Projects"
          value={metrics?.totalProjects || 0}
          icon={FolderKanban}
          isLoading={isLoading}
        />
        <StatCard
          title="Active Projects"
          value={metrics?.activeProjects || 0}
          icon={TrendingUp}
          isLoading={isLoading}
        />
        <StatCard
          title="Total Budget"
          value={`$${(metrics?.totalBudget || 0).toLocaleString()}`}
          icon={DollarSign}
          isLoading={isLoading}
        />
        <StatCard
          title="Team Members"
          value={resources?.length || 0}
          icon={Users}
          isLoading={isLoading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="card-project-status">
          <CardHeader>
            <CardTitle>Project Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : metrics?.statusData && metrics.statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={metrics.statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {metrics.statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No project data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-budget-overview">
          <CardHeader>
            <CardTitle>Budget Overview by Project</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : projectChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={projectChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-15} textAnchor="end" height={60} />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                  <Bar dataKey="budget" fill="#3b82f6" name="Budget" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No budget data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}
      <Card data-testid="card-recent-projects">
        <CardHeader>
          <CardTitle>Recent Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : recentProjects.length > 0 ? (
            <div className="space-y-4">
              {recentProjects.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors cursor-pointer" data-testid={`project-card-${project.id}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{project.name}</h3>
                        <Badge variant={project.status === 'active' ? 'default' : project.status === 'completed' ? 'secondary' : 'outline'}>
                          {project.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {project.description || 'No description'}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-semibold">${parseFloat(String(project.budget)).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FolderKanban className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-4">Get started by creating your first project</p>
              <Link href="/projects">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Project
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
