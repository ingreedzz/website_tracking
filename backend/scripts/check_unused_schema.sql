-- check_unused_schema.sql
-- Diagnostic script to inspect usage of tables/columns referenced in your schema.
-- Paste this into Supabase SQL editor or run with psql. No destructive actions.

-- Section: quick row counts for primary tables
SELECT 'ROW_COUNTS' AS section;
SELECT 'colors' AS table_name, COUNT(*) AS row_count FROM public.colors;
SELECT 'models' AS table_name, COUNT(*) AS row_count FROM public.models;
SELECT 'product_variants' AS table_name, COUNT(*) AS row_count FROM public.product_variants;
SELECT 'products' AS table_name, COUNT(*) AS row_count FROM public.products;
SELECT 'orders' AS table_name, COUNT(*) AS row_count FROM public.orders;
SELECT 'order_items' AS table_name, COUNT(*) AS row_count FROM public.order_items;
SELECT 'order_addresses' AS table_name, COUNT(*) AS row_count FROM public.order_addresses;
SELECT 'order_status_history' AS table_name, COUNT(*) AS row_count FROM public.order_status_history;
SELECT 'payments' AS table_name, COUNT(*) AS row_count FROM public.payments;
SELECT 'users' AS table_name, COUNT(*) AS row_count FROM public.users;

-- Section: non-null FK / column usage
SELECT 'NON_NULL_COLUMN_COUNTS' AS section;
SELECT 'order_items.color_id' AS column, COUNT(*) AS non_null_count FROM public.order_items WHERE color_id IS NOT NULL;
SELECT 'order_items.variant_id' AS column, COUNT(*) AS non_null_count FROM public.order_items WHERE variant_id IS NOT NULL;
SELECT 'product_variants.color_id' AS column, COUNT(*) AS non_null_count FROM public.product_variants WHERE color_id IS NOT NULL;
SELECT 'product_variants.model_id' AS column, COUNT(*) AS non_null_count FROM public.product_variants WHERE model_id IS NOT NULL;
SELECT 'order_addresses.order_id' AS column, COUNT(*) AS non_null_count FROM public.order_addresses WHERE order_id IS NOT NULL;
SELECT 'order_status_history.order_id' AS column, COUNT(*) AS non_null_count FROM public.order_status_history WHERE order_id IS NOT NULL;
SELECT 'order_status_history.changed_by' AS column, COUNT(*) AS non_null_count FROM public.order_status_history WHERE changed_by IS NOT NULL;
SELECT 'order_status_history.changed_by_id' AS column, COUNT(*) AS non_null_count FROM public.order_status_history WHERE changed_by_id IS NOT NULL;
SELECT 'payments.order_id' AS column, COUNT(*) AS non_null_count FROM public.payments WHERE order_id IS NOT NULL;
SELECT 'orders.user_id' AS column, COUNT(*) AS non_null_count FROM public.orders WHERE user_id IS NOT NULL;

-- Section: distinct references (how many different referenced ids)
SELECT 'DISTINCT_REFERENCE_COUNTS' AS section;
SELECT 'order_items.distinct_variant_ids' AS subject, COUNT(DISTINCT variant_id) FROM public.order_items WHERE variant_id IS NOT NULL;
SELECT 'order_items.distinct_color_ids' AS subject, COUNT(DISTINCT color_id) FROM public.order_items WHERE color_id IS NOT NULL;
SELECT 'product_variants.distinct_model_ids' AS subject, COUNT(DISTINCT model_id) FROM public.product_variants WHERE model_id IS NOT NULL;
SELECT 'product_variants.distinct_color_ids' AS subject, COUNT(DISTINCT color_id) FROM public.product_variants WHERE color_id IS NOT NULL;

-- Section: orphaned FK checks (rows referencing missing parent rows)
SELECT 'ORPHAN_FK_COUNTS' AS section;
-- product_variants -> models
SELECT 'product_variants.model_id_missing' AS check, COUNT(*) AS orphan_count
FROM public.product_variants pv
LEFT JOIN public.models m ON pv.model_id = m.models_id
WHERE pv.model_id IS NOT NULL AND m.models_id IS NULL;

-- product_variants -> colors
SELECT 'product_variants.color_id_missing' AS check, COUNT(*) AS orphan_count
FROM public.product_variants pv
LEFT JOIN public.colors c ON pv.color_id = c.color_id
WHERE pv.color_id IS NOT NULL AND c.color_id IS NULL;

-- order_items -> product_variants
SELECT 'order_items.variant_id_missing' AS check, COUNT(*) AS orphan_count
FROM public.order_items oi
LEFT JOIN public.product_variants pv ON oi.variant_id = pv.variants_id
WHERE oi.variant_id IS NOT NULL AND pv.variants_id IS NULL;

-- order_items -> colors
SELECT 'order_items.color_id_missing' AS check, COUNT(*) AS orphan_count
FROM public.order_items oi
LEFT JOIN public.colors c ON oi.color_id = c.color_id
WHERE oi.color_id IS NOT NULL AND c.color_id IS NULL;

-- order_addresses -> orders
SELECT 'order_addresses.order_id_missing' AS check, COUNT(*) AS orphan_count
FROM public.order_addresses oa
LEFT JOIN public.orders o ON oa.order_id = o.orders_id
WHERE oa.order_id IS NOT NULL AND o.orders_id IS NULL;

-- order_status_history -> orders
SELECT 'order_status_history.order_id_missing' AS check, COUNT(*) AS orphan_count
FROM public.order_status_history h
LEFT JOIN public.orders o ON h.order_id = o.orders_id
WHERE h.order_id IS NOT NULL AND o.orders_id IS NULL;

-- order_status_history -> users (changed_by & changed_by_id)
SELECT 'order_status_history.changed_by_missing' AS check, COUNT(*) AS orphan_count
FROM public.order_status_history h
LEFT JOIN public.users u ON h.changed_by = u.users_id
WHERE h.changed_by IS NOT NULL AND u.users_id IS NULL;

SELECT 'order_status_history.changed_by_id_missing' AS check, COUNT(*) AS orphan_count
FROM public.order_status_history h
LEFT JOIN public.users u ON h.changed_by_id = u.users_id
WHERE h.changed_by_id IS NOT NULL AND u.users_id IS NULL;

-- payments -> orders
SELECT 'payments.order_id_missing' AS check, COUNT(*) AS orphan_count
FROM public.payments p
LEFT JOIN public.orders o ON p.order_id = o.orders_id
WHERE p.order_id IS NOT NULL AND o.orders_id IS NULL;

-- orders -> users
SELECT 'orders.user_id_missing' AS check, COUNT(*) AS orphan_count
FROM public.orders o
LEFT JOIN public.users u ON o.user_id = u.users_id
WHERE o.user_id IS NOT NULL AND u.users_id IS NULL;

-- Section: sample orphan rows for manual inspection (limit 50 each)
SELECT 'SAMPLE_ORPHAN_PRODUCT_VARIANTS' AS sample_label;
SELECT pv.* FROM public.product_variants pv
LEFT JOIN public.models m ON pv.model_id = m.models_id
WHERE pv.model_id IS NOT NULL AND m.models_id IS NULL
LIMIT 50;

SELECT 'SAMPLE_ORPHAN_ORDER_ITEMS_VARIANT' AS sample_label;
SELECT oi.* FROM public.order_items oi
LEFT JOIN public.product_variants pv ON oi.variant_id = pv.variants_id
WHERE oi.variant_id IS NOT NULL AND pv.variants_id IS NULL
LIMIT 50;

SELECT 'SAMPLE_ORPHAN_ORDER_ITEMS_COLOR' AS sample_label;
SELECT oi.* FROM public.order_items oi
LEFT JOIN public.colors c ON oi.color_id = c.color_id
WHERE oi.color_id IS NOT NULL AND c.color_id IS NULL
LIMIT 50;

SELECT 'SAMPLE_ORPHAN_ORDER_ADDRESSES' AS sample_label;
SELECT oa.* FROM public.order_addresses oa
LEFT JOIN public.orders o ON oa.order_id = o.orders_id
WHERE oa.order_id IS NOT NULL AND o.orders_id IS NULL
LIMIT 50;

-- Section: columns that might be obsolete - show how many non-null values and distinct values
SELECT 'POTENTIAL_UNUSED_COLUMNS' AS section;
SELECT 'order_items.sablon_path' AS column, COUNT(*) AS non_null_count, COUNT(DISTINCT sablon_path) AS distinct_values FROM public.order_items WHERE sablon_path IS NOT NULL;
SELECT 'order_items.is_delivered' AS column, COUNT(*) AS non_null_count, COUNT(DISTINCT is_delivered) AS distinct_values FROM public.order_items WHERE is_delivered IS NOT NULL;
SELECT 'order_items.received_date' AS column, COUNT(*) AS non_null_count FROM public.order_items WHERE received_date IS NOT NULL;
SELECT 'order_items.delivered_date' AS column, COUNT(*) AS non_null_count FROM public.order_items WHERE delivered_date IS NOT NULL;

-- Section: quick JSONB checks (size of product_snapshot / size_fields)
SELECT 'JSONB_SIZES' AS section;
-- Safely compute average length when product_snapshot is a JSON array;
-- if it's an object or null, count as 1 (or ignore nulls).
SELECT 'avg product_snapshot jsonb length' AS metric,
	AVG(
		CASE
			WHEN product_snapshot IS NULL THEN NULL
			WHEN jsonb_typeof(product_snapshot) = 'array' THEN jsonb_array_length(product_snapshot)::numeric
			ELSE 1
		END
	)
FROM public.order_items
LIMIT 1;
-- Note: JSONB sizing is application dependent, keep in mind product_snapshot is probably used heavily.

-- End of diagnostic script
-- After running: review counts, orphan counts, and sample orphan rows.
-- If you want, paste the results here and I will recommend specific rename/drop migrations and generate reversible migration SQL.
