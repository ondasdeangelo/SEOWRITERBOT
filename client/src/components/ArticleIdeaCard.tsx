import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, Edit3, TrendingUp } from "lucide-react";

interface ArticleIdeaCardProps {
  headline: string;
  confidence: number;
  keywords: string[];
  estimatedWords: number;
  seoScore: number;
  status: "pending" | "approved" | "rejected";
  priority?: number;
  scheduledDate?: string;
  onApprove?: () => void;
  onReject?: () => void;
  onEdit?: () => void;
}

export default function ArticleIdeaCard({
  headline,
  confidence,
  keywords,
  estimatedWords,
  seoScore,
  status,
  priority,
  scheduledDate,
  onApprove,
  onReject,
  onEdit,
}: ArticleIdeaCardProps) {
  const confidenceColor = confidence >= 80 ? "text-green-600" : confidence >= 60 ? "text-yellow-600" : "text-red-600";
  const seoScoreColor = seoScore >= 80 ? "bg-green-500" : seoScore >= 60 ? "bg-yellow-500" : "bg-red-500";

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-xl font-semibold flex-1">{headline}</h3>
        {status === "pending" && (
          <Button
            size="icon"
            variant="ghost"
            onClick={onEdit}
            data-testid="button-edit-headline"
          >
            <Edit3 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <Badge variant="secondary" className="gap-1">
          <TrendingUp className="h-3 w-3" />
          <span className={confidenceColor}>{confidence}% confidence</span>
        </Badge>
        {priority && (
          <Badge variant="outline">Priority #{priority}</Badge>
        )}
        <span className="text-sm text-muted-foreground">{estimatedWords} words</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {keywords.map((keyword) => (
          <Badge key={keyword} variant="outline" className="text-xs">
            {keyword}
          </Badge>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">SEO Score</span>
          <span className="font-medium">{seoScore}/100</span>
        </div>
        <Progress value={seoScore} className={`h-2 ${seoScoreColor}`} />
      </div>

      {status === "pending" ? (
        <div className="flex gap-2 pt-2">
          <Button
            onClick={onApprove}
            className="flex-1"
            data-testid="button-approve"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve
          </Button>
          <Button
            onClick={onReject}
            variant="ghost"
            className="flex-1"
            data-testid="button-reject"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject
          </Button>
        </div>
      ) : status === "approved" && scheduledDate ? (
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Scheduled for draft:</span>
            <span className="font-medium">{scheduledDate}</span>
          </div>
          <Button variant="outline" className="w-full mt-2" data-testid="button-generate-now">
            Generate Draft Now
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
