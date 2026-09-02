'use client';
import { useState, useEffect, useCallback } from 'react';
import { Product, Category } from '@/types';
import {
  isSupabaseConfigured,
  fetchProductsFromSupabase,
  fetchCategoriesFromSupabase,
  fetchSiteSettingsFromSupabase,
  syncAllToSupabase,
} from '@/lib/supabase';

export const ADMIN_STORAGE_KEY = 'velime-admin-data';
export const HERO_IMAGE_KEY = 'velime-hero-image';

export interface SiteData {
  heroTitle: string;
  heroSubtitle: string;
  heroCtaText: string;
  heroImage: string;
  products: Product[];
  categories: Category[];
  brands: string[];
  lookbookPhotos?: string[];
}

export const defaultSiteData: SiteData = {
  heroTitle: 'VELIME',
  heroSubtitle: 'Une allure , toujours',
  heroCtaText: 'Découvrir',
  heroImage: '/images/hero-custom.jpg',
  products: [],
  categories: [],
  brands: [
    'ZARA', 'MANGO', 'SANDRO', 'MASSIMO DUTTI', 'COS', 'BA&SH',
    '& OTHER STORIES', 'ARKET', 'JACQUEMUS', 'ROUJE', 'SÉZANE', 'IRO PARIS'
  ],
  lookbookPhotos: [
    '/images/p1.jpg',
    '/images/p2.jpg',
    '/images/p3.jpg',
    '/images/p4.jpg',
    '/images/p5.jpg',
    '/images/p6.jpg',
    '/images/p7.jpg',
  ],
};

// ============================================================
// SHARED REAL-TIME MODULE STATE & BROADCAST CHANNEL
// Ensures 100% instant auto-sync across all components & tabs
// ============================================================
let memorySiteData: SiteData = defaultSiteData;
let memoryLoaded = false;
const subscribers = new Set<(d: SiteData) => void>();

function notifyAll(newData: SiteData) {
  memorySiteData = newData;
  memoryLoaded = true;
  subscribers.forEach((cb) => {
    try {
      cb(newData);
    } catch {}
  });
}

function parseStoredData(): SiteData | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(ADMIN_STORAGE_KEY);
    const customHeroImg = localStorage.getItem(HERO_IMAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...defaultSiteData,
        ...parsed,
        heroImage: customHeroImg || parsed.heroImage || defaultSiteData.heroImage,
        products: Array.isArray(parsed.products) ? parsed.products : [],
        categories: Array.isArray(parsed.categories) ? parsed.categories : [],
        brands: parsed.brands && parsed.brands.length > 0 ? parsed.brands : defaultSiteData.brands,
        lookbookPhotos:
          parsed.lookbookPhotos && parsed.lookbookPhotos.length > 0
            ? parsed.lookbookPhotos
            : defaultSiteData.lookbookPhotos,
      };
    }
  } catch {}
  return null;
}

export function useSiteData() {
  const [data, setData] = useState<SiteData>(() => {
    if (memoryLoaded) return memorySiteData;
    const fromStorage = parseStoredData();
    if (fromStorage) {
      memorySiteData = fromStorage;
      memoryLoaded = true;
      return fromStorage;
    }
    return defaultSiteData;
  });

  const [isLoaded, setIsLoaded] = useState(memoryLoaded);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Subscribe this hook instance to shared live updates
  useEffect(() => {
    subscribers.add(setData);
    return () => {
      subscribers.delete(setData);
    };
  }, []);

  // 1. Initial LocalStorage load & BroadcastChannel listener
  useEffect(() => {
    const fromStorage = parseStoredData();
    if (fromStorage) {
      notifyAll(fromStorage);
      setIsLoaded(true);
    } else {
      setIsLoaded(true);
    }

    // Cross-tab broadcast listener for instant sync
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('velime_sync_channel');
        bc.onmessage = (event) => {
          if (event.data?.type === 'SYNC' && event.data?.payload) {
            notifyAll(event.data.payload);
          }
        };
      }
    } catch {}

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === ADMIN_STORAGE_KEY || e.key === HERO_IMAGE_KEY) {
        const fresh = parseStoredData();
        if (fresh) notifyAll(fresh);
      }
    };

    const handleCustomChange = () => {
      const fresh = parseStoredData();
      if (fresh) notifyAll(fresh);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('velime-data-updated', handleCustomChange);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('velime-data-updated', handleCustomChange);
    };
  }, []);

  // 2. Fetch latest data from Supabase in background
  const loadSupabaseData = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setIsSupabaseConnected(false);
      return;
    }
    try {
      setIsSyncing(true);
      const [sbProducts, sbCategories, sbSettings] = await Promise.all([
        fetchProductsFromSupabase(),
        fetchCategoriesFromSupabase(),
        fetchSiteSettingsFromSupabase(),
      ]);

      if (sbProducts !== null || sbCategories !== null || sbSettings !== null) {
        setIsSupabaseConnected(true);

        const currentLocal = memorySiteData;

        // Merge: keep local items that haven't been pushed to Supabase yet
        let mergedProducts = currentLocal.products;
        if (Array.isArray(sbProducts)) {
          if (sbProducts.length === 0 && currentLocal.products.length === 0) {
            mergedProducts = [];
          } else if (sbProducts.length > 0) {
            const localOnly = currentLocal.products.filter(
              (lp) => !sbProducts.some((sp) => sp.id === lp.id)
            );
            mergedProducts = [...sbProducts, ...localOnly];
          }
        }

        let mergedCategories = currentLocal.categories;
        if (Array.isArray(sbCategories)) {
          if (sbCategories.length === 0 && currentLocal.categories.length === 0) {
            mergedCategories = [];
          } else if (sbCategories.length > 0) {
            const localOnlyCats = currentLocal.categories.filter(
              (lc) => !sbCategories.some((sc) => sc.id === lc.id)
            );
            mergedCategories = [...sbCategories, ...localOnlyCats];
          }
        }

        const isSbHeroCustom = sbSettings?.heroImage && sbSettings.heroImage !== '/images/hero-fabric.jpg';
        const isPrevDefault = !currentLocal.heroImage || currentLocal.heroImage === '/images/hero-fabric.jpg';
        const resolvedHeroImg = (isSbHeroCustom ? sbSettings?.heroImage : (isPrevDefault ? (sbSettings?.heroImage || currentLocal.heroImage) : currentLocal.heroImage)) || defaultSiteData.heroImage;

        const merged: SiteData = {
          heroTitle: sbSettings?.heroTitle || currentLocal.heroTitle,
          heroSubtitle: sbSettings?.heroSubtitle || currentLocal.heroSubtitle,
          heroCtaText: sbSettings?.heroCtaText || currentLocal.heroCtaText,
          heroImage: resolvedHeroImg,
          brands: sbSettings?.brands && sbSettings.brands.length > 0 ? sbSettings.brands : currentLocal.brands,
          lookbookPhotos: sbSettings?.lookbookPhotos && sbSettings.lookbookPhotos.length > 0 ? sbSettings.lookbookPhotos : currentLocal.lookbookPhotos,
          categories: mergedCategories,
          products: mergedProducts,
        };

        try {
          localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(merged));
          if (resolvedHeroImg) {
            localStorage.setItem(HERO_IMAGE_KEY, resolvedHeroImg);
          }
        } catch {}

        notifyAll(merged);
      }
    } catch (err) {
      console.warn('Supabase fetch error, fallback to local data:', err);
      setIsSupabaseConnected(false);
    } finally {
      setIsSyncing(false);
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadSupabaseData();
  }, [loadSupabaseData]);

  // Save to both LocalStorage, shared state, broadcast to all tabs, and push to Supabase
  const saveData = useCallback((newData: SiteData) => {
    // 1. Instantly update all subscribers on page in 0ms
    notifyAll(newData);

    // 2. Save to LocalStorage
    try {
      localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(newData));
      if (newData.heroImage) {
        localStorage.setItem(HERO_IMAGE_KEY, newData.heroImage);
      }
    } catch (err) {
      console.error('LocalStorage write error:', err);
    }

    // 3. Broadcast to all other tabs instantly
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('velime_sync_channel');
        bc.postMessage({ type: 'SYNC', payload: newData });
        bc.close();
      }
    } catch {}

    window.dispatchEvent(new Event('velime-data-updated'));

    // 4. Asynchronously push to Supabase in background
    if (isSupabaseConfigured()) {
      syncAllToSupabase(newData)
        .then((res) => {
          if (res.success) {
            setIsSupabaseConnected(true);
          }
        })
        .catch((err) => {
          console.warn('Background Supabase save error:', err);
        });
    }
  }, []);

  // Explicit sync method for Admin UI
  const triggerSupabaseSync = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      return { success: false, message: 'Supabase n\'est pas encore configuré dans .env.local.' };
    }
    setIsSyncing(true);
    try {
      const res = await syncAllToSupabase(data);
      if (res.success) {
        setIsSupabaseConnected(true);
      }
      return res;
    } finally {
      setIsSyncing(false);
    }
  }, [data]);

  return {
    ...data,
    isLoaded,
    isSupabaseConnected: isSupabaseConfigured() && isSupabaseConnected,
    isSupabaseConfigured: isSupabaseConfigured(),
    isSyncing,
    setData,
    saveData,
    triggerSupabaseSync,
    reloadSupabase: loadSupabaseData,
  };
}
