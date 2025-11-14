-- Migration: Add extended fields to order_status_history for richer audit trails
-- Date: 2025-11-14
-- Adds: changed_by_id (FK), changed_by_email, changed_by_name, customer_name, product, order_name, payment_status

BEGIN;

-- Add snapshot and FK columns if they do not already exist
ALTER TABLE public.order_status_history
  ADD COLUMN IF NOT EXISTS changed_by_id uuid;

ALTER TABLE public.order_status_history
  ADD COLUMN IF NOT EXISTS changed_by_email text;

ALTER TABLE public.order_status_history
  ADD COLUMN IF NOT EXISTS changed_by_name text;

ALTER TABLE public.order_status_history
  ADD COLUMN IF NOT EXISTS customer_name text;

ALTER TABLE public.order_status_history
  ADD COLUMN IF NOT EXISTS product text;

ALTER TABLE public.order_status_history
  ADD COLUMN IF NOT EXISTS order_name text;

ALTER TABLE public.order_status_history
  ADD COLUMN IF NOT EXISTS payment_status text;

-- Add foreign key constraint for changed_by_id only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f'
      AND t.relname = 'order_status_history'
      AND c.conname = 'order_status_history_changed_by_id_fkey'
  ) THEN
    ALTER TABLE public.order_status_history
      ADD CONSTRAINT order_status_history_changed_by_id_fkey FOREIGN KEY (changed_by_id) REFERENCES public.users(users_id) ON DELETE SET NULL;
  END IF;
END$$;

-- Add indexes to speed common queries
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_order_status_history_order_id') THEN
    CREATE INDEX idx_order_status_history_order_id ON public.order_status_history(order_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_order_status_history_changed_by_id') THEN
    CREATE INDEX idx_order_status_history_changed_by_id ON public.order_status_history(changed_by_id);
  END IF;
END$$;

COMMIT;

-- Notes:
-- 1) This migration intentionally adds "snapshot" text columns (changed_by_email/changed_by_name, product, customer_name, order_name, payment_status)
--    to record the exact values at the time of the status change. This is denormalization by design to preserve history even if
--    the referenced user/order/product changes later.
-- 2) The authoritative foreign-key relationship is kept via `changed_by_id` (nullable) so applications can still reference users.
-- 3) If you prefer fully normalized history (no duplicated fields), you can omit the snapshot columns and store only foreign keys
--    (changed_by_id, order_item_id, product_id). However, that loses an immutable snapshot of the user/display strings at the time
--    the event occurred unless you add additional audit tables or event sourcing.
