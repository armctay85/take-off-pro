import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Sidebar from "./components/layout/sidebar";
import { useAuth } from "@/hooks/useAuth";

// Pages
import Landing from "./pages/Landing";
import Dashboard from "./pages/dashboard";
import Projects from "./pages/projects";
import ProjectDetails from "./pages/projects/[id]";
import CriticalPath from "./pages/projects/critical-path";
import Resources from "./pages/resources";
import NotFound from "./pages/not-found";

function AuthenticatedApp() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-8">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/projects" component={Projects} />
          <Route path="/projects/:id" component={ProjectDetails} />
          <Route path="/projects/:id/critical-path" component={CriticalPath} />
          <Route path="/resources" component={Resources} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <Route path="/:rest*" component={AuthenticatedApp} />
      )}
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}
