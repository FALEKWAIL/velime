import type { Metadata } from 'next';
import './globals.css';
import '../styles/animations.css';
import { CartProvider } from '@/context/CartContext';
import { SiteDataProvider } from '@/context/SiteDataContext';
import AnnouncementBar from '@/components/AnnouncementBar/AnnouncementBar';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import WhatsAppFAB from '@/components/WhatsAppFAB/WhatsAppFAB';
import BackToTop from '@/components/BackToTop/BackToTop';
import AdminSwitchBar from '@/components/AdminSwitchBar/AdminSwitchBar';
import {
  fetchProductsFromSupabase,
  fetchCategoriesFromSupabase,
  fetchSiteSettingsFromSupabase,
} from '@/lib/supabase';
import { SiteData } from '@/context/SiteDataContext';

// STATIC layout — with force-static, Next.js executes this ONCE at build time.
// The products and categories are baked directly into the static HTML files,
// meaning visitors see the entire catalog in 0 milliseconds without waiting for
// client-side network calls! With NO revalidate timer, Fast Origin Transfer remains ~0.
export const dynamic = 'force-static';

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

    if (products && products.length > 0) {
      initialData = {
        products,
        categories: categories || [],
        heroTitle: settings?.heroTitle,
        heroSubtitle: settings?.heroSubtitle,
        heroCtaText: settings?.heroCtaText,
        heroImage: settings?.heroImage,
        brands: settings?.brands,
        lookbookPhotos: settings?.lookbookPhotos,
      };
    }
  } catch (err) {
    console.warn('Build-time static catalog prefetch note:', err);
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
