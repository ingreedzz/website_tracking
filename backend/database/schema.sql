-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables in reverse order to handle dependencies
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.order_addresses CASCADE;
DROP TABLE IF EXISTS public.order_status_history CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.product_variants CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.colors CASCADE;
DROP TABLE IF EXISTS public.models CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Create tables in correct order
CREATE TABLE public.users (
    users_id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    email text NOT NULL UNIQUE,
    password text NOT NULL,
    name text,
    phone text,
    role text DEFAULT 'customer',
    is_admin boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.colors (
    color_id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    hex text
);

CREATE TABLE public.models (
    models_id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    description text
);

CREATE TABLE public.products (
    products_id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    sku text UNIQUE,
    name text NOT NULL,
    description text,
    product_type text,
    base_price numeric DEFAULT 0,
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.product_variants (
    variants_id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id uuid REFERENCES public.products(products_id) ON DELETE CASCADE,
    model_id uuid REFERENCES public.models(models_id) ON DELETE SET NULL,
    color_id uuid REFERENCES public.colors(color_id) ON DELETE SET NULL,
    sku text UNIQUE,
    price numeric NOT NULL DEFAULT 0,
    stock integer,
    attributes jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.orders (
    orders_id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.users(users_id) ON DELETE SET NULL,
    status text DEFAULT 'pending',
    total numeric DEFAULT 0,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    order_date timestamptz DEFAULT now(),
    deadline date,
    payment_status text
);

CREATE TABLE public.order_status_history (
    order_status_history_id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id uuid REFERENCES public.orders(orders_id) ON DELETE CASCADE,
    old_status text,
    new_status text,
    changed_by uuid REFERENCES public.users(users_id) ON DELETE SET NULL,
    note text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.order_addresses (
    order_address_id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id uuid REFERENCES public.orders(orders_id) ON DELETE CASCADE,
    address text,
    phone text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.order_items (
    items_id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id uuid REFERENCES public.orders(orders_id) ON DELETE CASCADE,
    variant_id uuid REFERENCES public.product_variants(variants_id) ON DELETE SET NULL,
    product_snapshot jsonb NOT NULL DEFAULT '{}',
    quantity integer NOT NULL DEFAULT 1,
    unit_price numeric NOT NULL DEFAULT 0,
    customization jsonb DEFAULT '{}',
    calculated_price numeric NOT NULL DEFAULT 0,
    is_delivered boolean DEFAULT false,
    received_date timestamptz,
    delivered_date timestamptz,
    sablon_path text,
    color_id uuid REFERENCES public.colors(color_id) ON DELETE SET NULL
);

CREATE TABLE public.payments (
    payment_id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id uuid REFERENCES public.orders(orders_id) ON DELETE CASCADE,
    amount numeric NOT NULL,
    method text,
    status text DEFAULT 'pending',
    proof_url text,
    notes text,
    created_at timestamptz DEFAULT now(),
    confirmed_at timestamptz
);

-- Create indexes for better performance
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX idx_payments_order_id ON public.payments(order_id);

-- Add trigger for updating orders.updated_at
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_orders_updated_at();