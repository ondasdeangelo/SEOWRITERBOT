import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import type { Draft } from "@shared/schema";

interface DraftEditDialogProps {
  draft: Draft | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, data: Partial<Draft>) => Promise<void>;
  isSaving?: boolean;
  defaultStatus?: "draft" | "review" | "pr_created" | "merged";
}

export default function DraftEditDialog({
  draft,
  open,
  onOpenChange,
  onSave,
  isSaving = false,
  defaultStatus,
}: DraftEditDialogProps) {
  const [formData, setFormData] = useState<{
    title: string;
    excerpt: string;
    content: string;
    wordCount: number;
    readabilityScore: number;
    keywordDensity: number;
    status: "draft" | "review" | "pr_created" | "merged";
    prUrl: string;
    frontmatter: string;
  }>({
    title: "",
    excerpt: "",
    content: "",
    wordCount: 0,
    readabilityScore: 0,
    keywordDensity: 0,
    status: "draft",
    prUrl: "",
    frontmatter: "",
  });

  // Initialize form data when draft changes
  useEffect(() => {
    if (draft) {
      // Use defaultStatus from tab if provided, otherwise use draft's current status
      const initialStatus = defaultStatus || draft.status || "draft";
      setFormData({
        title: draft.title || "",
        excerpt: draft.excerpt || "",
        content: draft.content || "",
        wordCount: draft.wordCount || 0,
        readabilityScore: draft.readabilityScore || 0,
        keywordDensity: draft.keywordDensity || 0,
        status: initialStatus,
        prUrl: draft.prUrl || "",
        frontmatter: draft.frontmatter
          ? JSON.stringify(draft.frontmatter, null, 2)
          : "",
      });
    }
  }, [draft, defaultStatus]);

  if (!draft) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Parse frontmatter if provided
      let parsedFrontmatter: any = null;
      if (formData.frontmatter.trim()) {
        try {
          parsedFrontmatter = JSON.parse(formData.frontmatter);
        } catch (error) {
          throw new Error("Invalid JSON in frontmatter field");
        }
      }

      const updateData: Partial<Draft> = {
        title: formData.title,
        excerpt: formData.excerpt,
        content: formData.content,
        wordCount: formData.wordCount,
        readabilityScore: formData.readabilityScore,
        keywordDensity: formData.keywordDensity,
        status: formData.status,
        prUrl: formData.prUrl || null,
        frontmatter: parsedFrontmatter,
      };

      await onSave(draft.id, updateData);
      onOpenChange(false);
    } catch (error: any) {
      // Error handling is done in parent component
      throw error;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Edit Draft</DialogTitle>
          <DialogDescription>
            Update the draft information. All fields are editable.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <ScrollArea className="max-h-[calc(90vh-200px)] pr-4 flex-1">
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Basic Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="excerpt">Excerpt</Label>
                  <Textarea
                    id="excerpt"
                    value={formData.excerpt}
                    onChange={(e) =>
                      setFormData({ ...formData, excerpt: e.target.value })
                    }
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="pr_created">PR Created</SelectItem>
                      <SelectItem value="merged">Merged</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Metrics */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Metrics</h3>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="wordCount">Word Count</Label>
                    <Input
                      id="wordCount"
                      type="number"
                      min="0"
                      value={formData.wordCount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          wordCount: parseInt(e.target.value) || 0,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="readabilityScore">Readability Score</Label>
                    <Input
                      id="readabilityScore"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.readabilityScore}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          readabilityScore: parseInt(e.target.value) || 0,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="keywordDensity">Keyword Density (%)</Label>
                    <Input
                      id="keywordDensity"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.keywordDensity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          keywordDensity: parseInt(e.target.value) || 0,
                        })
                      }
                      required
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Content */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Article Content</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Generated article content - fully editable
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">
                      {formData.content.length} characters
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formData.content.split(/\s+/).filter(Boolean).length} words
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <div className="relative">
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) =>
                        setFormData({ ...formData, content: e.target.value })
                      }
                      rows={25}
                      className="font-mono text-sm min-h-[500px] resize-y"
                      required
                      placeholder="Generated article content will appear here..."
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Full article content in markdown or plain text format. Edit the generated content as needed.
                    </p>
                    {formData.content && (
                      <span className="text-xs text-muted-foreground">
                        Last updated: {draft.updatedAt ? new Date(draft.updatedAt).toLocaleString() : 'N/A'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Article Image */}
              {(draft as any).imageUrl && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Article Image</h3>
                    <div className="rounded-lg border overflow-hidden">
                      <img
                        src={(draft as any).imageUrl}
                        alt={formData.title}
                        className="w-full h-auto object-cover max-h-64"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      AI-generated image for this article
                    </p>
                  </div>
                </div>
              )}

              <Separator />

              {/* Additional Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Additional Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="prUrl">Pull Request URL</Label>
                  <Input
                    id="prUrl"
                    type="url"
                    value={formData.prUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, prUrl: e.target.value })
                    }
                    placeholder="https://github.com/owner/repo/pull/123"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frontmatter">Frontmatter (JSON)</Label>
                  <Textarea
                    id="frontmatter"
                    value={formData.frontmatter}
                    onChange={(e) =>
                      setFormData({ ...formData, frontmatter: e.target.value })
                    }
                    rows={8}
                    className="font-mono text-xs"
                    placeholder='{\n  "author": "John Doe",\n  "tags": ["tech", "ai"]\n}'
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter valid JSON or leave empty. This will be parsed and stored as frontmatter.
                  </p>
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4 mt-4 border-t shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

