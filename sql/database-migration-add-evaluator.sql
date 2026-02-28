-- Migration: Add is_evaluator column to agents table
-- This allows marking certain agents as evaluation models (used for post-test AI analysis)

ALTER TABLE agents ADD COLUMN IF NOT EXISTS is_evaluator BOOLEAN DEFAULT FALSE;
