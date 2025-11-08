-- Migration: Change keyword_density from INTEGER to REAL (FLOAT)
-- Run this in your Supabase SQL editor or via psql

ALTER TABLE "drafts" 
ALTER COLUMN "keyword_density" TYPE REAL USING "keyword_density"::REAL;

-- Verify the column type was changed
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'drafts' 
AND column_name = 'keyword_density';

