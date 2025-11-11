# 🤖 AI Agent Setup Prompt

**Copy this entire file and paste it into your AI agent (Cursor, Copilot, Claude, ChatGPT, etc.)**

---

## Project Context

You are working on **website_tracking** - A modern web application

**Framework:** Vue.js  
**Setup Date:** November 10, 2025  
**Frontend Deploy:**  Vercel
**Backend Deploy:**  Render
**Database:**  Supabase

---

## Supabase Database Structure
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.colors (
  color_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  hex text,
  CONSTRAINT colors_pkey PRIMARY KEY (color_id)
);
CREATE TABLE public.models (
  models_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  description text,
  CONSTRAINT models_pkey PRIMARY KEY (models_id)
);
CREATE TABLE public.order_addresses (
  order_address_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid,
  address text,
  phone text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT order_addresses_pkey PRIMARY KEY (order_address_id),
  CONSTRAINT order_addresses_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(orders_id)
);
CREATE TABLE public.order_items (
  items_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid,
  variant_id uuid,
  product_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  customization jsonb DEFAULT '{}'::jsonb,
  calculated_price numeric NOT NULL DEFAULT 0,
  is_delivered boolean DEFAULT false,
  received_date timestamp with time zone,
  delivered_date timestamp with time zone,
  sablon_path text,
  color_id uuid,
  CONSTRAINT order_items_pkey PRIMARY KEY (items_id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(orders_id),
  CONSTRAINT order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(variants_id),
  CONSTRAINT order_items_color_id_fkey FOREIGN KEY (color_id) REFERENCES public.colors(color_id)
);
CREATE TABLE public.order_status_history (
  order_status_history_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid,
  old_status text,
  new_status text,
  changed_by uuid,
  note text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT order_status_history_pkey PRIMARY KEY (order_status_history_id),
  CONSTRAINT order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(orders_id),
  CONSTRAINT order_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(users_id)
);
CREATE TABLE public.orders (
  orders_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  status text DEFAULT 'pending'::text,
  total numeric DEFAULT 0,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  order_date timestamp with time zone DEFAULT now(),
  deadline date,
  payment_status text,
  CONSTRAINT orders_pkey PRIMARY KEY (orders_id),
  CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(users_id)
);
CREATE TABLE public.payments (
  payment_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid,
  amount numeric NOT NULL,
  method text,
  status text DEFAULT 'pending'::text,
  proof_url text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  confirmed_at timestamp with time zone,
  CONSTRAINT payments_pkey PRIMARY KEY (payment_id),
  CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(orders_id)
);
CREATE TABLE public.product_variants (
  variants_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  product_id uuid,
  model_id uuid,
  color_id uuid,
  sku text UNIQUE,
  price numeric NOT NULL DEFAULT 0,
  stock integer,
  attributes jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT product_variants_pkey PRIMARY KEY (variants_id),
  CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(products_id),
  CONSTRAINT product_variants_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.models(models_id),
  CONSTRAINT product_variants_color_id_fkey FOREIGN KEY (color_id) REFERENCES public.colors(color_id)
);
CREATE TABLE public.products (
  products_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  sku text UNIQUE,
  name text NOT NULL,
  description text,
  product_type text,
  base_price numeric DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT products_pkey PRIMARY KEY (products_id)
);
CREATE TABLE public.users (
  users_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  email text NOT NULL UNIQUE,
  password text NOT NULL,
  name text,
  phone text,
  role text DEFAULT 'customer'::text,
  is_admin boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (users_id)
);

## AI Memory System

This project uses a **3-file memory system** to give you perfect context and memory across all sessions.

### CRITICAL: Read These Files Before Every Task

**You MUST read these 3 files in order before starting any work:**

1. **AGENTS.md** - Development guidelines, tech stack, commands, and code conventions
2. **technical_overview.md** - System architecture, component interactions, and design decisions  
3. **PROGRESS.md** - Project history, completed features, current status, and known issues

### Workflow for Every Task

```
1. Read AGENTS.md (how to code in this project)
2. Read technical_overview.md (understand the architecture)
3. Read PROGRESS.md (know what's been built and current state)
4. Implement the requested feature/fix
5. Test thoroughly
6. Update PROGRESS.md with:
   - What was accomplished
   - Files modified/created
   - Testing results
   - Any important notes
7. Commit and push
```

### Non-Negotiable Rules

- ✅ **ALWAYS read all 3 memory files before starting work** - No exceptions
- ✅ **MUST update PROGRESS.md before every commit** - This maintains the memory system
- ✅ **Follow patterns in AGENTS.md** - Consistency is critical
- ✅ **Document significant changes** - Future you (and AI) will thank you

### Why This Matters

**Without reading the memory files:**
- ❌ You'll break established conventions
- ❌ You'll repeat past mistakes
- ❌ Code will be inconsistent
- ❌ Context will be lost between sessions

**With the memory system:**
- ✅ Perfect consistency across all sessions
- ✅ Never repeat mistakes
- ✅ Complete project context always available
- ✅ New features integrate seamlessly

---

## Quick Reference

**Before coding:** Read AGENTS.md → technical_overview.md → PROGRESS.md  
**After coding:** Update PROGRESS.md → Commit

**Memory files location:**
- `./AGENTS.md`
- `./PROGRESS.md`
- `./technical_overview.md`

---

**This prompt was generated by [@vibedevid/ai-memory](https://www.npmjs.com/package/@vibedevid/ai-memory)**

*You can now start working with complete project context and memory!* 🧠
