import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Eye, Edit, GitPullRequest, Download } from "lucide-react";

interface DraftCardProps {
  title: string;
  excerpt: string;
  wordCount: number;
  readabilityScore: number;
  keywordDensity: number;
  status: "draft" | "review" | "pr_created" | "merged";
  prUrl?: string;
  imageUrl?: string;
  onView?: () => void;
  onEdit?: () => void;
  onSendToReview?: () => void;
  onPublish?: () => void;
  onReject?: () => void;
  onDownload?: () => void;
}

export default function DraftCard({
  title,
  excerpt,
  wordCount,
  readabilityScore,
  keywordDensity,
  status,
  prUrl,
  imageUrl,
  onView,
  onEdit,
  onSendToReview,
  onPublish,
  onReject,
  onDownload,
}: DraftCardProps) {
  const statusConfig = {
    draft: { label: "Draft", color: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
    review: { label: "Review", color: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400" },
    pr_created: { label: "PR Created", color: "bg-purple-500/10 text-purple-700 dark:text-purple-400" },
    merged: { label: "Merged", color: "bg-green-500/10 text-green-700 dark:text-green-400" },
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start gap-4">
        {imageUrl ? (
          <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border">
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
            <FileText className="h-6 w-6 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{excerpt}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <Badge className={statusConfig[status].color} variant="secondary">
          {statusConfig[status].label}
        </Badge>
        <span className="text-muted-foreground">{wordCount} words</span>
        <span className="text-muted-foreground">Readability: {readabilityScore}/100</span>
        <span className="text-muted-foreground">Density: {keywordDensity}%</span>
      </div>

      {prUrl && (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
          <GitPullRequest className="h-4 w-4 text-muted-foreground" />
          <a
            href={prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex-1 truncate"
            data-testid="link-github-pr"
          >
            {prUrl}
          </a>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onView}
          data-testid="button-view-draft"
        >
          <Eye className="h-4 w-4 mr-2" />
          View
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onEdit}
          data-testid="button-edit-draft"
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
        {status === "draft" ? (
          <Button
            size="sm"
            onClick={onSendToReview}
            data-testid="button-send-to-review"
          >
            <GitPullRequest className="h-4 w-4 mr-2" />
            Send to Review
          </Button>
        ) : status === "review" ? (
          <>
            <Button
              size="sm"
              onClick={onPublish}
              data-testid="button-publish"
            >
              <GitPullRequest className="h-4 w-4 mr-2" />
              Publish
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={onReject}
              data-testid="button-reject"
            >
              Reject
            </Button>
          </>
        ) : null}
        <Button
          size="sm"
          variant="ghost"
          onClick={onDownload}
          data-testid="button-download"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
