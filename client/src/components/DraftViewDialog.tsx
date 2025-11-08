import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Calendar, BarChart3, Hash, ExternalLink } from "lucide-react";
import type { Draft } from "@shared/schema";

interface DraftViewDialogProps {
  draft: Draft | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColors = {
  draft: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
  review: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  pr_created: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  merged: "bg-green-500/10 text-green-700 dark:text-green-400",
};

export default function DraftViewDialog({
  draft,
  open,
  onOpenChange,
}: DraftViewDialogProps) {
  if (!draft) return null;

  const formatDate = (date: string | Date | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString();
  };

  // Get image URL - use same format as edit dialog
  const imageUrl = (draft as any).imageUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-2xl mb-2 break-words">{draft.title}</DialogTitle>
              <DialogDescription className="text-base break-words">
                {draft.excerpt}
              </DialogDescription>
            </div>
            <Badge className={`${statusColors[draft.status]} shrink-0`} variant="secondary">
              {draft.status.charAt(0).toUpperCase() + draft.status.slice(1).replace("_", " ")}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto pr-4">
          <div className="space-y-6 pb-4">
            {/* Metadata Section */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Word Count</p>
                  <p className="font-semibold text-sm truncate">{draft.wordCount.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <BarChart3 className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Readability</p>
                  <p className="font-semibold text-sm">{draft.readabilityScore}/100</p>
                </div>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Keyword Density</p>
                  <p className="font-semibold text-sm">{draft.keywordDensity}%</p>
                </div>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="font-semibold text-xs truncate">{formatDate(draft.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* PR Link */}
            {draft.prUrl && (
              <div className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <ExternalLink className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <a
                  href={draft.prUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex-1 truncate"
                >
                  View Pull Request
                </a>
              </div>
            )}

            {/* Article Image */}
            {imageUrl && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2">Article Image</h3>
                  <div className="rounded-lg border overflow-hidden max-w-full">
                    <img
                      src={imageUrl}
                      alt={draft.title}
                      className="w-full h-auto object-cover max-h-64"
                      style={{ maxWidth: '100%', height: 'auto' }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    AI-generated image for this article
                  </p>
                </div>
              </div>
            )}

            <Separator />

            {/* Frontmatter */}
            {draft.frontmatter && typeof draft.frontmatter === "object" && Object.keys(draft.frontmatter).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Frontmatter</h3>
                <div className="bg-muted/30 rounded-lg border overflow-hidden">
                  <ScrollArea className="h-48">
                    <div className="p-3">
                      <pre className="text-xs whitespace-pre-wrap break-words">
                        {JSON.stringify(draft.frontmatter, null, 2)}
                      </pre>
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}

            <Separator />

            {/* Content */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Article Content</h3>
              <div className="bg-muted/30 rounded-lg border overflow-hidden">
                <ScrollArea className="h-96">
                  <div className="p-3">
                    <pre className="whitespace-pre-wrap text-sm font-mono break-words">
                      {draft.content}
                    </pre>
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

