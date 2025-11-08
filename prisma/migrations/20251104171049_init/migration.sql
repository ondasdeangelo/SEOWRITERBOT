-- CreateEnum
CREATE TYPE "WebsiteStatus" AS ENUM ('active', 'paused', 'error');

-- CreateEnum
CREATE TYPE "IdeaStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('draft', 'review', 'pr_created', 'merged');

-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('success', 'failed', 'pending');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "github_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "websites" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "keywords" TEXT[],
    "tone" TEXT,
    "audience" TEXT,
    "status" "WebsiteStatus" NOT NULL DEFAULT 'active',
    "github_repo" TEXT,
    "github_branch" TEXT DEFAULT 'main',
    "github_path" TEXT DEFAULT 'blog',
    "last_generated" TIMESTAMP(3),
    "total_articles" INTEGER NOT NULL DEFAULT 0,
    "next_scheduled" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "websites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_ideas" (
    "id" TEXT NOT NULL,
    "website_id" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "keywords" TEXT[],
    "estimated_words" INTEGER NOT NULL,
    "seo_score" INTEGER NOT NULL,
    "status" "IdeaStatus" NOT NULL DEFAULT 'pending',
    "priority" INTEGER,
    "scheduled_date" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_ideas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drafts" (
    "id" TEXT NOT NULL,
    "article_idea_id" TEXT NOT NULL,
    "website_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "word_count" INTEGER NOT NULL,
    "readability_score" INTEGER NOT NULL,
    "keyword_density" INTEGER NOT NULL,
    "status" "DraftStatus" NOT NULL DEFAULT 'draft',
    "pr_url" TEXT,
    "frontmatter" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generation_history" (
    "id" TEXT NOT NULL,
    "website_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "article_title" TEXT,
    "status" "GenerationStatus" NOT NULL,
    "pr_url" TEXT,
    "error_message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generation_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- AddForeignKey
ALTER TABLE "websites" ADD CONSTRAINT "websites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_ideas" ADD CONSTRAINT "article_ideas_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drafts" ADD CONSTRAINT "drafts_article_idea_id_fkey" FOREIGN KEY ("article_idea_id") REFERENCES "article_ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drafts" ADD CONSTRAINT "drafts_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_history" ADD CONSTRAINT "generation_history_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
