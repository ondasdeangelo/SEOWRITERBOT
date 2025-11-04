import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const websiteStatusEnum = pgEnum("website_status", ["active", "paused", "error"]);
export const ideaStatusEnum = pgEnum("idea_status", ["pending", "approved", "rejected"]);
export const draftStatusEnum = pgEnum("draft_status", ["draft", "review", "pr_created", "merged"]);
export const generationStatusEnum = pgEnum("generation_status", ["success", "failed", "pending"]);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  githubToken: text("github_token"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Websites table
export const websites = pgTable("websites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  keywords: text("keywords").array().notNull().default(sql`ARRAY[]::text[]`),
  tone: text("tone"),
  audience: text("audience"),
  status: websiteStatusEnum("status").notNull().default("active"),
  githubRepo: text("github_repo"),
  githubBranch: text("github_branch").default("main"),
  githubPath: text("github_path").default("blog"),
  lastGenerated: timestamp("last_generated"),
  totalArticles: integer("total_articles").notNull().default(0),
  nextScheduled: timestamp("next_scheduled"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWebsiteSchema = createInsertSchema(websites).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWebsite = z.infer<typeof insertWebsiteSchema>;
export type Website = typeof websites.$inferSelect;

// Article ideas table
export const articleIdeas = pgTable("article_ideas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  websiteId: varchar("website_id").notNull().references(() => websites.id, { onDelete: "cascade" }),
  headline: text("headline").notNull(),
  confidence: integer("confidence").notNull(),
  keywords: text("keywords").array().notNull().default(sql`ARRAY[]::text[]`),
  estimatedWords: integer("estimated_words").notNull(),
  seoScore: integer("seo_score").notNull(),
  status: ideaStatusEnum("status").notNull().default("pending"),
  priority: integer("priority"),
  scheduledDate: timestamp("scheduled_date"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertArticleIdeaSchema = createInsertSchema(articleIdeas).omit({
  id: true,
  createdAt: true,
});

export type InsertArticleIdea = z.infer<typeof insertArticleIdeaSchema>;
export type ArticleIdea = typeof articleIdeas.$inferSelect;

// Drafts table
export const drafts = pgTable("drafts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  articleIdeaId: varchar("article_idea_id").notNull().references(() => articleIdeas.id, { onDelete: "cascade" }),
  websiteId: varchar("website_id").notNull().references(() => websites.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  excerpt: text("excerpt").notNull(),
  wordCount: integer("word_count").notNull(),
  readabilityScore: integer("readability_score").notNull(),
  keywordDensity: integer("keyword_density").notNull(),
  status: draftStatusEnum("status").notNull().default("draft"),
  prUrl: text("pr_url"),
  frontmatter: jsonb("frontmatter"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDraftSchema = createInsertSchema(drafts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDraft = z.infer<typeof insertDraftSchema>;
export type Draft = typeof drafts.$inferSelect;

// Generation history table
export const generationHistory = pgTable("generation_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  websiteId: varchar("website_id").notNull().references(() => websites.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  articleTitle: text("article_title"),
  status: generationStatusEnum("status").notNull(),
  prUrl: text("pr_url"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGenerationHistorySchema = createInsertSchema(generationHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertGenerationHistory = z.infer<typeof insertGenerationHistorySchema>;
export type GenerationHistory = typeof generationHistory.$inferSelect;
