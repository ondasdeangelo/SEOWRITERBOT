-- Migration: Add scraped_data and last_scraped columns to websites table
-- Run this in your Supabase SQL editor or via psql

ALTER TABLE "websites" 
ADD COLUMN IF NOT EXISTS "scraped_data" jsonb,
ADD COLUMN IF NOT EXISTS "last_scraped" timestamp;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'websites' 
AND column_name IN ('scraped_data', 'last_scraped');

