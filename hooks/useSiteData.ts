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
  // Start with empty arrays — real data comes from localStorage or Supabase
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

export function useSiteData() {
  const [data, setData] = useState<SiteData>(defaultSiteData);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // 1. Load data from LocalStorage first (instant render)
  const loadLocalData = useCallback(() => {
    try {
      const stored = localStorage.getItem(ADMIN_STORAGE_KEY);
      const customHeroImg = localStorage.getItem(HERO_IMAGE_KEY);

      if (stored) {
        const parsed = JSON.parse(stored);
        setData({
          ...defaultSiteData,
          ...parsed,
          heroImage: customHeroImg || parsed.heroImage || defaultSiteData.heroImage,
          // Respect stored values directly — even empty arrays mean the admin cleared them
          products: Array.isArray(parsed.products) ? parsed.products : [],
          categories: Array.isArray(parsed.categories) ? parsed.categories : [],
          brands: parsed.brands && parsed.brands.length > 0 ? parsed.brands : defaultSiteData.brands,
          lookbookPhotos: parsed.lookbookPhotos && parsed.lookbookPhotos.length > 0 ? parsed.lookbookPhotos : defaultSiteData.lookbookPhotos,
        });
      } else if (customHeroImg) {
        setData((prev) => ({ ...prev, heroImage: customHeroImg }));
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
          // Never overwrite custom local heroImage with default placeholder
          const isSbHeroCustom = sbSettings?.heroImage && sbSettings.heroImage !== '/images/hero-fabric.jpg';
          const isPrevDefault = !prev.heroImage || prev.heroImage === '/images/hero-fabric.jpg';
          const resolvedHeroImg = (isSbHeroCustom ? sbSettings?.heroImage : (isPrevDefault ? (sbSettings?.heroImage || prev.heroImage) : prev.heroImage)) || defaultSiteData.heroImage;

          const merged: SiteData = {
            heroTitle: sbSettings?.heroTitle || prev.heroTitle,
            heroSubtitle: sbSettings?.heroSubtitle || prev.heroSubtitle,
            heroCtaText: sbSettings?.heroCtaText || prev.heroCtaText,
            heroImage: resolvedHeroImg,
            brands: sbSettings?.brands && sbSettings.brands.length > 0 ? sbSettings.brands : prev.brands,
            lookbookPhotos: sbSettings?.lookbookPhotos && sbSettings.lookbookPhotos.length > 0 ? sbSettings.lookbookPhotos : prev.lookbookPhotos,
            // Respect empty arrays from Supabase — they mean the admin cleared the data
            categories: Array.isArray(sbCategories) ? sbCategories : prev.categories,
            products: Array.isArray(sbProducts) ? sbProducts : prev.products,
          };

          // Keep local storage fresh
          try {
            localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(merged));
            if (resolvedHeroImg) {
              localStorage.setItem(HERO_IMAGE_KEY, resolvedHeroImg);
            }
          } catch {}
          return merged;
        });
      } else {
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
      if (e.key === ADMIN_STORAGE_KEY || e.key === HERO_IMAGE_KEY) {
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
      if (newData.heroImage) {
        localStorage.setItem(HERO_IMAGE_KEY, newData.heroImage);
      }
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
