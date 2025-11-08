-- Migration: Add image_url column to drafts table
-- Run this SQL in your Supabase SQL editor or database

ALTER TABLE drafts ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'drafts' AND column_name = 'image_url';

