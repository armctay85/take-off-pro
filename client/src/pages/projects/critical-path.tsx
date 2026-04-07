import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Project, Task, CriticalPath } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { AlertCircle, TrendingUp, Clock, Download, Info, ChevronDown, ChevronUp } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface TimelineData {
  taskName: string;
  taskId: number;
  earliestStart: number;
  earliestFinish: number;
  latestStart: number;
  latestFinish: number;
  duration: number;
  slack: number;
  isCritical: boolean;
  durationDays: number;
}

export default function CriticalPathView() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", id],
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/projects", id, "tasks"],
  });

  const { data: criticalPath, isLoading: criticalPathLoading } = useQuery<CriticalPath[]>({
    queryKey: ["/api/projects", id, "critical-path"],
  });

  const isLoading = projectLoading || tasksLoading || criticalPathLoading;

  // Memoize the timeline data processing
  const timelineData = useMemo<TimelineData[]>(() => {
    if (!criticalPath || !tasks) return [];

    return criticalPath.map((path) => {
      const task = tasks.find((t) => t.id === path.taskId);
      const earliestStart = new Date(path.earliestStart).getTime();
      const earliestFinish = new Date(path.earliestFinish).getTime();
      const latestStart = new Date(path.latestStart).getTime();
      const latestFinish = new Date(path.latestFinish).getTime();

      return {
        taskName: task?.name || `Task ${path.taskId}`,
        taskId: path.taskId,
        earliestStart,
        earliestFinish,
        latestStart,
        latestFinish,
        duration: earliestFinish - earliestStart,
        slack: path.slack,
        isCritical: path.slack === 0,
        durationDays: differenceInDays(new Date(path.earliestFinish), new Date(path.earliestStart)) || 1,
      };
    }).sort((a, b) => a.earliestStart - b.earliestStart);
  }, [criticalPath, tasks]);

  // Memoize min/max timeline values for chart domain
  const timelineDomain = useMemo(() => {
    if (timelineData.length === 0) return [0, 1];
    
    const allTimes = timelineData.flatMap((d) => [d.earliestStart, d.latestFinish]);
    const min = Math.min(...allTimes);
    const max = Math.max(...allTimes);
    
    // Add padding (5% on each side)
    const padding = (max - min) * 0.05;
    return [min - padding, max + padding];
  }, [timelineData]);

  // Memoize critical path statistics
  const statistics = useMemo(() => {
    if (!criticalPath) return { critical: 0, nonCritical: 0, totalSlack: 0, totalDuration: 0 };
    
    const criticalTasks = criticalPath.filter(p => p.slack === 0);
    const totalDuration = criticalTasks.length > 0 
      ? Math.max(...criticalTasks.map(p => new Date(p.latestFinish).getTime())) - 
        Math.min(...criticalTasks.map(p => new Date(p.earliestStart).getTime()))
      : 0;
    
    return criticalPath.reduce(
      (acc, path) => ({
        critical: acc.critical + (path.slack === 0 ? 1 : 0),
        nonCritical: acc.nonCritical + (path.slack > 0 ? 1 : 0),
        totalSlack: acc.totalSlack + path.slack,
        totalDuration,
      }),
      { critical: 0, nonCritical: 0, totalSlack: 0, totalDuration }
    );
  }, [criticalPath]);

  const toggleTaskExpand = (taskId: number) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleExport = () => {
    if (!timelineData.length) return;
    
    const csv = [
      ["Task Name", "Duration (days)", "Earliest Start", "Earliest Finish", "Latest Start", "Latest Finish", "Slack (days)", "Critical"].join(","),
      ...timelineData.map(t => [
        `"${t.taskName}"`,
        t.durationDays,
        format(new Date(t.earliestStart), "yyyy-MM-dd"),
        format(new Date(t.earliestFinish), "yyyy-MM-dd"),
        format(new Date(t.latestStart), "yyyy-MM-dd"),
        format(new Date(t.latestFinish), "yyyy-MM-dd"),
        t.slack,
        t.isCritical ? "Yes" : "No"
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `critical-path-${project?.name?.replace(/\s+/g, "-") || "export"}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Critical path data has been downloaded as CSV",
    });
  };

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Card className="shadow-lg border-2" data-testid="chart-tooltip">
          <CardContent className="p-4 space-y-2">
            <p className="font-semibold text-lg">{data.taskName}</p>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Duration: </span>
                <span className="font-medium">{data.durationDays} days</span>
              </div>
              <p>
                <span className="text-muted-foreground">Earliest: </span>
                {format(new Date(data.earliestStart), "MMM d, yyyy")} - {format(new Date(data.earliestFinish), "MMM d, yyyy")}
              </p>
              <p>
                <span className="text-muted-foreground">Latest: </span>
                {format(new Date(data.latestStart), "MMM d, yyyy")} - {format(new Date(data.latestFinish), "MMM d, yyyy")}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-muted-foreground">Slack: </span>
                <span className={`font-semibold ${data.isCritical ? "text-destructive" : "text-primary"}`}>
                  {data.slack} days {data.isCritical && "(Critical)"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="space-y-8" data-testid="loading-state">
        <div>
          <Skeleton className="h-9 w-64 mb-2" data-testid="skeleton-title" />
          <Skeleton className="h-5 w-96" data-testid="skeleton-subtitle" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-96 w-full" data-testid="skeleton-chart" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!criticalPath || criticalPath.length === 0) {
    return (
      <div className="space-y-8" data-testid="empty-state">
        <div>
          <h1 className="text-3xl font-bold" data-testid="page-title">Critical Path Analysis</h1>
          <p className="text-muted-foreground" data-testid="page-subtitle">
            {project?.name} - Critical path and slack time analysis
          </p>
        </div>

        <Alert className="border-dashed">
          <Info className="h-4 w-4" />
          <AlertDescription className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" data-testid="empty-icon" />
            <h3 className="text-xl font-semibold mb-2" data-testid="empty-title">
              No Critical Path Analysis Available
            </h3>
            <p className="text-muted-foreground max-w-md mb-4" data-testid="empty-description">
              Critical path analysis requires tasks with dependencies. Add tasks and define their dependencies
              to see the critical path visualization.
            </p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <motion.div 
      className="space-y-8" 
      data-testid="critical-path-view"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="page-title">Critical Path Analysis</h1>
          <p className="text-muted-foreground" data-testid="page-subtitle">
            {project?.name} - Critical path and slack time analysis
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="stat-critical-tasks">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Tasks</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-critical-count">
              {statistics.critical}
            </div>
            <p className="text-xs text-muted-foreground">
              Tasks with zero slack time
            </p>
          </CardContent>
        </Card>

        <Card data-testid="stat-non-critical-tasks">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Non-Critical Tasks</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-non-critical-count">
              {statistics.nonCritical}
            </div>
            <p className="text-xs text-muted-foreground">
              Tasks with available slack
            </p>
          </CardContent>
        </Card>

        <Card data-testid="stat-total-slack">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Slack</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-slack-value">
              {statistics.totalSlack} days
            </div>
            <p className="text-xs text-muted-foreground">
              Cumulative available slack
            </p>
          </CardContent>
        </Card>

        <Card data-testid="stat-project-duration">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Project Duration</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-duration-value">
              {Math.ceil(statistics.totalDuration / (1000 * 60 * 60 * 24))} days
            </div>
            <p className="text-xs text-muted-foreground">
              Total critical path duration
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gantt-Style Timeline Chart */}
      <Card data-testid="timeline-chart-card">
        <CardHeader>
          <CardTitle data-testid="chart-title">Project Timeline</CardTitle>
          <CardDescription data-testid="chart-description">
            Gantt-style view showing task schedules and critical path
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 flex-wrap" data-testid="legend">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-destructive rounded shadow-sm" />
                <span className="text-sm font-medium">Critical Tasks (0 slack)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-primary rounded shadow-sm" />
                <span className="text-sm font-medium">Non-Critical Tasks</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <ResponsiveContainer width="100%" height={Math.max(400, timelineData.length * 60)} data-testid="responsive-container">
                <BarChart
                  data={timelineData}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                  <XAxis
                    type="number"
                    domain={timelineDomain}
                    tickFormatter={(timestamp) => format(new Date(timestamp), "MMM d")}
                    data-testid="chart-x-axis"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="taskName"
                    width={150}
                    data-testid="chart-y-axis"
                    tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="duration"
                    data-testid="chart-bars"
                    radius={[4, 4, 4, 4]}
                  >
                    {timelineData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isCritical ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                        stroke={entry.isCritical ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                        strokeWidth={2}
                        data-testid={`bar-task-${entry.taskId}`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Details List */}
      <Card data-testid="task-details-card">
        <CardHeader>
          <CardTitle data-testid="details-title">Task Details</CardTitle>
          <CardDescription data-testid="details-description">
            Click on a task to expand and see full schedule details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <AnimatePresence>
              {timelineData.map((task, index) => (
                <motion.div
                  key={task.taskId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div
                    className={`flex flex-col p-4 border rounded-lg transition-all cursor-pointer hover:shadow-md ${
                      task.isCritical ? "border-destructive/30 bg-destructive/5" : "hover:bg-accent/50"
                    }`}
                    data-testid={`task-detail-${task.taskId}`}
                    onClick={() => toggleTaskExpand(task.taskId)}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {expandedTasks.has(task.taskId) ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold" data-testid={`task-name-${task.taskId}`}>
                              {task.taskName}
                            </h4>
                            {task.isCritical && (
                              <Badge variant="destructive" data-testid={`task-critical-badge-${task.taskId}`}>
                                Critical
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {task.durationDays} days duration
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Slack Time</p>
                          <p
                            className={`text-lg font-semibold ${task.isCritical ? "text-destructive" : "text-primary"}`}
                            data-testid={`task-slack-${task.taskId}`}
                          >
                            {task.slack} days
                          </p>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedTasks.has(task.taskId) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-4 mt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Earliest Schedule
                              </p>
                              <p className="text-sm" data-testid={`task-earliest-${task.taskId}`}>
                                Start: {format(new Date(task.earliestStart), "MMM d, yyyy")}
                              </p>
                              <p className="text-sm">
                                Finish: {format(new Date(task.earliestFinish), "MMM d, yyyy")}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" />
                                Latest Schedule
                              </p>
                              <p className="text-sm" data-testid={`task-latest-${task.taskId}`}>
                                Start: {format(new Date(task.latestStart), "MMM d, yyyy")}
                              </p>
                              <p className="text-sm">
                                Finish: {format(new Date(task.latestFinish), "MMM d, yyyy")}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
