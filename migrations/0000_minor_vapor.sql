CREATE TYPE "public"."draft_status" AS ENUM('draft', 'review', 'pr_created', 'merged');--> statement-breakpoint
CREATE TYPE "public"."generation_status" AS ENUM('success', 'failed', 'pending');--> statement-breakpoint
CREATE TYPE "public"."idea_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."website_status" AS ENUM('active', 'paused', 'error');--> statement-breakpoint
CREATE TABLE "article_ideas" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"website_id" varchar NOT NULL,
	"headline" text NOT NULL,
	"confidence" integer NOT NULL,
	"keywords" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"estimated_words" integer NOT NULL,
	"seo_score" integer NOT NULL,
	"status" "idea_status" DEFAULT 'pending' NOT NULL,
	"priority" integer,
	"scheduled_date" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drafts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_idea_id" varchar NOT NULL,
	"website_id" varchar NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"excerpt" text NOT NULL,
	"word_count" integer NOT NULL,
	"readability_score" integer NOT NULL,
	"keyword_density" integer NOT NULL,
	"status" "draft_status" DEFAULT 'draft' NOT NULL,
	"pr_url" text,
	"frontmatter" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"website_id" varchar NOT NULL,
	"action" text NOT NULL,
	"article_title" text,
	"status" "generation_status" NOT NULL,
	"pr_url" text,
	"error_message" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"github_token" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "websites" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"keywords" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"tone" text,
	"audience" text,
	"status" "website_status" DEFAULT 'active' NOT NULL,
	"github_repo" text,
	"github_branch" text DEFAULT 'main',
	"github_path" text DEFAULT 'blog',
	"last_generated" timestamp,
	"total_articles" integer DEFAULT 0 NOT NULL,
	"next_scheduled" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "article_ideas" ADD CONSTRAINT "article_ideas_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drafts" ADD CONSTRAINT "drafts_article_idea_id_article_ideas_id_fk" FOREIGN KEY ("article_idea_id") REFERENCES "public"."article_ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drafts" ADD CONSTRAINT "drafts_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_history" ADD CONSTRAINT "generation_history_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websites" ADD CONSTRAINT "websites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;