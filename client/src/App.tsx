import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProjectProvider, useProjectContext } from "@/contexts/project-context";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Analytics from "@/pages/analytics";
import KSP from "@/pages/ksp";
import Budget from "@/pages/budget";
import PDC from "@/pages/pdc";
import People from "@/pages/people";
import Login from "@/pages/login";
import Admin from "@/pages/admin";
import NoProjects from "@/pages/no-projects";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut } from "lucide-react";

function ProtectedRoute({ component: Component, page }: { component: React.ComponentType; page?: string }) {
  const { user, isLoading, logout } = useAuth();
  const { hasNoProjects, isLoading: projectsLoading, canView } = useProjectContext();

  if (isLoading || projectsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (hasNoProjects && !user.isAdmin) {
    return <NoProjects />;
  }

  if (page && !user.isAdmin && !canView(page)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Нет доступа</h1>
          <p className="text-muted-foreground mb-4">У вас нет разрешения на просмотр этой страницы</p>
          <Button onClick={() => logout()} variant="outline" data-testid="button-logout-no-access">
            <LogOut className="w-4 h-4 mr-2" />
            Выйти
          </Button>
        </div>
      </div>
    );
  }

  return <Component />;
}

function Router() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading && location !== "/login") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && location !== "/login") {
    return <Redirect to="/login" />;
  }

  if (user && location === "/login") {
    return <Redirect to="/" />;
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/analytics">
        <ProtectedRoute component={Analytics} page="analytics" />
      </Route>
      <Route path="/ksp">
        <ProtectedRoute component={KSP} page="ksp" />
      </Route>
      <Route path="/budget">
        <ProtectedRoute component={Budget} page="budget" />
      </Route>
      <Route path="/pdc">
        <ProtectedRoute component={PDC} page="pdc" />
      </Route>
      <Route path="/people">
        <ProtectedRoute component={People} page="people" />
      </Route>
      <Route path="/admin">
        <ProtectedRoute component={Admin} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProjectProvider>
          <TooltipProvider delayDuration={0}>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ProjectProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
