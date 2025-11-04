import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { openaiService } from "./services/openai";
import { createGitHubService } from "./services/github";
import { insertWebsiteSchema, insertArticleIdeaSchema, insertDraftSchema } from "@shared/schema";
import { z } from "zod";

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
      const data = insertWebsiteSchema.parse({
        ...req.body,
        userId: tempUser!.id,
      });
      const website = await storage.createWebsite(data);
      res.json(website);
    } catch (error) {
      if (error instanceof z.ZodError) {
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
      const website = await storage.getWebsite(req.params.websiteId);
      if (!website) {
        return res.status(404).json({ error: "Website not found" });
      }

      const count = req.body.count || 5;
      const generatedIdeas = await openaiService.generateArticleIdeas(website, count);

      const ideas = await Promise.all(
        generatedIdeas.map((idea) =>
          storage.createArticleIdea({
            websiteId: website.id,
            ...idea,
          })
        )
      );

      await storage.createGenerationHistory({
        websiteId: website.id,
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
        websiteId: req.params.websiteId,
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

      const website = await storage.getWebsite(idea.websiteId);
      if (!website) {
        return res.status(404).json({ error: "Website not found" });
      }

      const generatedDraft = await openaiService.generateDraft(
        idea.headline,
        website,
        idea.keywords,
        idea.estimatedWords
      );

      const draft = await storage.createDraft({
        articleIdeaId: idea.id,
        websiteId: website.id,
        ...generatedDraft,
      });

      await storage.createGenerationHistory({
        websiteId: website.id,
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
          websiteId: idea.websiteId,
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
        websiteId: website.id,
        action: "PR Created",
        articleTitle: draft.title,
        status: "success",
        prUrl,
      });

      await storage.updateWebsite(website.id, {
        totalArticles: website.totalArticles + 1,
      });

      res.json(updatedDraft);
    } catch (error) {
      console.error("Error pushing to GitHub:", error);

      const draft = await storage.getDraft(req.params.id);
      if (draft) {
        await storage.createGenerationHistory({
          websiteId: draft.websiteId,
          action: "PR Creation",
          articleTitle: draft.title,
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        });
      }

      res.status(500).json({ error: "Failed to push to GitHub" });
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

  // Dashboard stats
  app.get("/api/stats", async (req, res) => {
    try {
      const websites = await storage.getWebsitesByUserId(tempUser!.id);
      const activeWebsites = websites.filter(w => w.status === "active").length;
      
      let pendingApprovals = 0;
      let publishedThisMonth = 0;

      for (const website of websites) {
        const ideas = await storage.getArticleIdeasByStatus(website.id, "pending");
        pendingApprovals += ideas.length;

        const history = await storage.getGenerationHistory(website.id, 100);
        const thisMonth = history.filter(h => {
          const date = new Date(h.createdAt);
          const now = new Date();
          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        });
        publishedThisMonth += thisMonth.filter(h => h.action === "PR Created").length;
      }

      res.json({
        activeWebsites,
        pendingApprovals,
        publishedThisMonth,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
