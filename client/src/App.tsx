import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/error-boundary";
import { LoadingScreen } from "@/components/loading-screen";
import { Footer } from "@/components/footer";
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
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-8 overflow-auto">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/projects" component={Projects} />
            <Route path="/projects/:id" component={ProjectDetails} />
            <Route path="/projects/:id/critical-path" component={CriticalPath} />
            <Route path="/resources" component={Resources} />
            <Route component={NotFound} />
          </Switch>
        </main>
        <Footer variant="light" />
      </div>
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen message="Checking authentication..." />;
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
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router />
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
