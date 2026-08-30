-- ============================================================
-- VELIME - SUPABASE DATABASE SCHEMA
-- Exécutez ce script dans l'éditeur SQL de votre projet Supabase
-- ============================================================

-- 1. Table des Catégories
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Table des Produits / Articles
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    original_price NUMERIC,
    image TEXT NOT NULL,
    images JSONB DEFAULT '[]'::jsonb NOT NULL,
    category TEXT NOT NULL,
    description TEXT DEFAULT '' NOT NULL,
    sizes JSONB DEFAULT '["S", "M", "L"]'::jsonb NOT NULL,
    available_sizes JSONB DEFAULT '["S", "M", "L"]'::jsonb,
    colors JSONB DEFAULT '[]'::jsonb,
    available_colors JSONB DEFAULT '[]'::jsonb,
    stock_matrix JSONB DEFAULT '[]'::jsonb,
    in_stock BOOLEAN DEFAULT true NOT NULL,
    stock_status TEXT DEFAULT 'in_stock' NOT NULL, -- 'in_stock' | 'partial_out' | 'total_out'
    badge TEXT,
    is_new BOOLEAN DEFAULT false,
    is_best_seller BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Table des Paramètres du Site (Bannière Hero, Marques)
CREATE TABLE IF NOT EXISTS public.site_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    hero_title TEXT DEFAULT 'VELIME',
    hero_subtitle TEXT DEFAULT 'L''élégance au quotidien',
    hero_cta_text TEXT DEFAULT 'Découvrir',
    hero_image TEXT DEFAULT '/images/hero-fabric.jpg',
    brands JSONB DEFAULT '[]'::jsonb NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Table des Commandes (Orders)
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    customer_name TEXT,
    customer_phone TEXT,
    customer_wilaya TEXT,
    customer_address TEXT,
    items JSONB NOT NULL, -- [{ productId, name, size, color, quantity, price }]
    total_price NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL, -- 'pending' | 'confirmed' | 'delivered' | 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index pour recherche rapide et performance
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_stock_status ON public.products(stock_status);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Lecture publique pour tous les visiteurs
CREATE POLICY "Public Read Categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public Read Products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public Read Site Settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Public Insert Orders" ON public.orders FOR INSERT WITH CHECK (true);

-- Écriture autorisée pour l'administration (Anon key autorisée pour mise à jour simple ou authenticated)
CREATE POLICY "Anon Full Access Categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon Full Access Products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon Full Access Site Settings" ON public.site_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon Full Access Orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
