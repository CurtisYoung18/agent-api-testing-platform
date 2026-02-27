-- Migration: Add TH (Thailand) region support
-- Run this SQL if your agents table has the old region constraint

-- Drop and recreate region constraint to allow TH
ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_region_check;
ALTER TABLE agents ADD CONSTRAINT agents_region_check CHECK (region IN ('SG', 'TH', 'CN', 'CUSTOM'));
