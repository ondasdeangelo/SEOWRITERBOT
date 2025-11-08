import { type User, type Website, type ArticleIdea, type Draft, type GenerationHistory } from "@shared/schema";
import { db } from "./db";
import { Prisma } from "@prisma/client";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
  createUser(user: Prisma.UserCreateInput): Promise<User>;
  updateUserGithubToken(id: string, githubToken: string): Promise<User | null>;

  // Website operations
  getWebsite(id: string): Promise<Website | null>;
  getWebsitesByUserId(userId: string): Promise<Website[]>;
  createWebsite(website: Prisma.WebsiteCreateInput): Promise<Website>;
  updateWebsite(id: string, website: Prisma.WebsiteUpdateInput): Promise<Website | null>;
  deleteWebsite(id: string): Promise<void>;

  // Article idea operations
  getArticleIdea(id: string): Promise<ArticleIdea | null>;
  getArticleIdeasByWebsiteId(websiteId: string): Promise<ArticleIdea[]>;
  getArticleIdeasByStatus(websiteId: string, status: string): Promise<ArticleIdea[]>;
  createArticleIdea(idea: Prisma.ArticleIdeaCreateInput): Promise<ArticleIdea>;
  updateArticleIdea(id: string, idea: Prisma.ArticleIdeaUpdateInput): Promise<ArticleIdea | null>;
  deleteArticleIdea(id: string): Promise<void>;

  // Draft operations
  getDraft(id: string): Promise<Draft | null>;
  getDraftsByWebsiteId(websiteId: string): Promise<Draft[]>;
  getDraftsByStatus(websiteId: string, status: string): Promise<Draft[]>;
  createDraft(draft: Prisma.DraftCreateInput): Promise<Draft>;
  updateDraft(id: string, draft: Prisma.DraftUpdateInput): Promise<Draft | null>;
  deleteDraft(id: string): Promise<void>;

  // Generation history operations
  getGenerationHistory(websiteId: string, limit?: number): Promise<GenerationHistory[]>;
  createGenerationHistory(history: Prisma.GenerationHistoryCreateInput): Promise<GenerationHistory>;

  // Optimized bulk operations
  getWebsitesWithStats(userId: string): Promise<Array<Website & {
    _count: {
      pendingIdeas: number;
      mergedDrafts: number;
      thisMonthPRs: number;
    };
  }>>;
}

export class DbStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | null> {
    return await db.user.findUnique({ where: { id } });
  }

  async getUserByUsername(username: string): Promise<User | null> {
    return await db.user.findUnique({ where: { username } });
  }

  async createUser(user: Prisma.UserCreateInput): Promise<User> {
    return await db.user.create({ data: user });
  }

  async updateUserGithubToken(id: string, githubToken: string): Promise<User | null> {
    return await db.user.update({
      where: { id },
      data: { githubToken }
    });
  }

  // Website operations
  async getWebsite(id: string): Promise<Website | null> {
    return await db.website.findUnique({ where: { id } });
  }

  async getWebsitesByUserId(userId: string): Promise<Website[]> {
    // Optimized: Fetch websites only - don't update counts on every fetch
    // Count updates should happen asynchronously or on-demand to avoid blocking
    const websites = await db.website.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    // Return websites immediately without blocking on count updates
    // Counts will be updated when drafts are created/merged
    return websites;
  }

  async createWebsite(website: Prisma.WebsiteCreateInput): Promise<Website> {
    return await db.website.create({ data: website });
  }

  async updateWebsite(id: string, website: Prisma.WebsiteUpdateInput): Promise<Website | null> {
    return await db.website.update({
      where: { id },
      data: website
    });
  }

  async deleteWebsite(id: string): Promise<void> {
    await db.website.delete({ where: { id } });
  }

  // Article idea operations
  async getArticleIdea(id: string): Promise<ArticleIdea | null> {
    return await db.articleIdea.findUnique({ where: { id } });
  }

  async getArticleIdeasByWebsiteId(websiteId: string): Promise<ArticleIdea[]> {
    return await db.articleIdea.findMany({
      where: { websiteId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getArticleIdeasByStatus(websiteId: string, status: string): Promise<ArticleIdea[]> {
    return await db.articleIdea.findMany({
      where: { 
        websiteId,
        status: status as any 
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createArticleIdea(idea: Prisma.ArticleIdeaCreateInput): Promise<ArticleIdea> {
    return await db.articleIdea.create({ data: idea });
  }

  async updateArticleIdea(id: string, idea: Prisma.ArticleIdeaUpdateInput): Promise<ArticleIdea | null> {
    return await db.articleIdea.update({
      where: { id },
      data: idea
    });
  }

  async deleteArticleIdea(id: string): Promise<void> {
    await db.articleIdea.delete({ where: { id } });
  }

  // Draft operations
  async getDraft(id: string): Promise<Draft | null> {
    return await db.draft.findUnique({ where: { id } });
  }

  async getDraftsByWebsiteId(websiteId: string): Promise<Draft[]> {
    return await db.draft.findMany({
      where: { websiteId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getDraftsByStatus(websiteId: string, status: string): Promise<Draft[]> {
    return await db.draft.findMany({
      where: { 
        websiteId,
        status: status as any 
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createDraft(draft: Prisma.DraftCreateInput): Promise<Draft> {
    // Ensure keywordDensity is a valid float before creating
    if (draft.keywordDensity !== undefined && draft.keywordDensity !== null) {
      const density = Number(draft.keywordDensity);
      if (isNaN(density) || !isFinite(density)) {
        console.warn(`Invalid keywordDensity value: ${draft.keywordDensity}, using default 2.5`);
        draft.keywordDensity = 2.5;
      } else {
        draft.keywordDensity = density;
      }
    } else {
      draft.keywordDensity = 2.5;
    }
    
    return await db.draft.create({ data: draft });
  }

  async updateDraft(id: string, draft: Prisma.DraftUpdateInput): Promise<Draft | null> {
    return await db.draft.update({
      where: { id },
      data: draft
    });
  }

  async deleteDraft(id: string): Promise<void> {
    await db.draft.delete({ where: { id } });
  }

  // Generation history operations
  async getGenerationHistory(websiteId: string, limit: number = 50): Promise<GenerationHistory[]> {
    return await db.generationHistory.findMany({
      where: { websiteId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  async createGenerationHistory(history: Prisma.GenerationHistoryCreateInput): Promise<GenerationHistory> {
    return await db.generationHistory.create({ data: history });
  }

  // Optimized: Get all websites with stats using batched queries
  async getWebsitesWithStats(userId: string): Promise<Array<Website & {
    _count: {
      pendingIdeas: number;
      mergedDrafts: number;
      thisMonthPRs: number;
    };
  }>> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch all websites in one query
    const websites = await db.website.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    // Batch all count queries in parallel for all websites
    const statsPromises = websites.map(website => 
      Promise.all([
        // Pending ideas count
        db.articleIdea.count({
          where: { 
            websiteId: website.id,
            status: 'pending'
          }
        }),
        // Merged drafts count
        db.draft.count({
          where: { 
            websiteId: website.id,
            status: 'merged'
          }
        }),
        // This month PRs count
        db.generationHistory.count({
          where: {
            websiteId: website.id,
            action: 'PR Created',
            createdAt: {
              gte: startOfMonth
            }
          }
        })
      ])
    );

    const allStats = await Promise.all(statsPromises);

    // Combine websites with their stats
    return websites.map((website, index) => {
      const [pendingIdeas, mergedDrafts, thisMonthPRs] = allStats[index];
      return {
        ...website,
        _count: {
          pendingIdeas,
          mergedDrafts,
          thisMonthPRs
        }
      } as Website & {
        _count: {
          pendingIdeas: number;
          mergedDrafts: number;
          thisMonthPRs: number;
        };
      };
    });
  }
}

// Keep the memory storage implementation for development/testing
class MemoryStorage implements IStorage {
  private users = new Map<string, User>();
  private websites = new Map<string, Website>();
  private articleIdeas = new Map<string, ArticleIdea>();
  private drafts = new Map<string, Draft>();
  private generationHistory = new Map<string, GenerationHistory[]>();

  private makeId(prefix = '') {
    return prefix + Math.random().toString(36).slice(2, 9);
  }

  // User operations
  async getUser(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }
  async getUserByUsername(username: string): Promise<User | null> {
    return Array.from(this.users.values()).find(user => user.username === username) || null;
  }
  async createUser(user: Prisma.UserCreateInput): Promise<User> {
    const id = this.makeId('user_');
    const now = new Date();
    const newUser: User = {
      id,
      username: (user as any).username ?? '',
      password: (user as any).password ?? '',
      githubToken: (user as any).githubToken ?? null,
      createdAt: now,
    };
    this.users.set(id, newUser);
    return newUser;
  }
  async updateUserGithubToken(id: string, githubToken: string): Promise<User | null> {
    const user = this.users.get(id);
    if (!user) return null;
    const updated = { ...user, githubToken };
    this.users.set(id, updated);
    return updated;
  }

  // Website operations
  async getWebsite(id: string): Promise<Website | null> {
    return this.websites.get(id) || null;
  }
  async getWebsitesByUserId(userId: string): Promise<Website[]> {
    return Array.from(this.websites.values()).filter(w => w.userId === userId);
  }
  async createWebsite(website: Prisma.WebsiteCreateInput): Promise<Website> {
    const id = this.makeId('web_');
    const now = new Date();
    // Extract userId from nested connect
    let userId = '';
    if ((website as any).user && (website as any).user.connect) {
      userId = (website as any).user.connect.id;
    }
    const newWebsite: Website = {
      id,
      name: (website as any).name ?? '',
      url: (website as any).url ?? '',
      keywords: (website as any).keywords ?? [],
      tone: (website as any).tone ?? null,
      audience: (website as any).audience ?? null,
      status: (website as any).status ?? 'active',
      githubRepo: (website as any).githubRepo ?? null,
      githubBranch: (website as any).githubBranch ?? null,
      githubPath: (website as any).githubPath ?? null,
      totalArticles: 0,
      createdAt: now,
      updatedAt: now,
      userId,
      lastGenerated: null,
      nextScheduled: null,
    };
    this.websites.set(id, newWebsite);
    return newWebsite;
  }
  async updateWebsite(id: string, website: Prisma.WebsiteUpdateInput): Promise<Website | null> {
    const old = this.websites.get(id);
    if (!old) return null;
    const updated: Website = {
      ...old,
      ...Object.fromEntries(Object.entries(website).filter(([k, v]) => typeof v !== 'object')),
      updatedAt: new Date(),
    };
    this.websites.set(id, updated);
    return updated;
  }
  async deleteWebsite(id: string): Promise<void> {
    this.websites.delete(id);
  }

  // Article idea operations
  async getArticleIdea(id: string): Promise<ArticleIdea | null> {
    return this.articleIdeas.get(id) || null;
  }
  async getArticleIdeasByWebsiteId(websiteId: string): Promise<ArticleIdea[]> {
    return Array.from(this.articleIdeas.values()).filter(a => a.websiteId === websiteId);
  }
  async getArticleIdeasByStatus(websiteId: string, status: string): Promise<ArticleIdea[]> {
    return Array.from(this.articleIdeas.values()).filter(a => a.websiteId === websiteId && a.status === status);
  }
  async createArticleIdea(idea: Prisma.ArticleIdeaCreateInput): Promise<ArticleIdea> {
    const id = this.makeId('idea_');
    const now = new Date();
    // Extract websiteId from nested connect
    let websiteId = '';
    if ((idea as any).website && (idea as any).website.connect) {
      websiteId = (idea as any).website.connect.id;
    }
    const newIdea: ArticleIdea = {
      id,
      createdAt: now,
      keywords: (idea as any).keywords ?? [],
      status: (idea as any).status ?? 'pending',
      websiteId,
      headline: (idea as any).headline ?? '',
      confidence: (idea as any).confidence ?? 0,
      estimatedWords: (idea as any).estimatedWords ?? 0,
      seoScore: (idea as any).seoScore ?? 0,
      priority: (idea as any).priority ?? null,
      scheduledDate: (idea as any).scheduledDate ?? null,
      metadata: (idea as any).metadata ?? {},
    };
    this.articleIdeas.set(id, newIdea);
    return newIdea;
  }
  async updateArticleIdea(id: string, idea: Prisma.ArticleIdeaUpdateInput): Promise<ArticleIdea | null> {
    const old = this.articleIdeas.get(id);
    if (!old) return null;
    const updated: ArticleIdea = {
      ...old,
      ...Object.fromEntries(Object.entries(idea).filter(([k, v]) => typeof v !== 'object')),
    };
    this.articleIdeas.set(id, updated);
    return updated;
  }
  async deleteArticleIdea(id: string): Promise<void> {
    this.articleIdeas.delete(id);
  }

  // Draft operations
  async getDraft(id: string): Promise<Draft | null> {
    return this.drafts.get(id) || null;
  }
  async getDraftsByWebsiteId(websiteId: string): Promise<Draft[]> {
    return Array.from(this.drafts.values()).filter(d => d.websiteId === websiteId);
  }
  async getDraftsByStatus(websiteId: string, status: string): Promise<Draft[]> {
    return Array.from(this.drafts.values()).filter(d => d.websiteId === websiteId && d.status === status);
  }
  async createDraft(draft: Prisma.DraftCreateInput): Promise<Draft> {
    const id = this.makeId('draft_');
    const now = new Date();
    // Extract websiteId and articleIdeaId from nested connect
    let websiteId = '';
    let articleIdeaId = '';
    if ((draft as any).website && (draft as any).website.connect) {
      websiteId = (draft as any).website.connect.id;
    }
    if ((draft as any).articleIdea && (draft as any).articleIdea.connect) {
      articleIdeaId = (draft as any).articleIdea.connect.id;
    }
    const newDraft: Draft = {
      id,
      createdAt: now,
      updatedAt: now,
      status: (draft as any).status ?? 'draft',
      websiteId,
      articleIdeaId,
      title: (draft as any).title ?? '',
      content: (draft as any).content ?? '',
      excerpt: (draft as any).excerpt ?? '',
      wordCount: (draft as any).wordCount ?? 0,
      readabilityScore: (draft as any).readabilityScore ?? 0,
      keywordDensity: (draft as any).keywordDensity ?? 0,
      prUrl: (draft as any).prUrl ?? null,
      frontmatter: (draft as any).frontmatter ?? {},
      imageUrl: (draft as any).imageUrl ?? null,
    };
    this.drafts.set(id, newDraft);
    return newDraft;
  }
  async updateDraft(id: string, draft: Prisma.DraftUpdateInput): Promise<Draft | null> {
    const old = this.drafts.get(id);
    if (!old) return null;
    const updated: Draft = {
      ...old,
      ...Object.fromEntries(Object.entries(draft).filter(([k, v]) => typeof v !== 'object')),
      updatedAt: new Date(),
    };
    this.drafts.set(id, updated);
    return updated;
  }
  async deleteDraft(id: string): Promise<void> {
    this.drafts.delete(id);
  }

  // Generation history operations
  async getGenerationHistory(websiteId: string, limit: number = 50): Promise<GenerationHistory[]> {
    return (this.generationHistory.get(websiteId) || []).slice(-limit).reverse();
  }
  async createGenerationHistory(history: Prisma.GenerationHistoryCreateInput): Promise<GenerationHistory> {
    const id = this.makeId('hist_');
    const now = new Date();
    // Extract websiteId from nested connect
    let websiteId = '';
    if ((history as any).website && (history as any).website.connect) {
      websiteId = (history as any).website.connect.id;
    }
    const newHist: GenerationHistory = {
      id,
      createdAt: now,
      status: (history as any).status ?? 'pending',
      websiteId,
      metadata: (history as any).metadata ?? {},
      prUrl: (history as any).prUrl ?? null,
      action: (history as any).action ?? '',
      articleTitle: (history as any).articleTitle ?? null,
      errorMessage: (history as any).errorMessage ?? null,
    };
    const arr = this.generationHistory.get(websiteId) || [];
    arr.push(newHist);
    this.generationHistory.set(websiteId, arr);
    return newHist;
  }
}

// Use Prisma DB storage when we have a database connection, otherwise use memory storage
const hasRealDb = Boolean(process.env.DATABASE_URL);
export const storage: IStorage = hasRealDb ? new DbStorage() : new MemoryStorage();