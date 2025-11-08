import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Website } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Loader2, RefreshCw, FileText, Lightbulb, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

export default function WebsiteConfig() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute<{ siteId: string }>("/websites/:siteId/config");
  const siteId = params?.siteId;
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    // General
  name: "",
  url: "",
  keywords: "",
    
    // Target Audience
    audience: "",
    tone: "",
    style: "",
    complexity: "medium",
    
    // CTA
    ctaText: "",
    ctaUrl: "",
    
    // Advanced
    autoApprove: false,
    autoDraft: false,
    githubRepo: "",
    githubBranch: "main",
    githubPath: "blog",
    minWordCount: 1000,
    maxWordCount: 2500,
  });

  // Fetch existing config
  const { data: website, isLoading, refetch: refetchWebsite } = useQuery<Website & { scrapedData?: any; lastScraped?: string }>({
    queryKey: ["/api/websites", siteId],
    queryFn: async () => {
      const response = await apiRequest(`/api/websites/${siteId}`, "GET");
      return response;
    },
    enabled: !!siteId,
  });

  // Fetch scraping status
  const { data: scrapingStatus, refetch: refetchStatus } = useQuery({
    queryKey: ["/api/websites", siteId, "scraping-status"],
    queryFn: async () => {
      const response = await apiRequest(`/api/websites/${siteId}/scraping-status`, "GET");
      return response;
    },
    enabled: !!siteId,
  });

  const [isScraping, setIsScraping] = useState(false);
  const [scrapingProgress, setScrapingProgress] = useState(0);

  // Mutation to trigger scraping
  const triggerScrape = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/websites/${siteId}/scrape`, "POST");
    },
    onSuccess: () => {
      setIsScraping(true);
      setScrapingProgress(0);
      toast({
        title: "Scraping Started",
        description: "Website scraping has started. This may take a few minutes.",
      });
      
      // Store interval IDs for cleanup
      let progressInterval: NodeJS.Timeout;
      let pollInterval: NodeJS.Timeout;
      let timeoutId: NodeJS.Timeout;
      let pollCount = 0;
      const startTime = Date.now();

      // Simulate progress (since we don't have real-time progress updates)
      progressInterval = setInterval(() => {
        setScrapingProgress((prev) => {
          if (prev >= 90) {
            return 90; // Don't go to 100% until scraping is actually done
          }
          return prev + 5;
        });
      }, 2000);

      // Poll for scraping completion
      const previousLastScraped = scrapingStatus?.lastScraped;
      pollInterval = setInterval(async () => {
        pollCount++;
        try {
          const status = await apiRequest(`/api/websites/${siteId}/scraping-status`, "GET");
          // Check if scraping just completed (has data and lastScraped changed or is recent)
          if (status.isScraped && status.lastScraped) {
            const lastScrapedTime = new Date(status.lastScraped).getTime();
            const now = Date.now();
            const timeSinceScrape = now - lastScrapedTime;
            
            // If lastScraped changed (new scrape) or scraped within the last 2 minutes
            const isNewScrape = !previousLastScraped || 
                               new Date(previousLastScraped).getTime() !== lastScrapedTime;
            
            if (isNewScrape || (timeSinceScrape < 120000 && pollCount >= 2)) {
              clearInterval(pollInterval);
              clearInterval(progressInterval);
              clearTimeout(timeoutId);
              setScrapingProgress(100);
              
              // Small delay to show 100% before hiding
              setTimeout(async () => {
                setIsScraping(false);
                
                // Refetch data
                await refetchWebsite();
                await refetchStatus();
                
                toast({
                  title: "Scraping Complete! ✅",
                  description: `Successfully extracted ${status.stats?.faqsCount || 0} FAQs, ${status.stats?.keyTopicsCount || 0} topics, and ${status.stats?.primaryKeywordsCount || 0} keywords.`,
                });
              }, 500);
            }
          }
        } catch (error) {
          // Continue polling on error
        }
      }, 3000); // Poll every 3 seconds

      // Timeout after 5 minutes
      timeoutId = setTimeout(() => {
        clearInterval(pollInterval);
        clearInterval(progressInterval);
        setIsScraping(false);
        setScrapingProgress(0);
        toast({
          title: "Scraping Timeout",
          description: "Scraping is taking longer than expected. Please check back later.",
          variant: "destructive",
        });
      }, 300000); // 5 minutes timeout
    },
    onError: (error: any) => {
      setIsScraping(false);
      setScrapingProgress(0);
      toast({
        title: "Error",
        description: error.message || "Failed to trigger scraping",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (website) {
      setFormData(prevData => ({
        ...prevData,
        name: website.name,
        url: website.url,
        keywords: (website.keywords || []).join(", "),
        audience: website.audience || "",
        tone: website.tone || "",
        ctaText: (website as any).ctaText || "",
        ctaUrl: (website as any).ctaUrl || "",
        githubRepo: website.githubRepo || "",
        githubBranch: website.githubBranch || "main",
        githubPath: website.githubPath || "blog",
      }));
    }
  }, [website]);
  const updateWebsite = useMutation({
    mutationFn: async (data: any) => {
      // Only send fields that exist in the Website schema
      const updateData: any = {
        name: data.name,
        url: data.url,
        keywords: data.keywords 
          ? data.keywords.split(",").map((k: string) => k.trim()).filter((k: string) => k.length > 0)
          : [],
        tone: data.tone || null,
        audience: data.audience || null,
        ctaText: data.ctaText || null,
        ctaUrl: data.ctaUrl || null,
        githubRepo: data.githubRepo || null,
        githubBranch: data.githubBranch || "main",
        githubPath: data.githubPath || "blog",
      };

      return apiRequest(`/api/websites/${siteId}`, "PATCH", updateData);
    },
    onSuccess: async () => {
      // Refetch the website data to get the updated values
      await refetchWebsite();
      queryClient.invalidateQueries({ queryKey: ["/api/websites", siteId] });
      queryClient.invalidateQueries({ queryKey: ["/api/websites"] });
      toast({
        title: "Website Updated",
        description: "Your website settings have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update website",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateWebsite.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => setLocation("/websites")}
          className="items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Website Configuration</h1>
          <p className="text-muted-foreground mt-1">
            Configure your website's content generation settings and preferences.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <CardContent className="pt-6">
            <Accordion type="single" collapsible className="w-full" defaultValue="general">
              <AccordionItem value="general">
                <AccordionTrigger>General Settings</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">Website Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="My Tech Blog"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="url">Website URL</Label>
                        <Input
                          id="url"
                          type="url"
                          value={formData.url}
                          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                          placeholder="https://example.com"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                      <Input
                        id="keywords"
                        value={formData.keywords}
                        onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                        placeholder="technology, programming, AI"
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="audience">
                <AccordionTrigger>Target Audience</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="audience">Target Audience</Label>
                      <Input
                        id="audience"
                        value={formData.audience}
                        onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                        placeholder="e.g., Tech professionals, developers"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tone">Content Tone</Label>
                      <Input
                        id="tone"
                        value={formData.tone}
                        onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                        placeholder="Professional and informative"
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="cta">
                <AccordionTrigger>Call to Action</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="ctaText">CTA Text</Label>
                      <Input
                        id="ctaText"
                        value={formData.ctaText}
                        onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                        placeholder="Learn More"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ctaUrl">CTA URL</Label>
                      <Input
                        id="ctaUrl"
                        value={formData.ctaUrl}
                        onChange={(e) => setFormData({ ...formData, ctaUrl: e.target.value })}
                        placeholder="https://example.com/signup"
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="scraped-data">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <span>Scraped Data & SEO Insights</span>
                    {scrapingStatus?.isScraped && (
                      <Badge variant="outline" className="ml-2">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Analyzed
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-6">
                    {/* Loading Progress Bar */}
                    {isScraping && (
                      <Card>
                        <CardContent className="pt-6">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Scraping in progress...
                              </span>
                              <span className="text-muted-foreground font-semibold">{scrapingProgress}%</span>
                            </div>
                            <Progress value={scrapingProgress} className="h-2" />
                            <p className="text-xs text-muted-foreground">
                              Analyzing website content and extracting SEO insights. This may take a few minutes.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {scrapingStatus?.isScraped && !isScraping ? (
                      <>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Last scraped: {scrapingStatus.lastScraped 
                                ? new Date(scrapingStatus.lastScraped).toLocaleString() 
                                : "Never"}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => triggerScrape.mutate()}
                            disabled={triggerScrape.isPending || isScraping}
                          >
                            {triggerScrape.isPending || isScraping ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Scraping...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Re-scrape
                              </>
                            )}
                          </Button>
                        </div>

                        {scrapingStatus.stats && (
                          <>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              <Card>
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    FAQs
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="text-2xl font-bold">{scrapingStatus.stats.faqsCount}</div>
                                </CardContent>
                              </Card>
                              <Card>
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Lightbulb className="h-4 w-4" />
                                    Key Topics
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="text-2xl font-bold">{scrapingStatus.stats.keyTopicsCount}</div>
                                </CardContent>
                              </Card>
                              <Card>
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4" />
                                    Keywords
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="text-2xl font-bold">{scrapingStatus.stats.primaryKeywordsCount}</div>
                                </CardContent>
                              </Card>
                            </div>

                            {scrapingStatus.summary && (
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-sm">Summary</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <p className="text-sm text-muted-foreground">{scrapingStatus.summary}</p>
                                </CardContent>
                              </Card>
                            )}

                            {website?.scrapedData && (
                              <>
                                {website.scrapedData.faqs && website.scrapedData.faqs.length > 0 && (
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="text-sm">Top FAQs</CardTitle>
                                      <CardDescription>
                                        Frequently asked questions extracted from your website
                                      </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                      {website.scrapedData.faqs.slice(0, 5).map((faq: any, index: number) => (
                                        <div key={index} className="space-y-2">
                                          <div className="flex items-start gap-2">
                                            <Badge variant="secondary" className="mt-1">Q{index + 1}</Badge>
                                            <p className="text-sm font-medium">{faq.question}</p>
                                          </div>
                                          <p className="text-sm text-muted-foreground ml-8">{faq.answer}</p>
                                          {index < website.scrapedData.faqs.length - 1 && <Separator />}
                                        </div>
                                      ))}
                                    </CardContent>
                                  </Card>
                                )}

                                {website.scrapedData.keyTopics && website.scrapedData.keyTopics.length > 0 && (
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="text-sm">Key Topics</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="flex flex-wrap gap-2">
                                        {website.scrapedData.keyTopics.map((topic: string, index: number) => (
                                          <Badge key={index} variant="outline">{topic}</Badge>
                                        ))}
                                      </div>
                                    </CardContent>
                                  </Card>
                                )}

                                {website.scrapedData.seoInsights && (
                                  <div className="space-y-4">
                                    {website.scrapedData.seoInsights.primaryKeywords && website.scrapedData.seoInsights.primaryKeywords.length > 0 && (
                                      <Card>
                                        <CardHeader>
                                          <CardTitle className="text-sm">Primary SEO Keywords</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                          <div className="flex flex-wrap gap-2">
                                            {website.scrapedData.seoInsights.primaryKeywords.map((keyword: string, index: number) => (
                                              <Badge key={index} variant="default">{keyword}</Badge>
                                            ))}
                                          </div>
                                        </CardContent>
                                      </Card>
                                    )}

                                    {website.scrapedData.seoInsights.recommendedTopics && website.scrapedData.seoInsights.recommendedTopics.length > 0 && (
                                      <Card>
                                        <CardHeader>
                                          <CardTitle className="text-sm">Recommended Article Topics</CardTitle>
                                          <CardDescription>
                                            Topics identified to improve SEO coverage
                                          </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                            {website.scrapedData.seoInsights.recommendedTopics.map((topic: string, index: number) => (
                                              <li key={index}>{topic}</li>
                                            ))}
                                          </ul>
                                        </CardContent>
                                      </Card>
                                    )}

                                    {website.scrapedData.seoInsights.contentGaps && website.scrapedData.seoInsights.contentGaps.length > 0 && (
                                      <Card>
                                        <CardHeader>
                                          <CardTitle className="text-sm">Content Gaps</CardTitle>
                                          <CardDescription>
                                            Topics not covered but should be addressed
                                          </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                            {website.scrapedData.seoInsights.contentGaps.map((gap: string, index: number) => (
                                              <li key={index}>{gap}</li>
                                            ))}
                                          </ul>
                                        </CardContent>
                                      </Card>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </>
                        )}
                      </>
                     ) : !isScraping ? (
                       <div className="text-center py-8 space-y-4">
                         <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
                         <div>
                           <h3 className="text-lg font-semibold">No Scraped Data Yet</h3>
                           <p className="text-sm text-muted-foreground mt-1">
                             Scrape your website to extract FAQs, keywords, and SEO insights
                           </p>
                         </div>
                         <Button
                           type="button"
                           onClick={() => triggerScrape.mutate()}
                           disabled={triggerScrape.isPending || isScraping}
                         >
                           {triggerScrape.isPending || isScraping ? (
                             <>
                               <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                               Scraping...
                             </>
                           ) : (
                             <>
                               <RefreshCw className="h-4 w-4 mr-2" />
                               Start Scraping
                             </>
                           )}
                         </Button>
                       </div>
                     ) : null}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="advanced">
                <AccordionTrigger>Advanced Settings</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Auto Approve Ideas</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically approve generated article ideas
                        </p>
                      </div>
                      <Switch
                        checked={formData.autoApprove}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, autoApprove: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Auto Generate Drafts</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically generate article drafts for approved ideas
                        </p>
                      </div>
                      <Switch
                        checked={formData.autoDraft}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, autoDraft: checked })
                        }
                      />
                    </div>
                    <div className="space-y-4 pt-4">
                      <div>
                        <h3 className="text-sm font-medium mb-4">GitHub Integration</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="githubRepo">GitHub Repository</Label>
                            <Input
                              id="githubRepo"
                              value={formData.githubRepo}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  githubRepo: e.target.value,
                                })
                              }
                              placeholder="username/repo"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="githubBranch">Branch</Label>
                            <Input
                              id="githubBranch"
                              value={formData.githubBranch}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  githubBranch: e.target.value,
                                })
                              }
                              placeholder="main"
                            />
                          </div>
                        </div>
                        <div className="space-y-2 mt-4">
                          <Label htmlFor="githubPath">Path</Label>
                          <Input
                            id="githubPath"
                            value={formData.githubPath}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                githubPath: e.target.value,
                              })
                            }
                            placeholder="blog"
                          />
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <h3 className="text-sm font-medium mb-4">Word Count Settings</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="minWordCount">Minimum Word Count</Label>
                            <Input
                              id="minWordCount"
                              type="number"
                              value={formData.minWordCount}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  minWordCount: parseInt(e.target.value) || 1000,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="maxWordCount">Maximum Word Count</Label>
                            <Input
                              id="maxWordCount"
                              type="number"
                              value={formData.maxWordCount}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  maxWordCount: parseInt(e.target.value) || 2500,
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            size="lg"
            disabled={updateWebsite.isPending}
          >
            {updateWebsite.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
