import MetricsCard from "@/components/MetricsCard";
import ActivityFeed from "@/components/ActivityFeed";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Globe, CheckCircle, FileText, Plus, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const activities = [
    {
      id: '1',
      type: 'generated' as const,
      title: 'Generated 5 new article ideas',
      timestamp: '5 minutes ago',
      website: 'Tech Blog',
    },
    {
      id: '2',
      type: 'approved' as const,
      title: 'Approved "The Future of AI in Web Development"',
      timestamp: '1 hour ago',
      website: 'Tech Blog',
    },
    {
      id: '3',
      type: 'draft_created' as const,
      title: 'Draft created for "10 SEO Strategies"',
      timestamp: '2 hours ago',
      website: 'Marketing Hub',
    },
    {
      id: '4',
      type: 'pr_created' as const,
      title: 'Pull request created #123',
      timestamp: '3 hours ago',
      website: 'Tech Blog',
    },
  ];

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
          value={5}
          icon={Globe}
          trend={{ value: 20, isPositive: true }}
        />
        <MetricsCard
          title="Pending Approvals"
          value={12}
          icon={CheckCircle}
          trend={{ value: 8, isPositive: false }}
        />
        <MetricsCard
          title="Published This Month"
          value={47}
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
            <Button className="w-full justify-start" variant="outline" data-testid="button-add-website">
              <Plus className="h-4 w-4 mr-2" />
              Add New Website
            </Button>
            <Button className="w-full justify-start" variant="outline" data-testid="button-generate-ideas">
              <TrendingUp className="h-4 w-4 mr-2" />
              Generate Ideas
            </Button>
            <Button className="w-full justify-start" variant="outline" data-testid="button-review-pending">
              <CheckCircle className="h-4 w-4 mr-2" />
              Review Pending ({12})
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t">
            <h3 className="text-sm font-medium mb-2">Generation Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">This week</span>
                <span className="font-medium">23 articles</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg. quality score</span>
                <span className="font-medium">87/100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Success rate</span>
                <span className="font-medium">94%</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
