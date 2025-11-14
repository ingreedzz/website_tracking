-- Backfill existing order_status_history snapshot fields
-- Safe to run after migration that added the new columns (20251114_add_order_status_history_fields.sql)
-- Run on staging first. This script will only populate NULL snapshot fields and will not overwrite existing values.

BEGIN;

-- 1) Backfill changed_by_id from changed_by if changed_by contains a UUID string
-- This assumes legacy `changed_by` column contains a UUID text in existing rows.
UPDATE public.order_status_history osh
SET changed_by_id = osh.changed_by::uuid
WHERE osh.changed_by_id IS NULL
  AND osh.changed_by IS NOT NULL
  -- Cast to text before applying regex so this works if changed_by is uuid or text
  AND osh.changed_by::text ~ '^[0-9a-fA-F-]{36}$';

-- 2) Populate changed_by_email / changed_by_name from users where possible
UPDATE public.order_status_history osh
SET changed_by_email = u.email,
    changed_by_name = u.name
FROM public.users u
WHERE osh.changed_by_id = u.users_id
  AND (osh.changed_by_email IS NULL OR osh.changed_by_name IS NULL);

-- 3) Populate customer_name/order_name/payment_status from orders
UPDATE public.order_status_history osh
SET customer_name = o.customer_name,
    order_name = o.order_name,
    payment_status = o.payment_status
FROM public.orders o
WHERE osh.order_id = o.orders_id
  AND (osh.customer_name IS NULL OR osh.order_name IS NULL OR osh.payment_status IS NULL);

-- 4) Populate product from the first order_items.product_snapshot->>'product'
-- Only update if product is NULL
UPDATE public.order_status_history osh
SET product = oi.product_snapshot->>'product'
FROM public.order_items oi
WHERE oi.order_id = osh.order_id
  AND osh.product IS NULL
  AND oi.items_id = (
    SELECT items_id FROM public.order_items WHERE order_id = osh.order_id ORDER BY items_id LIMIT 1
  );

COMMIT;

-- Notes:
-- - This script only fills NULL snapshot columns; it does not remove or change existing values.
-- - Test on staging before applying to production. Create a DB backup/snapshot first.
-- - If your legacy `changed_by` used non-UUID values, the first update will skip those rows.
