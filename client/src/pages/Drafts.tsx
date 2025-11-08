import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import DraftCard from "@/components/DraftCard";
import DraftViewDialog from "@/components/DraftViewDialog";
import DraftEditDialog from "@/components/DraftEditDialog";
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
  const [activeTab, setActiveTab] = useState<string>("draft");
  const [viewingDraft, setViewingDraft] = useState<Draft | null>(null);
  const [editingDraft, setEditingDraft] = useState<Draft | null>(null);
  const [editingDraftTab, setEditingDraftTab] = useState<string>("draft");

  const { data: websites = [] } = useQuery<Website[]>({
    queryKey: ["/api/websites"],
  });

  const { data: drafts = [] } = useQuery<Draft[]>({
    queryKey: ["/api/websites", selectedWebsiteId, "drafts"],
    enabled: !!selectedWebsiteId,
  });


  const updateDraftStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "draft" | "review" | "pr_created" | "merged" }) => {
      return apiRequest(`/api/drafts/${id}`, "PATCH", { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/websites", selectedWebsiteId, "drafts"] });
      toast({
        title: "Status Updated",
        description: "Draft status has been updated successfully.",
      });
    },
  });

  const updateDraft = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Draft> }) => {
      return apiRequest(`/api/drafts/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/websites", selectedWebsiteId, "drafts"] });
      toast({
        title: "Draft Updated",
        description: "Draft has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update draft",
        variant: "destructive",
      });
    },
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
      setActiveTab("published");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to push to GitHub",
        variant: "destructive",
      });
    },
  });

  const handleView = (draft: Draft) => {
    setViewingDraft(draft);
  };

  const handleEdit = (draft: Draft, fromTab?: string) => {
    setEditingDraft(draft);
    // Determine status based on which tab the draft is in
    const tabStatus = fromTab || activeTab;
    setEditingDraftTab(tabStatus);
  };

  const handleSaveDraft = async (id: string, data: Partial<Draft>) => {
    await updateDraft.mutateAsync({ id, data });
  };

  const handleDraftAction = (id: string, action: "review" | "publish" | "reject") => {
    if (action === "publish") {
      pushToGitHub.mutate(id);
    } else if (action === "review" || action === "reject") {
      updateDraftStatus.mutate({ id, status: action === "review" ? "review" : "draft" });
    }
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
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
                imageUrl={(draft as any).imageUrl}
                onView={() => handleView(draft)}
                onEdit={() => handleEdit(draft, "draft")}
                onSendToReview={() => handleDraftAction(draft.id, "review")}
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
                imageUrl={(draft as any).imageUrl}
                onView={() => handleView(draft)}
                onEdit={() => handleEdit(draft, "review")}
                onPublish={() => handleDraftAction(draft.id, "publish")}
                onReject={() => handleDraftAction(draft.id, "reject")}
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
                imageUrl={(draft as any).imageUrl}
                onView={() => handleView(draft)}
                onEdit={() => handleEdit(draft, "published")}
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

      <DraftViewDialog
        draft={viewingDraft}
        open={!!viewingDraft}
        onOpenChange={(open) => !open && setViewingDraft(null)}
      />

      <DraftEditDialog
        draft={editingDraft}
        open={!!editingDraft}
        onOpenChange={(open) => !open && setEditingDraft(null)}
        onSave={handleSaveDraft}
        isSaving={updateDraft.isPending}
        defaultStatus={
          editingDraftTab === "draft" 
            ? "draft" 
            : editingDraftTab === "review" 
            ? "review" 
            : editingDraftTab === "published"
            ? editingDraft?.status || "pr_created" // Use draft's actual status for published tab
            : editingDraft?.status || "draft"
        }
      />
    </div>
  );
}
