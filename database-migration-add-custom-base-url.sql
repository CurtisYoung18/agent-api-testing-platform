-- Migration: Add custom_base_url field to agents table
-- Run this SQL in your database to add support for custom base URLs

-- Add custom_base_url column
ALTER TABLE agents ADD COLUMN IF NOT EXISTS custom_base_url VARCHAR(500);

-- Update region constraint to allow 'CUSTOM'
ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_region_check;
ALTER TABLE agents ADD CONSTRAINT agents_region_check CHECK (region IN ('SG', 'CN', 'CUSTOM'));

-- Verify the migration
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'agents' AND column_name = 'custom_base_url';

