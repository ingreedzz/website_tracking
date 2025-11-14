-- Create trigger/function to populate order_status_history snapshot fields and create safe constraints
-- Date: 2025-11-14

BEGIN;

-- 1) Function: populate snapshot fields BEFORE INSERT
CREATE OR REPLACE FUNCTION public.order_status_history_snapshot()
RETURNS trigger AS $$
BEGIN
  -- If changed_by_id not supplied but changed_by contains a UUID string, set changed_by_id
  IF NEW.changed_by_id IS NULL AND NEW.changed_by IS NOT NULL THEN
    IF NEW.changed_by ~ '^[0-9a-fA-F\-]{36}$' THEN
      NEW.changed_by_id := NEW.changed_by::uuid;
    END IF;
  END IF;

  -- Fill changed_by_email and changed_by_name from users when possible
  IF (NEW.changed_by_email IS NULL OR NEW.changed_by_name IS NULL) AND NEW.changed_by_id IS NOT NULL THEN
    SELECT email, name INTO NEW.changed_by_email, NEW.changed_by_name FROM public.users WHERE users_id = NEW.changed_by_id LIMIT 1;
  END IF;

  -- Fill customer/order/payment data from orders if missing
  IF (NEW.customer_name IS NULL OR NEW.order_name IS NULL OR NEW.payment_status IS NULL OR NEW.product IS NULL) AND NEW.order_id IS NOT NULL THEN
    SELECT customer_name, order_name, payment_status INTO NEW.customer_name, NEW.order_name, NEW.payment_status
    FROM public.orders WHERE orders_id = NEW.order_id LIMIT 1;

    -- product: try to use first order_item product snapshot
    IF NEW.product IS NULL THEN
      SELECT oi.product_snapshot->>'product' INTO NEW.product
      FROM public.order_items oi
      WHERE oi.order_id = NEW.order_id
      ORDER BY oi.items_id
      LIMIT 1;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2) Create trigger
DROP TRIGGER IF EXISTS trg_order_status_history_snapshot ON public.order_status_history;
CREATE TRIGGER trg_order_status_history_snapshot
BEFORE INSERT ON public.order_status_history
FOR EACH ROW EXECUTE FUNCTION public.order_status_history_snapshot();

-- 3) Add check constraint for payment_status values (add only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'c'
      AND t.relname = 'order_status_history'
      AND c.conname = 'osh_payment_status_check'
  ) THEN
    ALTER TABLE public.order_status_history
      ADD CONSTRAINT osh_payment_status_check CHECK (payment_status IS NULL OR payment_status IN ('pending','completed','failed','refunded'));
  END IF;
END$$;

-- 4) Add indexes if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_order_status_history_order_id_created_at') THEN
    CREATE INDEX idx_order_status_history_order_id_created_at ON public.order_status_history(order_id, created_at DESC);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_order_status_history_changed_by_id') THEN
    CREATE INDEX idx_order_status_history_changed_by_id ON public.order_status_history(changed_by_id);
  END IF;
END$$;

COMMIT;

-- Note: The trigger will try to populate missing snapshot fields on insert so application code can be minimal.
-- Test the trigger on staging with new inserts to ensure performance is acceptable. If you prefer smaller triggers,
-- consider moving population into application code.
