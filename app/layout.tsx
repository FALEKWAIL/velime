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

// STATIC layout — zero ISR, zero serverless invocations.
// All data is fetched client-side by SiteDataProvider (direct Supabase calls
// that bypass Vercel origin entirely). This keeps Fast Origin Transfer at ~0.
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <SiteDataProvider>
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
