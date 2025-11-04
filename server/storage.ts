import { 
  type User, 
  type InsertUser,
  type Website,
  type InsertWebsite,
  type ArticleIdea,
  type InsertArticleIdea,
  type Draft,
  type InsertDraft,
  type GenerationHistory,
  type InsertGenerationHistory,
  users,
  websites,
  articleIdeas,
  drafts,
  generationHistory,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserGithubToken(id: string, githubToken: string): Promise<User | undefined>;

  // Website operations
  getWebsite(id: string): Promise<Website | undefined>;
  getWebsitesByUserId(userId: string): Promise<Website[]>;
  createWebsite(website: InsertWebsite): Promise<Website>;
  updateWebsite(id: string, website: Partial<InsertWebsite>): Promise<Website | undefined>;
  deleteWebsite(id: string): Promise<void>;

  // Article idea operations
  getArticleIdea(id: string): Promise<ArticleIdea | undefined>;
  getArticleIdeasByWebsiteId(websiteId: string): Promise<ArticleIdea[]>;
  getArticleIdeasByStatus(websiteId: string, status: string): Promise<ArticleIdea[]>;
  createArticleIdea(idea: InsertArticleIdea): Promise<ArticleIdea>;
  updateArticleIdea(id: string, idea: Partial<InsertArticleIdea>): Promise<ArticleIdea | undefined>;
  deleteArticleIdea(id: string): Promise<void>;

  // Draft operations
  getDraft(id: string): Promise<Draft | undefined>;
  getDraftsByWebsiteId(websiteId: string): Promise<Draft[]>;
  getDraftsByStatus(websiteId: string, status: string): Promise<Draft[]>;
  createDraft(draft: InsertDraft): Promise<Draft>;
  updateDraft(id: string, draft: Partial<InsertDraft>): Promise<Draft | undefined>;
  deleteDraft(id: string): Promise<void>;

  // Generation history operations
  getGenerationHistory(websiteId: string, limit?: number): Promise<GenerationHistory[]>;
  createGenerationHistory(history: InsertGenerationHistory): Promise<GenerationHistory>;
}

export class DbStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserGithubToken(id: string, githubToken: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ githubToken })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Website operations
  async getWebsite(id: string): Promise<Website | undefined> {
    const [website] = await db.select().from(websites).where(eq(websites.id, id));
    return website;
  }

  async getWebsitesByUserId(userId: string): Promise<Website[]> {
    return await db
      .select()
      .from(websites)
      .where(eq(websites.userId, userId))
      .orderBy(desc(websites.createdAt));
  }

  async createWebsite(website: InsertWebsite): Promise<Website> {
    const [newWebsite] = await db.insert(websites).values(website).returning();
    return newWebsite;
  }

  async updateWebsite(id: string, website: Partial<InsertWebsite>): Promise<Website | undefined> {
    const [updated] = await db
      .update(websites)
      .set({ ...website, updatedAt: new Date() })
      .where(eq(websites.id, id))
      .returning();
    return updated;
  }

  async deleteWebsite(id: string): Promise<void> {
    await db.delete(websites).where(eq(websites.id, id));
  }

  // Article idea operations
  async getArticleIdea(id: string): Promise<ArticleIdea | undefined> {
    const [idea] = await db.select().from(articleIdeas).where(eq(articleIdeas.id, id));
    return idea;
  }

  async getArticleIdeasByWebsiteId(websiteId: string): Promise<ArticleIdea[]> {
    return await db
      .select()
      .from(articleIdeas)
      .where(eq(articleIdeas.websiteId, websiteId))
      .orderBy(desc(articleIdeas.createdAt));
  }

  async getArticleIdeasByStatus(websiteId: string, status: string): Promise<ArticleIdea[]> {
    return await db
      .select()
      .from(articleIdeas)
      .where(and(eq(articleIdeas.websiteId, websiteId), eq(articleIdeas.status, status as any)))
      .orderBy(desc(articleIdeas.createdAt));
  }

  async createArticleIdea(idea: InsertArticleIdea): Promise<ArticleIdea> {
    const [newIdea] = await db.insert(articleIdeas).values(idea).returning();
    return newIdea;
  }

  async updateArticleIdea(id: string, idea: Partial<InsertArticleIdea>): Promise<ArticleIdea | undefined> {
    const [updated] = await db
      .update(articleIdeas)
      .set(idea)
      .where(eq(articleIdeas.id, id))
      .returning();
    return updated;
  }

  async deleteArticleIdea(id: string): Promise<void> {
    await db.delete(articleIdeas).where(eq(articleIdeas.id, id));
  }

  // Draft operations
  async getDraft(id: string): Promise<Draft | undefined> {
    const [draft] = await db.select().from(drafts).where(eq(drafts.id, id));
    return draft;
  }

  async getDraftsByWebsiteId(websiteId: string): Promise<Draft[]> {
    return await db
      .select()
      .from(drafts)
      .where(eq(drafts.websiteId, websiteId))
      .orderBy(desc(drafts.createdAt));
  }

  async getDraftsByStatus(websiteId: string, status: string): Promise<Draft[]> {
    return await db
      .select()
      .from(drafts)
      .where(and(eq(drafts.websiteId, websiteId), eq(drafts.status, status as any)))
      .orderBy(desc(drafts.createdAt));
  }

  async createDraft(draft: InsertDraft): Promise<Draft> {
    const [newDraft] = await db.insert(drafts).values(draft).returning();
    return newDraft;
  }

  async updateDraft(id: string, draft: Partial<InsertDraft>): Promise<Draft | undefined> {
    const [updated] = await db
      .update(drafts)
      .set({ ...draft, updatedAt: new Date() })
      .where(eq(drafts.id, id))
      .returning();
    return updated;
  }

  async deleteDraft(id: string): Promise<void> {
    await db.delete(drafts).where(eq(drafts.id, id));
  }

  // Generation history operations
  async getGenerationHistory(websiteId: string, limit: number = 50): Promise<GenerationHistory[]> {
    return await db
      .select()
      .from(generationHistory)
      .where(eq(generationHistory.websiteId, websiteId))
      .orderBy(desc(generationHistory.createdAt))
      .limit(limit);
  }

  async createGenerationHistory(history: InsertGenerationHistory): Promise<GenerationHistory> {
    const [newHistory] = await db.insert(generationHistory).values(history).returning();
    return newHistory;
  }
}

export const storage = new DbStorage();
