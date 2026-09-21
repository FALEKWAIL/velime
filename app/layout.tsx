import type { Metadata } from 'next';
import './globals.css';
import '../styles/animations.css';
import { CartProvider } from '@/context/CartContext';
import { SiteDataProvider, SiteData } from '@/context/SiteDataContext';
import {
  fetchProductsFromSupabase,
  fetchCategoriesFromSupabase,
  fetchSiteSettingsFromSupabase,
} from '@/lib/supabase';
import AnnouncementBar from '@/components/AnnouncementBar/AnnouncementBar';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import WhatsAppFAB from '@/components/WhatsAppFAB/WhatsAppFAB';
import BackToTop from '@/components/BackToTop/BackToTop';
import AdminSwitchBar from '@/components/AdminSwitchBar/AdminSwitchBar';

// Incremental Static Regeneration (ISR)
// Caches pages on Vercel's Edge CDN for 10 minutes (600s).
// This serves visitors directly from the Edge cache with 0 Serverless Function invocations.
export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Velime — Mode Femme Élégante',
  description:
    'Velime propose une sélection de vêtements femme tendance, élégants et soigneusement choisis pour accompagner chaque femme avec confiance.',
  keywords: ['mode femme', 'algérie', 'robes élégantes', 'vêtements', 'velime'],
  openGraph: {
    title: 'Velime',
    description: 'Une mode pensée pour accompagner chaque femme avec élégance et confiance.',
    type: 'website',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let initialData: Partial<SiteData> = {};
  try {
    const [products, categories, settings] = await Promise.all([
      fetchProductsFromSupabase(),
      fetchCategoriesFromSupabase(),
      fetchSiteSettingsFromSupabase(),
    ]);

    initialData = {
      ...(products && products.length > 0 ? { products } : {}),
      ...(categories && categories.length > 0 ? { categories } : {}),
      heroTitle: settings?.heroTitle,
      heroSubtitle: settings?.heroSubtitle,
      heroCtaText: settings?.heroCtaText,
      heroImage: settings?.heroImage,
      brands: settings?.brands,
      lookbookPhotos: settings?.lookbookPhotos,
    };
  } catch (err) {
    console.warn('SSR Supabase fetch error in RootLayout:', err);
  }

  return (
    <html lang="fr">
      <body>
        <SiteDataProvider initialData={initialData}>
          <CartProvider>
            <AnnouncementBar />
            <Header />
            <main>{children}</main>
            <Footer />
            <WhatsAppFAB />
            <BackToTop />
            <AdminSwitchBar />
          </CartProvider>
        </SiteDataProvider>
      </body>
    </html>
  );
}
