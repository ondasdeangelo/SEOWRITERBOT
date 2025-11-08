import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { openaiService } from "./services/openai";
import { createGitHubService } from "./services/github";
import { websiteAnalyzerService } from "./services/websiteAnalyzer";
import { insertWebsiteSchema, insertArticleIdeaSchema, insertDraftSchema } from "@shared/schema";
import { z } from "zod";
import { supabaseAdmin } from "./lib/supabase";
import { randomUUID } from "crypto";

// Schema for website creation request (omits userId and other server-side fields)
// Matches exactly what the frontend sends, with lenient handling for empty strings
const createWebsiteRequestSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  keywords: z.array(z.string()).default([]),
  tone: z.preprocess((val) => (val === "" || val === undefined ? null : val), z.string().nullable().default(null)),
  audience: z.preprocess((val) => (val === "" || val === undefined ? null : val), z.string().nullable().default(null)),
  status: z.enum(["active", "paused", "error"]).default("active"),
  githubRepo: z.preprocess((val) => (val === "" || val === undefined ? null : val), z.string().nullable().default(null)),
  githubBranch: z.string().default("main"),
  githubPath: z.string().default("blog"),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Temporary auth middleware - in production, use proper authentication
  const mockUserId = "temp-user-id";

  // Ensure temp user exists
  let tempUser = await storage.getUserByUsername("temp");
  if (!tempUser) {
    tempUser = await storage.createUser({
      username: "temp",
      password: "temp",
      githubToken: process.env.GITHUB_TOKEN,
    });
  } else if (process.env.GITHUB_TOKEN && tempUser.githubToken !== process.env.GITHUB_TOKEN) {
    // Always update the temp user's githubToken from env if changed
    tempUser = await storage.updateUserGithubToken(tempUser.id, process.env.GITHUB_TOKEN);
  }

  // Website routes
  app.get("/api/websites", async (req, res) => {
    try {
      const websites = await storage.getWebsitesByUserId(tempUser!.id);
      res.json(websites);
    } catch (error) {
      console.error("Error fetching websites:", error);
      res.status(500).json({ error: "Failed to fetch websites" });
    }
  });

  app.get("/api/websites/:id", async (req, res) => {
    try {
      const website = await storage.getWebsite(req.params.id);
      if (!website) {
        return res.status(404).json({ error: "Website not found" });
      }
      res.json(website);
    } catch (error) {
      console.error("Error fetching website:", error);
      res.status(500).json({ error: "Failed to fetch website" });
    }
  });

  app.post("/api/websites", async (req, res) => {
    try {
      console.log("Received request body:", JSON.stringify(req.body, null, 2));
      
      // Validate request body (without userId since it's added server-side)
      const requestData = createWebsiteRequestSchema.parse(req.body);
      
      console.log("Validated data:", JSON.stringify(requestData, null, 2));
      
      // Generate UUID for the website ID
      const websiteId = randomUUID();
      console.log("Generated website ID:", websiteId);
      
      // Prepare insert data
      const insertData: any = {
        id: websiteId,
        user_id: tempUser!.id,
        name: requestData.name,
        url: requestData.url,
        keywords: requestData.keywords,
        tone: requestData.tone,
        audience: requestData.audience,
        status: requestData.status,
        github_repo: requestData.githubRepo,
        github_branch: requestData.githubBranch,
        github_path: requestData.githubPath,
        total_articles: 0,
      };
      
      console.log("Inserting with data:", JSON.stringify(insertData, null, 2));
      
      // Insert into Supabase
      const { data: website, error } = await supabaseAdmin
        .from("websites")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error("Supabase error creating website:", error);
        // If error is about ID, try without explicitly setting it (let DB generate it)
        if (error.message?.includes('id') && error.message?.includes('null')) {
          console.log("Retrying without explicit ID, letting database generate it...");
          const { data: websiteRetry, error: errorRetry } = await supabaseAdmin
            .from("websites")
            .insert({
              user_id: tempUser!.id,
              name: requestData.name,
              url: requestData.url,
              keywords: requestData.keywords,
              tone: requestData.tone,
              audience: requestData.audience,
              status: requestData.status,
              github_repo: requestData.githubRepo,
              github_branch: requestData.githubBranch,
              github_path: requestData.githubPath,
              total_articles: 0,
            })
            .select()
            .single();
          
          if (errorRetry) {
            console.error("Retry also failed:", errorRetry);
            return res.status(500).json({ error: "Failed to create website in Supabase", details: errorRetry.message });
          }
          
          // Use the retry result
          const transformedWebsite = {
            id: websiteRetry.id,
            userId: websiteRetry.user_id,
            name: websiteRetry.name,
            url: websiteRetry.url,
            keywords: websiteRetry.keywords || [],
            tone: websiteRetry.tone,
            audience: websiteRetry.audience,
            status: websiteRetry.status,
            githubRepo: websiteRetry.github_repo,
            githubBranch: websiteRetry.github_branch,
            githubPath: websiteRetry.github_path,
            totalArticles: websiteRetry.total_articles || 0,
            lastGenerated: websiteRetry.last_generated,
            nextScheduled: websiteRetry.next_scheduled,
            createdAt: websiteRetry.created_at,
            updatedAt: websiteRetry.updated_at,
          };

          // Start auto-scraping for the retry case as well
          console.log(`🚀 Starting auto-scraping for newly added website (retry): ${websiteRetry.id} (${requestData.url})`);
          websiteAnalyzerService.analyzeWebsite(requestData.url)
            .then(async (analysis) => {
              const updateData: any = {
                scraped_data: analysis.analyzedContent,
                last_scraped: analysis.scrapedAt.toISOString(),
              };

              if (analysis.analyzedContent.cta) {
                updateData.cta_text = analysis.analyzedContent.cta.text;
                updateData.cta_url = analysis.analyzedContent.cta.url;
                console.log(`   - CTA auto-generated: "${updateData.cta_text}" → ${updateData.cta_url}`);
              }

              const { error: updateError } = await supabaseAdmin
                .from("websites")
                .update(updateData)
                .eq("id", websiteRetry.id);

              if (updateError) {
                console.error(`❌ Failed to save scraped data for ${websiteRetry.id}:`, updateError);
              } else {
                console.log(`✅ Auto-scraping complete for ${websiteRetry.id}`);
                if (analysis.analyzedContent.cta) {
                  console.log(`   - CTA fields auto-populated`);
                }
              }
            })
            .catch((error) => {
              console.error(`❌ Failed to auto-scrape website ${websiteRetry.id}:`, error);
            });
          
          return res.json(transformedWebsite);
        }
        
        return res.status(500).json({ error: "Failed to create website in Supabase", details: error.message });
      }

      // Transform the response to match the expected format
      const transformedWebsite = {
        id: website.id,
        userId: website.user_id,
        name: website.name,
        url: website.url,
        keywords: website.keywords || [],
        tone: website.tone,
        audience: website.audience,
        status: website.status,
        githubRepo: website.github_repo,
        githubBranch: website.github_branch,
        githubPath: website.github_path,
        totalArticles: website.total_articles || 0,
        lastGenerated: website.last_generated,
        nextScheduled: website.next_scheduled,
        createdAt: website.created_at,
        updatedAt: website.updated_at,
      };

      // Start website scraping and analysis in the background (non-blocking)
      console.log(`🚀 Starting auto-scraping for newly added website: ${website.id} (${requestData.url})`);
      websiteAnalyzerService.analyzeWebsite(requestData.url)
        .then(async (analysis) => {
          // Prepare update data including CTA if available
          const updateData: any = {
            scraped_data: analysis.analyzedContent,
            last_scraped: analysis.scrapedAt.toISOString(),
          };

          // Auto-generate CTA fields from analysis if available
          if (analysis.analyzedContent.cta) {
            updateData.cta_text = analysis.analyzedContent.cta.text;
            updateData.cta_url = analysis.analyzedContent.cta.url;
            console.log(`   - CTA auto-generated: "${updateData.cta_text}" → ${updateData.cta_url}`);
          }

          // Update the website with scraped data and CTA
          const { data: updatedData, error: updateError } = await supabaseAdmin
            .from("websites")
            .update(updateData)
            .eq("id", website.id)
            .select();
          
          if (updateError) {
            console.error(`❌ Failed to save scraped data to database for ${website.id}:`, updateError);
            console.error(`   Error details:`, JSON.stringify(updateError, null, 2));
          } else {
            console.log(`✅ Auto-scraping complete for ${website.id}:`);
            console.log(`   - ${analysis.analyzedContent.faqs.length} FAQs extracted`);
            console.log(`   - ${analysis.analyzedContent.keyTopics.length} key topics identified`);
            console.log(`   - ${analysis.analyzedContent.seoInsights?.primaryKeywords?.length || 0} primary keywords found`);
            if (analysis.analyzedContent.cta) {
              console.log(`   - CTA fields auto-populated`);
            }
            console.log(`   - Data saved successfully to database`);
          }
        })
        .catch((error) => {
          console.error(`❌ Failed to auto-scrape website ${website.id}:`, error);
          console.error(`   Error details:`, error instanceof Error ? error.message : String(error));
          // Don't fail the request if scraping fails
        });

      res.json(transformedWebsite);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", JSON.stringify(error.errors, null, 2));
        console.error("Request body was:", JSON.stringify(req.body, null, 2));
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating website:", error);
      res.status(500).json({ error: "Failed to create website" });
    }
  });

  app.patch("/api/websites/:id", async (req, res) => {
    try {
      const website = await storage.updateWebsite(req.params.id, req.body);
      if (!website) {
        return res.status(404).json({ error: "Website not found" });
      }
      res.json(website);
    } catch (error) {
      console.error("Error updating website:", error);
      res.status(500).json({ error: "Failed to update website" });
    }
  });

  app.delete("/api/websites/:id", async (req, res) => {
    try {
      await storage.deleteWebsite(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting website:", error);
      res.status(500).json({ error: "Failed to delete website" });
    }
  });

  // Endpoint to manually trigger scraping for a website
  app.post("/api/websites/:id/scrape", async (req, res) => {
    try {
      const { data: websiteData, error: fetchError } = await supabaseAdmin
        .from("websites")
        .select("id, url, name")
        .eq("id", req.params.id)
        .single();

      if (fetchError || !websiteData) {
        return res.status(404).json({ error: "Website not found" });
      }

      console.log(`🔄 Manually triggering scrape for: ${websiteData.name} (${websiteData.url})`);

      // Start scraping in background
      websiteAnalyzerService.analyzeWebsite(websiteData.url)
        .then(async (analysis) => {
          // Prepare update data including CTA if available
          const updateData: any = {
            scraped_data: analysis.analyzedContent,
            last_scraped: analysis.scrapedAt.toISOString(),
          };

          // Auto-generate CTA fields from analysis if available
          if (analysis.analyzedContent.cta) {
            updateData.cta_text = analysis.analyzedContent.cta.text;
            updateData.cta_url = analysis.analyzedContent.cta.url;
            console.log(`   - CTA auto-generated: "${updateData.cta_text}" → ${updateData.cta_url}`);
          }

          const { data: updatedData, error: updateError } = await supabaseAdmin
            .from("websites")
            .update(updateData)
            .eq("id", websiteData.id)
            .select();

          if (updateError) {
            console.error(`❌ Failed to save scraped data for ${websiteData.id}:`, updateError);
            console.error(`   Error:`, JSON.stringify(updateError, null, 2));
          } else {
            console.log(`✅ Re-scraping complete for ${websiteData.id}:`);
            console.log(`   - ${analysis.analyzedContent.faqs.length} FAQs extracted`);
            console.log(`   - ${analysis.analyzedContent.keyTopics.length} key topics identified`);
            if (analysis.analyzedContent.cta) {
              console.log(`   - CTA fields auto-generated`);
            }
            console.log(`   - Data saved successfully`);
          }
        })
        .catch((error) => {
          console.error(`❌ Failed to re-scrape website ${websiteData.id}:`, error);
        });

      res.json({ 
        message: "Scraping started in background. Check server logs for progress.",
        websiteId: websiteData.id,
        url: websiteData.url,
        name: websiteData.name,
      });
    } catch (error) {
      console.error("Error triggering scrape:", error);
      res.status(500).json({ error: "Failed to trigger scraping" });
    }
  });

  // Endpoint to check scraping status
  app.get("/api/websites/:id/scraping-status", async (req, res) => {
    try {
      const { data: websiteData, error: fetchError } = await supabaseAdmin
        .from("websites")
        .select("id, url, name, scraped_data, last_scraped")
        .eq("id", req.params.id)
        .single();

      if (fetchError || !websiteData) {
        return res.status(404).json({ error: "Website not found" });
      }

      const hasScrapedData = !!websiteData.scraped_data;
      const scrapedData = websiteData.scraped_data as any;

      res.json({
        websiteId: websiteData.id,
        name: websiteData.name,
        url: websiteData.url,
        isScraped: hasScrapedData,
        lastScraped: websiteData.last_scraped,
        stats: hasScrapedData ? {
          faqsCount: scrapedData?.faqs?.length || 0,
          keyTopicsCount: scrapedData?.keyTopics?.length || 0,
          commonQuestionsCount: scrapedData?.commonQuestions?.length || 0,
          primaryKeywordsCount: scrapedData?.seoInsights?.primaryKeywords?.length || 0,
          contentGapsCount: scrapedData?.seoInsights?.contentGaps?.length || 0,
          recommendedTopicsCount: scrapedData?.seoInsights?.recommendedTopics?.length || 0,
        } : null,
        summary: scrapedData?.summary || null,
      });
    } catch (error) {
      console.error("Error checking scraping status:", error);
      res.status(500).json({ error: "Failed to check scraping status" });
    }
  });

  // Article idea routes
  app.get("/api/websites/:websiteId/ideas", async (req, res) => {
    try {
      const { status } = req.query;
      let ideas;
      if (status && typeof status === "string") {
        ideas = await storage.getArticleIdeasByStatus(req.params.websiteId, status);
      } else {
        ideas = await storage.getArticleIdeasByWebsiteId(req.params.websiteId);
      }
      res.json(ideas);
    } catch (error) {
      console.error("Error fetching ideas:", error);
      res.status(500).json({ error: "Failed to fetch ideas" });
    }
  });

  app.post("/api/websites/:websiteId/generate-ideas", async (req, res) => {
    try {
      // Fetch website with scraped data from Supabase
      const { data: websiteData, error: fetchError } = await supabaseAdmin
        .from("websites")
        .select("*")
        .eq("id", req.params.websiteId)
        .single();

      if (fetchError || !websiteData) {
        return res.status(404).json({ error: "Website not found" });
      }

      // Transform to match Website type
      const website = {
        id: websiteData.id,
        userId: websiteData.user_id,
        name: websiteData.name,
        url: websiteData.url,
        keywords: websiteData.keywords || [],
        tone: websiteData.tone,
        audience: websiteData.audience,
        status: websiteData.status,
        githubRepo: websiteData.github_repo,
        githubBranch: websiteData.github_branch,
        githubPath: websiteData.github_path,
        totalArticles: websiteData.total_articles || 0,
        lastGenerated: websiteData.last_generated,
        nextScheduled: websiteData.next_scheduled,
        createdAt: websiteData.created_at,
        updatedAt: websiteData.updated_at,
        scrapedData: websiteData.scraped_data, // Include scraped data
        lastScraped: websiteData.last_scraped,
      } as any;

      const count = req.body.count || 5;
      const generatedIdeas = await openaiService.generateArticleIdeas(website, count);


      const ideas = await Promise.all(
        generatedIdeas.map((idea) =>
          storage.createArticleIdea({
            ...idea,
            website: { connect: { id: website.id } },
          })
        )
      );

      await storage.createGenerationHistory({
        website: { connect: { id: website.id } },
        action: "Ideas Generated",
        articleTitle: `${ideas.length} new ideas`,
        status: "success",
      });

      await storage.updateWebsite(website.id, {
        lastGenerated: new Date(),
      });

      res.json(ideas);
    } catch (error) {
      console.error("Error generating ideas:", error);
      
      await storage.createGenerationHistory({
        website: { connect: { id: req.params.websiteId } },
        action: "Ideas Generation",
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      res.status(500).json({ error: "Failed to generate ideas" });
    }
  });

  app.patch("/api/ideas/:id", async (req, res) => {
    try {
      const idea = await storage.updateArticleIdea(req.params.id, req.body);
      if (!idea) {
        return res.status(404).json({ error: "Idea not found" });
      }
      res.json(idea);
    } catch (error) {
      console.error("Error updating idea:", error);
      res.status(500).json({ error: "Failed to update idea" });
    }
  });

  app.delete("/api/ideas/:id", async (req, res) => {
    try {
      await storage.deleteArticleIdea(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting idea:", error);
      res.status(500).json({ error: "Failed to delete idea" });
    }
  });

  // Draft routes
  app.get("/api/websites/:websiteId/drafts", async (req, res) => {
    try {
      const { status } = req.query;
      let drafts;
      if (status && typeof status === "string") {
        drafts = await storage.getDraftsByStatus(req.params.websiteId, status);
      } else {
        drafts = await storage.getDraftsByWebsiteId(req.params.websiteId);
      }
      res.json(drafts);
    } catch (error) {
      console.error("Error fetching drafts:", error);
      res.status(500).json({ error: "Failed to fetch drafts" });
    }
  });

  app.post("/api/ideas/:ideaId/generate-draft", async (req, res) => {
    try {
      const idea = await storage.getArticleIdea(req.params.ideaId);
      if (!idea) {
        return res.status(404).json({ error: "Idea not found" });
      }

      // Fetch website with scraped data from Supabase
      const { data: websiteData, error: fetchError } = await supabaseAdmin
        .from("websites")
        .select("*")
        .eq("id", idea.websiteId)
        .single();

      if (fetchError || !websiteData) {
        return res.status(404).json({ error: "Website not found" });
      }

      // Transform to match Website type
      const website = {
        id: websiteData.id,
        userId: websiteData.user_id,
        name: websiteData.name,
        url: websiteData.url,
        keywords: websiteData.keywords || [],
        tone: websiteData.tone,
        audience: websiteData.audience,
        status: websiteData.status,
        githubRepo: websiteData.github_repo,
        githubBranch: websiteData.github_branch,
        githubPath: websiteData.github_path,
        ctaText: websiteData.cta_text,
        ctaUrl: websiteData.cta_url,
        totalArticles: websiteData.total_articles || 0,
        lastGenerated: websiteData.last_generated,
        nextScheduled: websiteData.next_scheduled,
        createdAt: websiteData.created_at,
        updatedAt: websiteData.updated_at,
        scrapedData: websiteData.scraped_data, // Include scraped data
        lastScraped: websiteData.last_scraped,
      } as any;

      const generatedDraft = await openaiService.generateDraft(
        idea.headline,
        website,
        idea.keywords,
        idea.estimatedWords
      );

      const draft = await storage.createDraft({
        ...generatedDraft,
        website: { connect: { id: website.id } },
        articleIdea: { connect: { id: idea.id } },
      });

      await storage.createGenerationHistory({
        website: { connect: { id: website.id } },
        action: "Draft Created",
        articleTitle: draft.title,
        status: "success",
      });

      res.json(draft);
    } catch (error) {
      console.error("Error generating draft:", error);

      const idea = await storage.getArticleIdea(req.params.ideaId);
      if (idea) {
        await storage.createGenerationHistory({
          website: { connect: { id: idea.websiteId } },
          action: "Draft Generation",
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        });
      }

      res.status(500).json({ error: "Failed to generate draft" });
    }
  });

  app.patch("/api/drafts/:id", async (req, res) => {
    try {
      const draft = await storage.updateDraft(req.params.id, req.body);
      if (!draft) {
        return res.status(404).json({ error: "Draft not found" });
      }
      res.json(draft);
    } catch (error) {
      console.error("Error updating draft:", error);
      res.status(500).json({ error: "Failed to update draft" });
    }
  });

  app.post("/api/drafts/:id/push-to-github", async (req, res) => {
    try {
      const draft = await storage.getDraft(req.params.id);
      if (!draft) {
        return res.status(404).json({ error: "Draft not found" });
      }

      const website = await storage.getWebsite(draft.websiteId);
      if (!website) {
        return res.status(404).json({ error: "Website not found" });
      }

      if (!tempUser?.githubToken) {
        return res.status(400).json({ error: "GitHub token not configured" });
      }

      const githubService = createGitHubService(tempUser.githubToken);
      const prUrl = await githubService.createPullRequest(draft, website);

      const updatedDraft = await storage.updateDraft(draft.id, {
        status: "pr_created",
        prUrl,
      });

      await storage.createGenerationHistory({
        website: { connect: { id: website.id } },
        action: "PR Created",
        articleTitle: draft.title,
        status: "success",
        prUrl,
      });

      // No need to manually increment totalArticles here,
      // it will be updated in getWebsitesByUserId when the draft is marked as merged

      res.json(updatedDraft);
    } catch (error) {
      console.error("Error pushing to GitHub:", error);

      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      const draft = await storage.getDraft(req.params.id);
      if (draft) {
        await storage.createGenerationHistory({
          website: { connect: { id: draft.websiteId } },
          action: "PR Creation",
          articleTitle: draft.title,
          status: "failed",
          errorMessage,
        });
      }

      // Return the actual error message to help users debug
      res.status(500).json({ 
        error: "Failed to push to GitHub",
        details: errorMessage
      });
    }
  });

  app.delete("/api/drafts/:id", async (req, res) => {
    try {
      await storage.deleteDraft(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting draft:", error);
      res.status(500).json({ error: "Failed to delete draft" });
    }
  });

  // History routes
  app.get("/api/websites/:websiteId/history", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const history = await storage.getGenerationHistory(req.params.websiteId, limit);
      res.json(history);
    } catch (error) {
      console.error("Error fetching history:", error);
      res.status(500).json({ error: "Failed to fetch history" });
    }
  });

  // Dashboard stats - Optimized: Single query instead of N+1 queries
  app.get("/api/stats", async (req, res) => {
    try {
      // Use optimized method that fetches all data in a single query
      const websitesWithStats = await storage.getWebsitesWithStats(tempUser!.id);
      
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      
      const activeWebsites = websitesWithStats.filter(w => w.status === "active").length;
      
      // Aggregate counts from all websites
      const pendingApprovals = websitesWithStats.reduce(
        (sum, w) => sum + w._count.pendingIdeas,
        0
      );
      
      const publishedThisMonth = websitesWithStats.reduce(
        (sum, w) => sum + w._count.thisMonthPRs,
        0
      );

      // Get last month's data for comparison - PARALLELIZE ALL QUERIES
      const [
        lastMonthActiveWebsites,
        lastMonthApprovedIdeas,
        thisMonthApprovedIdeas,
        lastMonthPublished
      ] = await Promise.all([
        // Last month's active websites (websites that were active at the end of last month)
        db.website.count({
          where: {
            userId: tempUser!.id,
            status: "active",
            createdAt: { lte: endOfLastMonth }
          }
        }),
        // Last month's approved ideas
        db.articleIdea.count({
          where: {
            website: { userId: tempUser!.id },
            status: "approved",
            createdAt: {
              gte: startOfLastMonth,
              lte: endOfLastMonth
            }
          }
        }),
        // This month's approved ideas
        db.articleIdea.count({
          where: {
            website: { userId: tempUser!.id },
            status: "approved",
            createdAt: { gte: startOfMonth }
          }
        }),
        // Last month's published articles (PRs created last month)
        db.generationHistory.count({
          where: {
            website: { userId: tempUser!.id },
            action: "PR Created",
            createdAt: {
              gte: startOfLastMonth,
              lte: endOfLastMonth
            }
          }
        })
      ]);

      res.json({
        activeWebsites,
        pendingApprovals,
        publishedThisMonth,
        lastMonthActiveWebsites,
        thisMonthApprovedIdeas,
        lastMonthApprovedIdeas,
        lastMonthPublished,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
