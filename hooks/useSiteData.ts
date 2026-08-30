'use client';
import { useState, useEffect, useCallback } from 'react';
import { products as defaultProducts, defaultCategories } from '@/data/products';
import { Product, Category } from '@/types';
import {
  isSupabaseConfigured,
  fetchProductsFromSupabase,
  fetchCategoriesFromSupabase,
  fetchSiteSettingsFromSupabase,
  syncAllToSupabase,
} from '@/lib/supabase';

export const ADMIN_STORAGE_KEY = 'velime-admin-data';

export interface SiteData {
  heroTitle: string;
  heroSubtitle: string;
  heroCtaText: string;
  heroImage: string;
  products: Product[];
  categories: Category[];
  brands: string[];
}

export const defaultSiteData: SiteData = {
  heroTitle: 'VELIME',
  heroSubtitle: "L'élégance au quotidien",
  heroCtaText: 'Découvrir',
  heroImage: '/images/hero-fabric.jpg',
  products: defaultProducts,
  categories: defaultCategories,
  brands: [
    'ZARA', 'MANGO', 'SANDRO', 'MASSIMO DUTTI', 'COS', 'BA&SH',
    '& OTHER STORIES', 'ARKET', 'JACQUEMUS', 'ROUJE', 'SÉZANE', 'IRO PARIS'
  ],
};

export function useSiteData() {
  const [data, setData] = useState<SiteData>(defaultSiteData);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // 1. Load data from LocalStorage first (instant render)
  const loadLocalData = useCallback(() => {
    try {
      const stored = localStorage.getItem(ADMIN_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setData({
          ...defaultSiteData,
          ...parsed,
          products: parsed.products && parsed.products.length > 0 ? parsed.products : defaultProducts,
          categories: parsed.categories && parsed.categories.length > 0 ? parsed.categories : defaultCategories,
          brands: parsed.brands && parsed.brands.length > 0 ? parsed.brands : defaultSiteData.brands,
        });
      }
    } catch (err) {
      console.error('Error loading local site data:', err);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // 2. Fetch latest data from Supabase if configured
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

      if (sbProducts || sbCategories || sbSettings) {
        setIsSupabaseConnected(true);
        setData((prev) => {
          const merged: SiteData = {
            heroTitle: sbSettings?.heroTitle || prev.heroTitle,
            heroSubtitle: sbSettings?.heroSubtitle || prev.heroSubtitle,
            heroCtaText: sbSettings?.heroCtaText || prev.heroCtaText,
            heroImage: sbSettings?.heroImage || prev.heroImage,
            brands: sbSettings?.brands && sbSettings.brands.length > 0 ? sbSettings.brands : prev.brands,
            categories: sbCategories && sbCategories.length > 0 ? sbCategories : prev.categories,
            products: sbProducts && sbProducts.length > 0 ? sbProducts : prev.products,
          };
          // Keep local storage fresh
          try {
            localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(merged));
          } catch {}
          return merged;
        });
      } else {
        // Connected to Supabase project but tables might be empty
        setIsSupabaseConnected(true);
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
    loadLocalData();
    loadSupabaseData();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === ADMIN_STORAGE_KEY) {
        loadLocalData();
      }
    };

    const handleCustomChange = () => {
      loadLocalData();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('velime-data-updated', handleCustomChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('velime-data-updated', handleCustomChange);
    };
  }, [loadLocalData, loadSupabaseData]);

  // Save to both LocalStorage and Supabase
  const saveData = useCallback((newData: SiteData) => {
    setData(newData);
    try {
      localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(newData));
    } catch (err) {
      console.error('LocalStorage write error:', err);
    }
    window.dispatchEvent(new Event('velime-data-updated'));

    // Asynchronously push to Supabase if configured
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
