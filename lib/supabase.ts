import { createClient } from '@supabase/supabase-js';
import { Product, Category } from '@/types';

// Inline interface to avoid circular import:
// lib/supabase → hooks/useSiteData → context/SiteDataContext → lib/supabase
interface SiteData {
  heroTitle: string;
  heroSubtitle: string;
  heroCtaText: string;
  heroImage: string;
  products: Product[];
  categories: Category[];
  brands: string[];
  lookbookPhotos?: string[];
}

const DEFAULT_SUPABASE_URL = 'https://poswtkarskyouacsjfct.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvc3d0a2Fyc2t5b3VhY3NqZmN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDc2ODUsImV4cCI6MjEwNTYyMzY4NX0.YD4j5e7WoPflFDdNqL3okTCJ9sqJyQh6lvMJ1FheJDg';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    supabaseAnonKey.length > 20
  );
};

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ============================================================
// DATA MAPPERS (Database Snake_case <-> TypeScript CamelCase)
// ============================================================

export interface DbProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  original_price?: number | null;
  image: string;
  images: string[];
  category: string;
  description: string;
  sizes: string[];
  available_sizes?: string[] | null;
  colors?: string[] | null;
  available_colors?: string[] | null;
  stock_matrix?: any[] | null;
  in_stock: boolean;
  stock_status: string;
  badge?: string | null;
  is_new?: boolean | null;
  is_best_seller?: boolean | null;
  created_at?: string;
  updated_at?: string;
}

export function mapDbToProduct(db: DbProduct): Product {
  return {
    id: db.id,
    slug: db.slug,
    name: db.name,
    price: Number(db.price),
    originalPrice: db.original_price ? Number(db.original_price) : undefined,
    image: db.image,
    images: Array.isArray(db.images) ? db.images : [db.image],
    category: db.category,
    description: db.description || '',
    sizes: Array.isArray(db.sizes) ? db.sizes : ['S', 'M', 'L'],
    availableSizes: Array.isArray(db.available_sizes) ? db.available_sizes : undefined,
    colors: Array.isArray(db.colors) ? db.colors : undefined,
    availableColors: Array.isArray(db.available_colors) ? db.available_colors : undefined,
    stockMatrix: Array.isArray(db.stock_matrix) ? db.stock_matrix : undefined,
    inStock: Boolean(db.in_stock),
    stockStatus: (db.stock_status as Product['stockStatus']) || (db.in_stock ? 'in_stock' : 'total_out'),
    badge: db.badge || undefined,
    isNew: Boolean(db.is_new),
    isBestSeller: Boolean(db.is_best_seller),
  };
}

export function mapProductToDb(p: Product): DbProduct {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price,
    original_price: p.originalPrice || null,
    image: p.image,
    images: p.images && p.images.length > 0 ? p.images : [p.image],
    category: p.category,
    description: p.description,
    sizes: p.sizes || ['S', 'M', 'L'],
    available_sizes: p.availableSizes || null,
    colors: p.colors || null,
    available_colors: p.availableColors || null,
    stock_matrix: p.stockMatrix || null,
    in_stock: p.inStock,
    stock_status: p.stockStatus,
    badge: p.badge || null,
    is_new: Boolean(p.isNew),
    is_best_seller: Boolean(p.isBestSeller),
    updated_at: new Date().toISOString(),
  };
}

// ============================================================
// SUPABASE CRUD SERVICES
// ============================================================

export async function fetchProductsFromSupabase(): Promise<Product[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetchProducts error:', error.message);
      return null;
    }
    if (data && data.length > 0) {
      return data.map(mapDbToProduct);
    }
    if (data && data.length === 0) {
      return [];
    }
    return null;
  } catch (err) {
    console.warn('Supabase fetchProducts exception:', err);
    return null;
  }
}

export async function fetchProductBySlugFromSupabase(slugOrId: string): Promise<Product | null> {
  if (!supabase) return null;
  try {
    const raw = slugOrId.trim();
    const decoded = decodeURIComponent(raw).trim().toLowerCase();

    // Query by exact slug, case-insensitive slug, or id
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .or(`slug.eq.${raw},slug.ilike.${decoded},id.eq.${raw}`)
      .limit(1);

    if (!error && data && data.length > 0) {
      return mapDbToProduct(data[0]);
    }

    // Fallback: fetch all and find in memory to handle any special character nuances
    const { data: allData } = await supabase
      .from('products')
      .select('*');

    if (allData && allData.length > 0) {
      const match = allData.find((p) => {
        const pSlug = (p.slug || '').toLowerCase().trim();
        const pId = (p.id || '').toLowerCase().trim();
        return pSlug === decoded || pId === decoded || pSlug === raw.toLowerCase() || pId === raw.toLowerCase();
      });
      if (match) {
        return mapDbToProduct(match);
      }
    }

    return null;
  } catch (err) {
    console.warn('Supabase fetchProductBySlug exception:', err);
    return null;
  }
}

export async function saveProductToSupabase(product: Product): Promise<boolean> {
  if (!supabase) return false;
  try {
    const dbPayload = mapProductToDb(product);
    let { error } = await supabase
      .from('products')
      .upsert(dbPayload, { onConflict: 'id' });

    // If stock_matrix column is missing in user's database, retry without it
    if (error && error.message?.includes('stock_matrix')) {
      const fallbackPayload = { ...dbPayload };
      delete fallbackPayload.stock_matrix;
      const res = await supabase.from('products').upsert(fallbackPayload, { onConflict: 'id' });
      error = res.error;
    }

    if (error) {
      console.error('Supabase saveProduct error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase saveProduct exception:', err);
    return false;
  }
}

export async function updateProductStockInSupabase(
  productId: string,
  stockStatus: Product['stockStatus'],
  inStock: boolean,
  badge?: string,
  stockMatrix?: any[],
  availableSizes?: string[],
  availableColors?: string[]
): Promise<boolean> {
  if (!supabase) return false;
  try {
    const payload: any = {
      stock_status: stockStatus,
      in_stock: inStock,
      badge: badge ?? null,
      updated_at: new Date().toISOString(),
    };
    if (stockMatrix !== undefined) payload.stock_matrix = stockMatrix;
    if (availableSizes !== undefined) payload.available_sizes = availableSizes;
    if (availableColors !== undefined) payload.available_colors = availableColors;

    let { error } = await supabase
      .from('products')
      .update(payload)
      .eq('id', productId);

    // Fallback if stock_matrix column is missing
    if (error && error.message?.includes('stock_matrix')) {
      delete payload.stock_matrix;
      const retry = await supabase.from('products').update(payload).eq('id', productId);
      error = retry.error;
    }

    if (error) {
      console.error('Supabase updateProductStock error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase updateProductStock exception:', err);
    return false;
  }
}

export async function deleteProductFromSupabase(productId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) {
      console.error('Supabase deleteProduct error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase deleteProduct exception:', err);
    return false;
  }
}

export async function fetchCategoriesFromSupabase(): Promise<Category[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.warn('Supabase fetchCategories error:', error.message);
      return null;
    }
    if (data && data.length > 0) {
      return data.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description || undefined,
        image: c.image || undefined,
      }));
    }
    if (data && data.length === 0) {
      return [];
    }
    return null;
  } catch (err) {
    console.warn('Supabase fetchCategories exception:', err);
    return null;
  }
}

export async function saveCategoryToSupabase(category: Category): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('categories')
      .upsert(
        {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description || null,
          image: category.image || null,
        },
        { onConflict: 'id' }
      );

    if (error) {
      console.error('Supabase saveCategory error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase saveCategory exception:', err);
    return false;
  }
}

export async function deleteCategoryFromSupabase(categoryId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      console.error('Supabase deleteCategory error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase deleteCategory exception:', err);
    return false;
  }
}

export async function fetchSiteSettingsFromSupabase(): Promise<Partial<SiteData> | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    if (error) {
      console.warn('Supabase fetchSiteSettings error:', error.message);
      return null;
    }
    if (data) {
      return {
        heroTitle: data.hero_title || undefined,
        heroSubtitle: data.hero_subtitle || undefined,
        heroCtaText: data.hero_cta_text || undefined,
        heroImage: data.hero_image || undefined,
        brands: Array.isArray(data.brands) ? data.brands : undefined,
        lookbookPhotos: Array.isArray(data.lookbook_photos) ? data.lookbook_photos : undefined,
      };
    }
    return null;
  } catch (err) {
    console.warn('Supabase fetchSiteSettings exception:', err);
    return null;
  }
}

export async function saveSiteSettingsToSupabase(data: {
  heroTitle?: string;
  heroSubtitle?: string;
  heroCtaText?: string;
  heroImage?: string;
  brands?: string[];
  lookbookPhotos?: string[];
}): Promise<boolean> {
  if (!supabase) return false;
  try {
    const payload: any = {
      id: 'default',
      hero_title: data.heroTitle || 'VELIME',
      hero_subtitle: data.heroSubtitle || "L'élégance au quotidien",
      hero_cta_text: data.heroCtaText || 'Découvrir',
      hero_image: data.heroImage || '/images/hero-fabric.jpg',
      brands: data.brands || [],
      lookbook_photos: data.lookbookPhotos || [],
      updated_at: new Date().toISOString(),
    };
    let { error } = await supabase.from('site_settings').upsert(payload, { onConflict: 'id' });

    if (error && error.message?.includes('lookbook_photos')) {
      delete payload.lookbook_photos;
      const res = await supabase.from('site_settings').upsert(payload, { onConflict: 'id' });
      error = res.error;
    }

    if (error) {
      console.error('Supabase saveSiteSettings error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase saveSiteSettings exception:', err);
    return false;
  }
}

export async function syncAllToSupabase(siteData: SiteData): Promise<{ success: boolean; message: string }> {
  if (!supabase) {
    return { success: false, message: 'Supabase n\'est pas encore configuré dans le fichier .env.local.' };
  }
  try {
    // 1. Categories - Sync active & clean up deleted
    const currentCatIds = siteData.categories.map((c) => c.id);
    const { data: existingCats } = await supabase.from('categories').select('id');
    if (existingCats && existingCats.length > 0) {
      const toDeleteCats = existingCats
        .filter((ec) => !currentCatIds.includes(ec.id))
        .map((ec) => ec.id);
      if (toDeleteCats.length > 0) {
        await supabase.from('categories').delete().in('id', toDeleteCats);
      }
    }
    if (siteData.categories.length > 0) {
      const categoriesPayload = siteData.categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description || null,
        image: c.image || null,
      }));
      const { error: catErr } = await supabase.from('categories').upsert(categoriesPayload, { onConflict: 'id' });
      if (catErr) console.warn(`Erreur catégories: ${catErr.message}`);
    }

    // 2. Products - Sync active & clean up deleted
    const currentProdIds = siteData.products.map((p) => p.id);
    const { data: existingProds } = await supabase.from('products').select('id');
    if (existingProds && existingProds.length > 0) {
      const toDeleteProds = existingProds
        .filter((ep) => !currentProdIds.includes(ep.id))
        .map((ep) => ep.id);
      if (toDeleteProds.length > 0) {
        await supabase.from('products').delete().in('id', toDeleteProds);
      }
    }
    if (siteData.products.length > 0) {
      const productsPayload = siteData.products.map(mapProductToDb);
      let { error: prodErr } = await supabase.from('products').upsert(productsPayload, { onConflict: 'id' });
      
      // Fallback if stock_matrix column is not yet in Supabase schema
      if (prodErr && prodErr.message?.includes('stock_matrix')) {
        const fallbackPayloads = productsPayload.map((p) => {
          const clone = { ...p };
          delete clone.stock_matrix;
          return clone;
        });
        const retryRes = await supabase.from('products').upsert(fallbackPayloads, { onConflict: 'id' });
        prodErr = retryRes.error;
      }

      if (prodErr) console.warn(`Erreur articles: ${prodErr.message}`);
    }

    // 3. Settings
    try {
      const settingsPayload: any = {
        id: 'default',
        hero_title: siteData.heroTitle,
        hero_subtitle: siteData.heroSubtitle,
        hero_cta_text: siteData.heroCtaText,
        hero_image: siteData.heroImage,
        brands: siteData.brands,
        lookbook_photos: siteData.lookbookPhotos,
        updated_at: new Date().toISOString(),
      };
      let { error: setErr } = await supabase.from('site_settings').upsert(settingsPayload, { onConflict: 'id' });
      if (setErr && setErr.message?.includes('lookbook_photos')) {
        delete settingsPayload.lookbook_photos;
        const retrySet = await supabase.from('site_settings').upsert(settingsPayload, { onConflict: 'id' });
        setErr = retrySet.error;
      }
      if (setErr) {
        console.warn('Supabase site_settings notice:', setErr.message);
      }
    } catch (setEx) {
      console.warn('Supabase site_settings exception:', setEx);
    }

    return {
      success: true,
      message: `Synchronisation réussie ! (${siteData.products.length} articles, ${siteData.categories.length} catégories).`,
    };
  } catch (err: any) {
    console.error('SyncAllToSupabase failed:', err);
    return {
      success: false,
      message: err.message || 'Une erreur est survenue lors de la synchronisation.',
    };
  }
}
