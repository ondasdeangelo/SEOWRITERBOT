import { Card } from "@/components/ui/card";
import { CheckCircle, FileText, GitPullRequest, AlertCircle, Sparkles } from "lucide-react";

interface ActivityItem {
  id: string;
  type: "approved" | "draft_created" | "pr_created" | "error" | "generated";
  title: string;
  timestamp: string;
  website?: string;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
}

const activityIcons = {
  approved: CheckCircle,
  draft_created: FileText,
  pr_created: GitPullRequest,
  error: AlertCircle,
  generated: Sparkles,
};

const activityColors = {
  approved: "text-green-600 bg-green-500/10",
  draft_created: "text-blue-600 bg-blue-500/10",
  pr_created: "text-purple-600 bg-purple-500/10",
  error: "text-red-600 bg-red-500/10",
  generated: "text-yellow-600 bg-yellow-500/10",
};

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
      <div className="space-y-4">
        {activities.map((activity) => {
          const Icon = activityIcons[activity.type];
          return (
            <div key={activity.id} className="flex gap-3" data-testid={`activity-${activity.id}`}>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 ${activityColors[activity.type]}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{activity.title}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  {activity.website && <span>{activity.website}</span>}
                  <span>•</span>
                  <span>{activity.timestamp}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
