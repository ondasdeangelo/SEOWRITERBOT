import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, MoreVertical, Settings, Trash2, Play } from "lucide-react";

interface WebsiteCardProps {
  name: string;
  url: string;
  keywords: string[];
  status: "active" | "paused" | "error";
  lastGenerated: string;
  totalArticles: number;
  nextScheduled: string;
  onConfigure?: () => void;
  onGenerate?: () => void;
  onDelete?: () => void;
}

export default function WebsiteCard({
  name,
  url,
  keywords,
  status,
  lastGenerated,
  totalArticles,
  nextScheduled,
  onConfigure,
  onGenerate,
  onDelete,
}: WebsiteCardProps) {
  const statusColors = {
    active: "bg-green-500/10 text-green-700 dark:text-green-400",
    paused: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    error: "bg-red-500/10 text-red-700 dark:text-red-400",
  };

  return (
    <Card className="p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Globe className="h-6 w-6 text-primary" />
        </div>
        
        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">{name}</h3>
              <p className="text-sm text-muted-foreground">{url}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={statusColors[status]} variant="secondary">
                {status}
              </Badge>
              <Button
                size="sm"
                onClick={onConfigure}
                data-testid={`button-configure-${name}`}
              >
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" data-testid={`button-menu-${name}`}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onGenerate} data-testid={`menu-generate-${name}`}>
                    <Play className="h-4 w-4 mr-2" />
                    Generate Now
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onDelete} className="text-destructive" data-testid={`menu-delete-${name}`}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {keywords.map((keyword) => (
              <Badge key={keyword} variant="outline">
                {keyword}
              </Badge>
            ))}
          </div>
          
          <div className="flex items-center justify-between border-t pt-3 text-sm text-muted-foreground">
            <span>Last generated: {lastGenerated}</span>
            <span>{totalArticles} articles</span>
            <span>Next: {nextScheduled}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
