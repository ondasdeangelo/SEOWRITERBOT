import { useQuery } from "@tanstack/react-query";
import MetricsCard from "@/components/MetricsCard";
import ActivityFeed from "@/components/ActivityFeed";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Globe, CheckCircle, FileText, Plus, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";
import type { Website } from "@shared/schema";

interface DashboardStats {
  activeWebsites: number;
  pendingApprovals: number;
  publishedThisMonth: number;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  const { data: websites } = useQuery<Website[]>({
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
          trend={{ value: 20, isPositive: true }}
        />
        <MetricsCard
          title="Pending Approvals"
          value={stats?.pendingApprovals || 0}
          icon={CheckCircle}
          trend={{ value: 8, isPositive: false }}
        />
        <MetricsCard
          title="Published This Month"
          value={stats?.publishedThisMonth || 0}
          icon={FileText}
          trend={{ value: 35, isPositive: true }}
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
              Review Pending ({stats?.pendingApprovals || 0})
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t">
            <h3 className="text-sm font-medium mb-2">Generation Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Websites</span>
                <span className="font-medium">{websites?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">This Month</span>
                <span className="font-medium">{stats?.publishedThisMonth || 0} articles</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

