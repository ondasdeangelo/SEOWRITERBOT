import { lazy, Suspense, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";

const LazyWebsiteConfig = lazy(() => import("@/pages/WebsiteConfig"));
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import Dashboard from "@/pages/Dashboard";
import Websites from "@/pages/Websites";
import ArticleIdeas from "@/pages/ArticleIdeas";
import Drafts from "@/pages/Drafts";
import History from "@/pages/History";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/websites" component={Websites} />
      <Route 
        path="/websites/:siteId/config" 
        component={() => (
          <Suspense fallback={<div className="flex items-center justify-center h-[50vh]">Loading...</div>}>
            <LazyWebsiteConfig />
          </Suspense>
        )} 
      />
      <Route path="/ideas" component={ArticleIdeas} />
      <Route path="/drafts" component={Drafts} />
      <Route path="/history" component={History} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const style = {
    "--sidebar-width": "16rem",
  };

  // Prefetch critical data on app initialization
  useEffect(() => {
    // Prefetch websites and stats immediately when app loads
    // This ensures data is available as soon as components mount
    const prefetchData = () => {
      // Prefetch both endpoints in parallel - they use the default queryFn from queryClient
      Promise.all([
        queryClient.prefetchQuery({
          queryKey: ["/api/websites"],
        }),
        queryClient.prefetchQuery({
          queryKey: ["/api/stats"],
        }),
      ]).catch((error) => {
        // Silently handle errors - components will fetch on mount anyway
        console.debug("Prefetch error (non-critical):", error);
      });
    };
    
    // Start prefetch immediately, don't wait
    prefetchData();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1">
              <header className="flex items-center justify-between p-4 border-b">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <ThemeToggle />
              </header>
              <main className="flex-1 overflow-auto p-8">
                <Router />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
