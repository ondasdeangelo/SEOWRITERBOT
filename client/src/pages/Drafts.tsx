import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import DraftCard from "@/components/DraftCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Draft, Website } from "@shared/schema";

export default function Drafts() {
  const { toast } = useToast();
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>("");

  const { data: websites = [] } = useQuery<Website[]>({
    queryKey: ["/api/websites"],
  });

  const { data: drafts = [], isLoading } = useQuery<Draft[]>({
    queryKey: ["/api/websites", selectedWebsiteId, "drafts"],
    enabled: !!selectedWebsiteId,
  });

  const pushToGitHub = useMutation({
    mutationFn: async (draftId: string) => {
      return apiRequest(`/api/drafts/${draftId}/push-to-github`, "POST") as unknown as { prUrl: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/websites", selectedWebsiteId, "drafts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Pushed to GitHub",
        description: `Pull request created: ${data.prUrl}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to push to GitHub",
        variant: "destructive",
      });
    },
  });

  const handleView = (title: string) => {
    toast({
      title: "View Draft",
      description: `Opening "${title}"`,
    });
  };

  const handleEdit = (title: string) => {
    toast({
      title: "Edit Draft",
      description: `Editing "${title}"`,
    });
  };

  const handlePush = (id: string) => {
    pushToGitHub.mutate(id);
  };

  const handleDownload = (title: string, content: string) => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-")}.mdx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: "Download Started",
      description: `Downloading "${title}.mdx"`,
    });
  };

  const draftsByStatus = {
    draft: drafts.filter(d => d.status === "draft"),
    review: drafts.filter(d => d.status === "review"),
    pr_created: drafts.filter(d => d.status === "pr_created"),
    merged: drafts.filter(d => d.status === "merged"),
  };

  useEffect(() => {
    if (!selectedWebsiteId && websites.length > 0) {
      setSelectedWebsiteId(websites[0].id);
    }
  }, [websites, selectedWebsiteId]);

  if (websites.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please add a website first to generate drafts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Drafts</h1>
          <p className="text-muted-foreground mt-1">
            Manage and publish your AI-generated article drafts.
          </p>
        </div>
        <Select value={selectedWebsiteId} onValueChange={setSelectedWebsiteId}>
          <SelectTrigger className="w-[200px]" data-testid="select-website">
            <SelectValue placeholder="Select website" />
          </SelectTrigger>
          <SelectContent>
            {websites.map((website) => (
              <SelectItem key={website.id} value={website.id}>
                {website.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all">
              All ({drafts.length})
            </TabsTrigger>
            <TabsTrigger value="draft" data-testid="tab-draft">
              Draft ({draftsByStatus.draft.length})
            </TabsTrigger>
            <TabsTrigger value="review" data-testid="tab-review">
              Review ({draftsByStatus.review.length})
            </TabsTrigger>
            <TabsTrigger value="published" data-testid="tab-published">
              Published ({draftsByStatus.pr_created.length + draftsByStatus.merged.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="grid gap-6 md:grid-cols-2">
            {drafts.map((draft) => (
              <DraftCard
                key={draft.id}
                title={draft.title}
                excerpt={draft.excerpt}
                wordCount={draft.wordCount}
                readabilityScore={draft.readabilityScore}
                keywordDensity={draft.keywordDensity}
                status={draft.status}
                prUrl={draft.prUrl || undefined}
                onView={() => handleView(draft.title)}
                onEdit={() => handleEdit(draft.title)}
                onPushToGitHub={() => handlePush(draft.id)}
                onDownload={() => handleDownload(draft.title, draft.content)}
              />
            ))}
            {drafts.length === 0 && (
              <div className="col-span-2 text-center py-12">
                <p className="text-muted-foreground">No drafts yet. Approve some article ideas first!</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="draft" className="grid gap-6 md:grid-cols-2">
            {draftsByStatus.draft.map((draft) => (
              <DraftCard
                key={draft.id}
                title={draft.title}
                excerpt={draft.excerpt}
                wordCount={draft.wordCount}
                readabilityScore={draft.readabilityScore}
                keywordDensity={draft.keywordDensity}
                status={draft.status}
                onView={() => handleView(draft.title)}
                onEdit={() => handleEdit(draft.title)}
                onPushToGitHub={() => handlePush(draft.id)}
                onDownload={() => handleDownload(draft.title, draft.content)}
              />
            ))}
            {draftsByStatus.draft.length === 0 && (
              <div className="col-span-2 text-center py-12">
                <p className="text-muted-foreground">No draft articles.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="review" className="grid gap-6 md:grid-cols-2">
            {draftsByStatus.review.map((draft) => (
              <DraftCard
                key={draft.id}
                title={draft.title}
                excerpt={draft.excerpt}
                wordCount={draft.wordCount}
                readabilityScore={draft.readabilityScore}
                keywordDensity={draft.keywordDensity}
                status={draft.status}
                onView={() => handleView(draft.title)}
                onEdit={() => handleEdit(draft.title)}
                onPushToGitHub={() => handlePush(draft.id)}
                onDownload={() => handleDownload(draft.title, draft.content)}
              />
            ))}
            {draftsByStatus.review.length === 0 && (
              <div className="col-span-2 text-center py-12">
                <p className="text-muted-foreground">No articles in review.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="published" className="grid gap-6 md:grid-cols-2">
            {[...draftsByStatus.pr_created, ...draftsByStatus.merged].map((draft) => (
              <DraftCard
                key={draft.id}
                title={draft.title}
                excerpt={draft.excerpt}
                wordCount={draft.wordCount}
                readabilityScore={draft.readabilityScore}
                keywordDensity={draft.keywordDensity}
                status={draft.status}
                prUrl={draft.prUrl || undefined}
                onView={() => handleView(draft.title)}
                onEdit={() => handleEdit(draft.title)}
                onDownload={() => handleDownload(draft.title, draft.content)}
              />
            ))}
            {draftsByStatus.pr_created.length + draftsByStatus.merged.length === 0 && (
              <div className="col-span-2 text-center py-12">
                <p className="text-muted-foreground">No published articles yet.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
