import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import ArticleIdeaCard from "@/components/ArticleIdeaCard";
import { Button } from "@/components/ui/button";
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
import type { ArticleIdea, Website } from "@shared/schema";

export default function ArticleIdeas() {
  const { toast } = useToast();
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>("");

  const { data: websites = [] } = useQuery<Website[]>({
    queryKey: ["/api/websites"],
  });

  const { data: ideas = [], isLoading } = useQuery<ArticleIdea[]>({
    queryKey: ["/api/websites", selectedWebsiteId, "ideas"],
    enabled: !!selectedWebsiteId,
  });

  const updateIdea = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ArticleIdea> }) => {
      return apiRequest(`/api/ideas/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/websites", selectedWebsiteId, "ideas"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });

  const generateDraft = useMutation({
    mutationFn: async (ideaId: string) => {
      return apiRequest(`/api/ideas/${ideaId}/generate-draft`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/websites", selectedWebsiteId, "drafts"] });
      toast({
        title: "Draft Generated",
        description: "Article draft has been generated successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate draft",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (id: string, headline: string) => {
    updateIdea.mutate(
      { id, data: { status: "approved" } },
      {
        onSuccess: () => {
          toast({
            title: "Approved",
            description: `"${headline}" has been approved for drafting.`,
          });
        },
      }
    );
  };

  const handleReject = (id: string, headline: string) => {
    updateIdea.mutate(
      { id, data: { status: "rejected" } },
      {
        onSuccess: () => {
          toast({
            title: "Rejected",
            description: `"${headline}" has been rejected.`,
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleEdit = () => {
    toast({
      title: "Edit Headline",
      description: "Edit functionality coming soon...",
    });
  };

  const pendingIdeas = ideas.filter(idea => idea.status === "pending");
  const approvedIdeas = ideas.filter(idea => idea.status === "approved");

  useEffect(() => {
    if (!selectedWebsiteId && websites.length > 0) {
      setSelectedWebsiteId(websites[0].id);
    }
  }, [websites, selectedWebsiteId]);

  if (websites.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please add a website first to generate article ideas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Article Ideas</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve AI-generated article ideas.
          </p>
        </div>
        <div className="flex items-center gap-4">
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
          <Button data-testid="button-generate-more" disabled={!selectedWebsiteId}>
            Generate More Ideas
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending" data-testid="tab-pending">
              Pending ({pendingIdeas.length})
            </TabsTrigger>
            <TabsTrigger value="approved" data-testid="tab-approved">
              Approved ({approvedIdeas.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-6">
            {pendingIdeas.length > 0 && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" data-testid="button-approve-all">
                  Approve All
                </Button>
                <Button variant="outline" size="sm" data-testid="button-reject-all">
                  Reject All
                </Button>
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              {pendingIdeas.map((idea) => (
                <ArticleIdeaCard
                  key={idea.id}
                  headline={idea.headline}
                  confidence={idea.confidence}
                  keywords={idea.keywords}
                  estimatedWords={idea.estimatedWords}
                  seoScore={idea.seoScore}
                  status="pending"
                  onApprove={() => handleApprove(idea.id, idea.headline)}
                  onReject={() => handleReject(idea.id, idea.headline)}
                  onEdit={handleEdit}
                />
              ))}
            </div>

            {pendingIdeas.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No pending ideas. Generate some new ones!</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {approvedIdeas.map((idea, index) => (
                <ArticleIdeaCard
                  key={idea.id}
                  headline={idea.headline}
                  confidence={idea.confidence}
                  keywords={idea.keywords}
                  estimatedWords={idea.estimatedWords}
                  seoScore={idea.seoScore}
                  status="approved"
                  priority={index + 1}
                  scheduledDate={idea.scheduledDate ? new Date(idea.scheduledDate).toLocaleString() : undefined}
                />
              ))}
            </div>

            {approvedIdeas.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No approved ideas yet.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
