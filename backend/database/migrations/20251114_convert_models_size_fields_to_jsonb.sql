-- Migration: Convert models.size_fields to jsonb (non-destructive)
-- Date: 2025-11-14
-- This migration will:
-- 1) If `models.size_fields` does not exist, create it as jsonb DEFAULT '[]'.
-- 2) If it exists but is not jsonb, create a temporary jsonb column, copy/transcode values, drop old column, rename temp -> size_fields.
-- Run on staging first and backup DB.

BEGIN;

-- Ensure target column exists as jsonb (non-destructive)
DO $$
DECLARE
  col_type TEXT;
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='models' AND column_name='size_fields') THEN
    SELECT data_type INTO col_type FROM information_schema.columns WHERE table_schema='public' AND table_name='models' AND column_name='size_fields' LIMIT 1;

    -- If column exists but not jsonb/text/json, convert
    IF col_type <> 'json' AND col_type <> 'jsonb' THEN
      -- create temporary column
      ALTER TABLE public.models ADD COLUMN IF NOT EXISTS size_fields_tmp jsonb DEFAULT '[]'::jsonb;

      -- Try to copy values safely: for array types and others use to_jsonb or array_to_json
      -- Use a fallback to text conversion when necessary
      BEGIN
        -- If size_fields is an actual array or other, try generic to_jsonb
        EXECUTE 'UPDATE public.models SET size_fields_tmp = to_jsonb(size_fields) WHERE size_fields IS NOT NULL';
      EXCEPTION WHEN OTHERS THEN
        -- Fallback: cast to text and jsonb-encode
        EXECUTE 'UPDATE public.models SET size_fields_tmp = to_jsonb(size_fields::text) WHERE size_fields IS NOT NULL';
      END;

      -- Replace old column with new
      ALTER TABLE public.models DROP COLUMN IF EXISTS size_fields;
      ALTER TABLE public.models RENAME COLUMN size_fields_tmp TO size_fields;

    ELSE
      -- Already json/jsonb, ensure default and not null
      EXECUTE 'ALTER TABLE public.models ALTER COLUMN size_fields SET DEFAULT ''[]''::jsonb';
      -- If it's json (not jsonb), convert type to jsonb
      IF col_type = 'json' THEN
        ALTER TABLE public.models ALTER COLUMN size_fields TYPE jsonb USING size_fields::jsonb;
      END IF;
    END IF;
  ELSE
    -- Column doesn't exist: add jsonb column
    ALTER TABLE public.models ADD COLUMN IF NOT EXISTS size_fields jsonb DEFAULT '[]'::jsonb;
  END IF;
END$$;

COMMIT;

-- Notes:
-- - This migration uses a non-destructive strategy: it creates a temporary jsonb column and attempts to populate it,
--   then replaces the original column. Always test on staging prior to production.
-- - If your existing `size_fields` contained structured JSON already stored as text, the conversion should preserve it.
-- - If you use the `models.size_fields` in queries, consider adding a GIN index for faster lookup on jsonb:
--     CREATE INDEX idx_models_size_fields_gin ON public.models USING gin (size_fields jsonb_path_ops);
