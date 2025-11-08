-- Add scraped_data and last_scraped columns to websites table
ALTER TABLE "websites" 
ADD COLUMN IF NOT EXISTS "scraped_data" jsonb,
ADD COLUMN IF NOT EXISTS "last_scraped" timestamp;

