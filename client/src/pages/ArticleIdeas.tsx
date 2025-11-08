import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import ArticleIdeaCard from "@/components/ArticleIdeaCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
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
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<"scraping" | "generating" | null>(null);
  const [draftGenerationProgress, setDraftGenerationProgress] = useState<Record<string, number>>({});
  const [generatingDraftId, setGeneratingDraftId] = useState<string | null>(null);

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
      // Set generating state immediately for this specific idea
      setGeneratingDraftId(ideaId);
      setDraftGenerationProgress(prev => ({ ...prev, [ideaId]: 0 }));
      
      // Simulate progress
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 90) {
          progress = 90;
          clearInterval(progressInterval);
        }
        setDraftGenerationProgress(prev => ({ ...prev, [ideaId]: progress }));
      }, 500);

      try {
        const result = await apiRequest(`/api/ideas/${ideaId}/generate-draft`, "POST");
        clearInterval(progressInterval);
        setDraftGenerationProgress(prev => ({ ...prev, [ideaId]: 100 }));
        return { result, ideaId };
      } catch (error) {
        clearInterval(progressInterval);
        throw { error, ideaId };
      }
    },
    onSuccess: (data) => {
      const ideaId = data.ideaId;
      queryClient.invalidateQueries({ queryKey: ["/api/websites", selectedWebsiteId, "drafts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/websites", selectedWebsiteId, "ideas"] });
      
      // Clear progress after a delay for this specific idea
      setTimeout(() => {
        setDraftGenerationProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[ideaId];
          return newProgress;
        });
        setGeneratingDraftId(prev => prev === ideaId ? null : prev);
      }, 1000);
      
      toast({
        title: "Draft Generated! ✅",
        description: "Article draft has been generated successfully!",
      });
    },
    onError: (errorData: any) => {
      const ideaId = errorData?.ideaId || generatingDraftId;
      if (ideaId) {
        setDraftGenerationProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[ideaId];
          return newProgress;
        });
        setGeneratingDraftId(prev => prev === ideaId ? null : prev);
      }
      toast({
        title: "Error",
        description: errorData?.error?.message || errorData?.message || "Failed to generate draft",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (id: string, headline: string) => {
    updateIdea.mutate(
      { id, data: { status: "approved" } },
      {
        onSuccess: () => {
          // Automatically generate draft when approved
          generateDraft.mutate(id, {
            onSuccess: () => {
              toast({
                title: "Approved & Draft Generated",
                description: `"${headline}" has been approved and draft generated successfully!`,
              });
            },
            onError: (error: any) => {
              toast({
                title: "Approved",
                description: `"${headline}" has been approved, but draft generation failed: ${error.message || "Unknown error"}`,
                variant: "destructive",
              });
            },
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

  const handleApproveAll = async () => {
    if (pendingIdeas.length === 0) return;

    setIsProcessingAll(true);
    try {
      // Approve all pending ideas
      const approvePromises = pendingIdeas.map(idea =>
        updateIdea.mutateAsync({ id: idea.id, data: { status: "approved" } })
      );

      await Promise.all(approvePromises);

      // Generate drafts for all approved ideas (in parallel, but continue even if some fail)
      const draftResults = await Promise.allSettled(
        pendingIdeas.map(idea => generateDraft.mutateAsync(idea.id))
      );

      const successfulDrafts = draftResults.filter(r => r.status === "fulfilled").length;
      const failedDrafts = draftResults.filter(r => r.status === "rejected").length;

      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["/api/websites", selectedWebsiteId, "ideas"] });
      queryClient.invalidateQueries({ queryKey: ["/api/websites", selectedWebsiteId, "drafts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });

      if (failedDrafts === 0) {
        toast({
          title: "All Ideas Approved! ✅",
          description: `Approved ${pendingIdeas.length} ideas and generated ${successfulDrafts} drafts successfully.`,
        });
      } else {
        toast({
          title: "Ideas Approved with Some Errors",
          description: `Approved ${pendingIdeas.length} ideas. ${successfulDrafts} drafts generated, ${failedDrafts} failed.`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve all ideas",
        variant: "destructive",
      });
    } finally {
      setIsProcessingAll(false);
    }
  };

  const handleRejectAll = async () => {
    if (pendingIdeas.length === 0) return;

    setIsProcessingAll(true);
    try {
      // Reject all pending ideas
      const rejectPromises = pendingIdeas.map(idea =>
        updateIdea.mutateAsync({ id: idea.id, data: { status: "rejected" } })
      );

      await Promise.all(rejectPromises);

      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["/api/websites", selectedWebsiteId, "ideas"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });

      toast({
        title: "All Ideas Rejected",
        description: `Rejected ${pendingIdeas.length} ideas.`,
        variant: "destructive",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject all ideas",
        variant: "destructive",
      });
    } finally {
      setIsProcessingAll(false);
    }
  };

  const triggerScrape = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/websites/${selectedWebsiteId}/scrape`, "POST");
    },
  });

  const generateIdeas = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/websites/${selectedWebsiteId}/generate-ideas`, "POST");
    },
    onSuccess: (data) => {
      // Set progress to 100% and then refresh data
      setGenerationProgress(100);
      setCurrentPhase(null);
      
      // Small delay to show 100% before refreshing
      setTimeout(async () => {
        // Invalidate and refetch queries to get new data
        await queryClient.invalidateQueries({ queryKey: ["/api/websites", selectedWebsiteId, "ideas"] });
        await queryClient.refetchQueries({ queryKey: ["/api/websites", selectedWebsiteId, "ideas"] });
        
        setIsGenerating(false);
        setGenerationProgress(0);
        
        toast({
          title: "Ideas Generated! ✅",
          description: `Successfully generated ${data?.result?.length || 0} new article ideas!`,
        });
      }, 500);
    },
    onError: (error: any) => {
      setIsGenerating(false);
      setGenerationProgress(0);
      setCurrentPhase(null);
      toast({
        title: "Error",
        description: error.message || "Failed to generate ideas",
        variant: "destructive",
      });
    },
  });

  const handleGenerateIdeas = () => {
    if (!selectedWebsiteId) return;

    setIsGenerating(true);
    setGenerationProgress(0);
    setCurrentPhase("scraping");

    // Store interval references for cleanup
    let scrapingProgressInterval: NodeJS.Timeout | null = null;
    let pollInterval: NodeJS.Timeout | null = null;
    let ideaProgressInterval: NodeJS.Timeout | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (scrapingProgressInterval) clearInterval(scrapingProgressInterval);
      if (pollInterval) clearInterval(pollInterval);
      if (ideaProgressInterval) clearInterval(ideaProgressInterval);
      if (timeoutId) clearTimeout(timeoutId);
    };

    // Step 1: Trigger scraping
    toast({
      title: "Scraping Started",
      description: "Analyzing website content. This may take a few moments...",
    });

    triggerScrape.mutateAsync()
      .then(async () => {
        // Step 2: Poll for scraping completion
        let scrapingProgress = 0;
        scrapingProgressInterval = setInterval(() => {
          scrapingProgress += Math.random() * 8; // Increment by 0-8% each interval
          if (scrapingProgress >= 45) {
            scrapingProgress = 45; // Cap at 45% for scraping phase
          }
          setGenerationProgress(scrapingProgress);
        }, 500);

        let pollCount = 0;
        let previousLastScraped: string | null = null;

        // Get initial scraping status
        try {
          const initialStatus = await apiRequest(`/api/websites/${selectedWebsiteId}/scraping-status`, "GET");
          previousLastScraped = initialStatus.lastScraped || null;
        } catch (error) {
          // Continue if status check fails
        }

        pollInterval = setInterval(async () => {
          pollCount++;
          try {
            const status = await apiRequest(`/api/websites/${selectedWebsiteId}/scraping-status`, "GET");
            
            if (status.isScraped && status.lastScraped) {
              const lastScrapedTime = new Date(status.lastScraped).getTime();
              const now = Date.now();
              const timeSinceScrape = now - lastScrapedTime;
              
              // Check if scraping just completed (new scrape or recent)
              const isNewScrape = !previousLastScraped || 
                                 new Date(previousLastScraped).getTime() !== lastScrapedTime;
              
              if (isNewScrape || (timeSinceScrape < 120000 && pollCount >= 2)) {
                if (pollInterval) clearInterval(pollInterval);
                if (scrapingProgressInterval) clearInterval(scrapingProgressInterval);
                
                // Scraping complete - move to 50%
                setGenerationProgress(50);
                setCurrentPhase("generating");
                
                // Step 3: Generate ideas
                let ideaProgress = 50;
                ideaProgressInterval = setInterval(() => {
                  ideaProgress += Math.random() * 10; // Increment by 0-10% each interval
                  if (ideaProgress >= 90) {
                    ideaProgress = 90; // Cap at 90% until API completes
                    if (ideaProgressInterval) clearInterval(ideaProgressInterval);
                  }
                  setGenerationProgress(ideaProgress);
                }, 500);

                // Generate ideas
                generateIdeas.mutate(undefined, {
                  onSettled: () => {
                    if (ideaProgressInterval) clearInterval(ideaProgressInterval);
                  },
                });
              }
            }
          } catch (error) {
            // Continue polling on error
          }
        }, 3000); // Poll every 3 seconds

        // Timeout after 5 minutes
        timeoutId = setTimeout(() => {
          cleanup();
          setIsGenerating(false);
          setGenerationProgress(0);
          setCurrentPhase(null);
          toast({
            title: "Scraping Timeout",
            description: "Scraping is taking longer than expected. Please try again later.",
            variant: "destructive",
          });
        }, 300000); // 5 minutes
      })
      .catch((error: any) => {
        cleanup();
        setIsGenerating(false);
        setGenerationProgress(0);
        setCurrentPhase(null);
        toast({
          title: "Error",
          description: error.message || "Failed to start scraping",
          variant: "destructive",
        });
      });
  };

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
          <Button
            data-testid="button-generate-more"
            disabled={!selectedWebsiteId || isGenerating}
            onClick={handleGenerateIdeas}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate More Ideas"
            )}
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      {isGenerating && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {currentPhase === "scraping" 
                ? "Scraping website content..." 
                : currentPhase === "generating"
                ? "Generating article ideas..."
                : "Processing..."}
            </span>
            <span className="text-muted-foreground font-semibold">{Math.round(generationProgress)}%</span>
          </div>
          <Progress value={generationProgress} className="h-2" />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {currentPhase === "scraping" 
                ? "Analyzing website content and extracting SEO insights. This may take a few minutes."
                : currentPhase === "generating"
                ? "AI is generating new article ideas based on the scraped data."
                : "Processing your request..."}
            </p>
            {currentPhase && (
              <div className="flex gap-1">
                <div className={`h-2 w-2 rounded-full ${currentPhase === "scraping" ? "bg-primary" : "bg-muted"}`} />
                <div className={`h-2 w-2 rounded-full ${currentPhase === "generating" ? "bg-primary" : "bg-muted"}`} />
              </div>
            )}
          </div>
        </div>
      )}

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
                <Button 
                  variant="outline" 
                  size="sm" 
                  data-testid="button-approve-all"
                  onClick={handleApproveAll}
                  disabled={isProcessingAll || updateIdea.isPending || generateDraft.isPending}
                >
                  {isProcessingAll ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Approve All (${pendingIdeas.length})`
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  data-testid="button-reject-all"
                  onClick={handleRejectAll}
                  disabled={isProcessingAll || updateIdea.isPending}
                >
                  {isProcessingAll ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Reject All (${pendingIdeas.length})`
                  )}
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
                <div key={idea.id} className="space-y-2">
                  <ArticleIdeaCard
                    headline={idea.headline}
                    confidence={idea.confidence}
                    keywords={idea.keywords}
                    estimatedWords={idea.estimatedWords}
                    seoScore={idea.seoScore}
                    status="approved"
                    priority={index + 1}
                    scheduledDate={idea.scheduledDate ? new Date(idea.scheduledDate).toLocaleString() : undefined}
                    onGenerateDraft={() => generateDraft.mutate(idea.id)}
                    isGenerating={generatingDraftId === idea.id}
                  />
                  {generatingDraftId === idea.id && draftGenerationProgress[idea.id] !== undefined && (
                    <div className="space-y-2 px-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Generating draft...
                        </span>
                        <span className="text-muted-foreground font-semibold">
                          {Math.round(draftGenerationProgress[idea.id])}%
                        </span>
                      </div>
                      <Progress value={draftGenerationProgress[idea.id]} className="h-1.5" />
                    </div>
                  )}
                </div>
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
