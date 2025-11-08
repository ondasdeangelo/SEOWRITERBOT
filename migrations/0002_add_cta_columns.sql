-- Migration: Add cta_text and cta_url columns to websites table
-- Run this in your Supabase SQL editor or via psql

ALTER TABLE "websites" 
ADD COLUMN IF NOT EXISTS "cta_text" text,
ADD COLUMN IF NOT EXISTS "cta_url" text;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'websites' 
AND column_name IN ('cta_text', 'cta_url');

