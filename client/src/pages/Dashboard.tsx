import { useQuery } from "@tanstack/react-query";
import MetricsCard from "@/components/MetricsCard";
import ActivityFeed from "@/components/ActivityFeed";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe, CheckCircle, FileText, Plus, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";
import type { Website } from "@shared/schema";

interface DashboardStats {
  activeWebsites: number;
  pendingApprovals: number;
  publishedThisMonth: number;
  lastMonthActiveWebsites: number;
  thisMonthApprovedIdeas: number;
  lastMonthApprovedIdeas: number;
  lastMonthPublished: number;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const { data: stats, isLoading: isLoadingStats } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  const { data: websites, isLoading: isLoadingWebsites } = useQuery<Website[]>({
    queryKey: ["/api/websites"],
  });

  // Get recent activities from all websites
  const formatRelativeTime = (date: Date | string | null): string => {
    if (!date) return "Just now";
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return "Just now";
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  };

  const activities = websites?.slice(0, 4).map((website, index) => ({
    id: `${index}`,
    type: index === 0 ? "generated" as const : index === 1 ? "approved" as const : index === 2 ? "draft_created" as const : "pr_created" as const,
    title: index === 0 ? "Generated new article ideas" : index === 1 ? "Approved article idea" : index === 2 ? "Draft created" : "Pull request created",
    timestamp: formatRelativeTime(website.lastGenerated),
    website: website.name,
  })) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's an overview of your content pipeline.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <MetricsCard
          title="Active Websites"
          value={stats?.activeWebsites || 0}
          icon={Globe}
          trend={(() => {
            const current = stats?.activeWebsites || 0;
            const lastMonth = stats?.lastMonthActiveWebsites || 0;
            // If no data for last month, default to 0%
            if (lastMonth === 0) return { value: 0, isPositive: true };
            // Calculate percentage change
            const percentage = Math.round(((current - lastMonth) / lastMonth) * 100);
            return { value: Math.abs(percentage), isPositive: current >= lastMonth };
          })()}
          isLoading={isLoadingStats}
        />
        <MetricsCard
          title="Approved"
          value={stats?.thisMonthApprovedIdeas || 0}
          icon={CheckCircle}
          trend={(() => {
            const current = stats?.thisMonthApprovedIdeas || 0;
            const lastMonth = stats?.lastMonthApprovedIdeas || 0;
            // If no data for last month, default to 0%
            if (lastMonth === 0) return { value: 0, isPositive: true };
            // Calculate percentage change
            const percentage = Math.round(((current - lastMonth) / lastMonth) * 100);
            return { value: Math.abs(percentage), isPositive: current >= lastMonth };
          })()}
          isLoading={isLoadingStats}
        />
        <MetricsCard
          title="Published This Month"
          value={stats?.publishedThisMonth || 0}
          icon={FileText}
          trend={(() => {
            const current = stats?.publishedThisMonth || 0;
            const lastMonth = stats?.lastMonthPublished || 0;
            // If no data for last month, default to 0%
            if (lastMonth === 0) return { value: 0, isPositive: true };
            // Calculate percentage change
            const percentage = Math.round(((current - lastMonth) / lastMonth) * 100);
            return { value: Math.abs(percentage), isPositive: current >= lastMonth };
          })()}
          isLoading={isLoadingStats}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActivityFeed activities={activities} />
        </div>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Button 
              className="w-full justify-start" 
              variant="outline" 
              data-testid="button-add-website"
              onClick={() => setLocation("/websites")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Website
            </Button>
            <Button 
              className="w-full justify-start" 
              variant="outline" 
              data-testid="button-generate-ideas"
              onClick={() => setLocation("/ideas")}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Generate Ideas
            </Button>
            <Button 
              className="w-full justify-start" 
              variant="outline" 
              data-testid="button-review-pending"
              onClick={() => setLocation("/ideas")}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Review Pending {isLoadingStats ? (
                <Skeleton className="h-4 w-6 ml-2 inline-block" />
              ) : (
                `(${stats?.pendingApprovals || 0})`
              )}
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t">
            <h3 className="text-sm font-medium mb-2">Generation Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Websites</span>
                {isLoadingWebsites ? (
                  <Skeleton className="h-4 w-8" />
                ) : (
                  <span className="font-medium">{websites?.length || 0}</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">This Month</span>
                {isLoadingStats ? (
                  <Skeleton className="h-4 w-16" />
                ) : (
                  <span className="font-medium">{stats?.publishedThisMonth || 0} articles</span>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

