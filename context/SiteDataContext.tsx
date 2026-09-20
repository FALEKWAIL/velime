'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product, Category } from '@/types';
import {
  isSupabaseConfigured,
  fetchProductsFromSupabase,
  fetchCategoriesFromSupabase,
  fetchSiteSettingsFromSupabase,
  syncAllToSupabase,
  updateProductStockInSupabase,
  saveProductToSupabase,
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

export interface SiteDataContextType extends SiteData {
  isLoaded: boolean;
  isSupabaseConnected: boolean;
  isSupabaseConfigured: boolean;
  isSyncing: boolean;
  setData: React.Dispatch<React.SetStateAction<SiteData>>;
  saveData: (newData: SiteData) => void;
  updateStock: (
    productId: string,
    stockStatus: Product['stockStatus'],
    inStock: boolean,
    badge?: string,
    stockMatrix?: any[],
    availableSizes?: string[],
    availableColors?: string[]
  ) => Promise<boolean>;
  saveSingleProduct: (product: Product) => Promise<boolean>;
  triggerSupabaseSync: () => Promise<{ success: boolean; message?: string }>;
  reloadSupabase: () => Promise<void>;
}

const SiteDataContext = createContext<SiteDataContextType | undefined>(undefined);

export function SiteDataProvider({
  children,
  initialData,
}: {
  children: React.ReactNode;
  initialData?: Partial<SiteData>;
}) {
  const [data, setData] = useState<SiteData>(() => ({
    ...defaultSiteData,
    ...initialData,
    products: initialData?.products && Array.isArray(initialData.products) ? initialData.products : [],
    categories: initialData?.categories && Array.isArray(initialData.categories) ? initialData.categories : [],
  }));

  const [isLoaded, setIsLoaded] = useState<boolean>(() => {
    return Boolean(
      (initialData?.products && initialData.products.length > 0) ||
      (initialData?.categories && initialData.categories.length > 0)
    );
  });

  const [isSupabaseConnected, setIsSupabaseConnected] = useState(isSupabaseConfigured());
  const [isSyncing, setIsSyncing] = useState(false);

  // CRITICAL USER DIRECTIVE:
  // "je veux loption de local storage only in mon panier"
  // Completely clear and purge any stale cached site/product data from the user's phone localStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(ADMIN_STORAGE_KEY);
        localStorage.removeItem(HERO_IMAGE_KEY);
      }
    } catch {}
  }, []);

  // Background refresh from Supabase (keeps client data always fresh)
  const loadSupabaseData = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setIsSupabaseConnected(false);
      setIsLoaded(true);
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

        setData((prev) => {
          const resolvedHeroImg = sbSettings?.heroImage || prev.heroImage || defaultSiteData.heroImage;
          return {
            heroTitle: sbSettings?.heroTitle || prev.heroTitle,
            heroSubtitle: sbSettings?.heroSubtitle || prev.heroSubtitle,
            heroCtaText: sbSettings?.heroCtaText || prev.heroCtaText,
            heroImage: resolvedHeroImg,
            brands: sbSettings?.brands && sbSettings.brands.length > 0 ? sbSettings.brands : prev.brands,
            lookbookPhotos: sbSettings?.lookbookPhotos && sbSettings.lookbookPhotos.length > 0 ? sbSettings.lookbookPhotos : prev.lookbookPhotos,
            categories: Array.isArray(sbCategories) ? sbCategories : prev.categories,
            products: Array.isArray(sbProducts) ? sbProducts : prev.products,
          };
        });
      }
    } catch (err) {
      console.warn('Supabase fetch error:', err);
    } finally {
      setIsSyncing(false);
      setIsLoaded(true);
    }
  }, []);

  // Fetch on mount to ensure freshness
  useEffect(() => {
    loadSupabaseData();
  }, [loadSupabaseData]);

  // BroadcastChannel listener for instant live sync across open tabs
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('velime_sync_channel');
        bc.onmessage = (event) => {
          if (event.data?.type === 'SYNC' && event.data?.payload) {
            setData(event.data.payload);
          }
        };
      }
    } catch {}
    return () => {
      if (bc) bc.close();
    };
  }, []);

  // Direct, fast, single-product stock update (less than 1KB payload, never times out)
  const updateStock = useCallback(
    async (
      productId: string,
      stockStatus: Product['stockStatus'],
      inStock: boolean,
      badge?: string,
      stockMatrix?: any[],
      availableSizes?: string[],
      availableColors?: string[]
    ): Promise<boolean> => {
      // 1. Optimistic instant state update
      setData((prev) => {
        const updatedProducts = prev.products.map((p) => {
          if (p.id !== productId) return p;
          return {
            ...p,
            stockStatus,
            inStock,
            badge: badge !== undefined ? badge : (stockStatus === 'total_out' ? 'Rupture de Stock' : stockStatus === 'partial_out' ? 'Stock Limité' : undefined),
            stockMatrix: stockMatrix !== undefined ? stockMatrix : p.stockMatrix,
            availableSizes: availableSizes !== undefined ? availableSizes : p.availableSizes,
            availableColors: availableColors !== undefined ? availableColors : p.availableColors,
          };
        });

        const updatedData = { ...prev, products: updatedProducts };

        try {
          if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
            const bc = new BroadcastChannel('velime_sync_channel');
            bc.postMessage({ type: 'SYNC', payload: updatedData });
            bc.close();
          }
        } catch {}

        return updatedData;
      });

      // 2. Direct database update
      let ok = true;
      if (isSupabaseConfigured()) {
        ok = await updateProductStockInSupabase(
          productId,
          stockStatus,
          inStock,
          badge,
          stockMatrix,
          availableSizes,
          availableColors
        );
        if (ok) setIsSupabaseConnected(true);
      }

      // 3. Purge Vercel Edge cache so public site shows changes immediately
      try {
        fetch('/api/revalidate', { method: 'POST' }).catch(() => {});
      } catch {}

      return ok;
    },
    []
  );

  // Direct, fast, single-product update (for product edit modal)
  const saveSingleProduct = useCallback(async (product: Product): Promise<boolean> => {
    setData((prev) => {
      const exists = prev.products.some((p) => p.id === product.id);
      const updatedProducts = exists
        ? prev.products.map((p) => (p.id === product.id ? product : p))
        : [product, ...prev.products];
      const updatedData = { ...prev, products: updatedProducts };

      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel('velime_sync_channel');
          bc.postMessage({ type: 'SYNC', payload: updatedData });
          bc.close();
        }
      } catch {}

      return updatedData;
    });

    let ok = true;
    if (isSupabaseConfigured()) {
      ok = await saveProductToSupabase(product);
      if (ok) setIsSupabaseConnected(true);
    }

    try {
      fetch('/api/revalidate', { method: 'POST' }).catch(() => {});
    } catch {}

    return ok;
  }, []);

  // Save changes (from Admin Dashboard): updates state, broadcasts to tabs, pushes directly to Supabase.
  // NO LOCAL STORAGE SAVED FOR PRODUCTS/CATEGORIES! (Only cart uses localStorage)
  const saveData = useCallback((newData: SiteData) => {
    setData(newData);

    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('velime_sync_channel');
        bc.postMessage({ type: 'SYNC', payload: newData });
        bc.close();
      }
    } catch {}

    if (isSupabaseConfigured()) {
      syncAllToSupabase(newData)
        .then((res) => {
          if (res.success) setIsSupabaseConnected(true);
        })
        .catch((err) => {
          console.warn('Background Supabase save error:', err);
        });
    }

    try {
      fetch('/api/revalidate', { method: 'POST' }).catch(() => {});
    } catch {}
  }, []);

  const triggerSupabaseSync = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      return { success: false, message: 'Supabase non configuré.' };
    }
    setIsSyncing(true);
    try {
      const res = await syncAllToSupabase(data);
      if (res.success) setIsSupabaseConnected(true);
      return res;
    } finally {
      setIsSyncing(false);
    }
  }, [data]);

  return (
    <SiteDataContext.Provider
      value={{
        ...data,
        isLoaded,
        isSupabaseConnected: isSupabaseConfigured() && isSupabaseConnected,
        isSupabaseConfigured: isSupabaseConfigured(),
        isSyncing,
        setData,
        saveData,
        updateStock,
        saveSingleProduct,
        triggerSupabaseSync,
        reloadSupabase: loadSupabaseData,
      }}
    >
      {children}
    </SiteDataContext.Provider>
  );
}

export function useSiteData(): SiteDataContextType {
  const ctx = useContext(SiteDataContext);
  if (!ctx) {
    throw new Error('useSiteData must be used within a SiteDataProvider');
  }
  return ctx;
}
