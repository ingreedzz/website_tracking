-- Migration: Add unit_price column to models table
-- Date: November 13, 2025
-- Purpose: Support per-model pricing for order calculations

-- Add unit_price column to models table (nullable, numeric type)
ALTER TABLE models ADD COLUMN IF NOT EXISTS unit_price numeric;

-- Add comment to document the column
COMMENT ON COLUMN models.unit_price IS 'Unit price for this model in the smallest currency unit (e.g., Rupiah)';
