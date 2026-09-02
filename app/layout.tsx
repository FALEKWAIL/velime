import type { Metadata } from 'next';
import './globals.css';
import '../styles/animations.css';
import { CartProvider } from '@/context/CartContext';
import AnnouncementBar from '@/components/AnnouncementBar/AnnouncementBar';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import WhatsAppFAB from '@/components/WhatsAppFAB/WhatsAppFAB';
import BackToTop from '@/components/BackToTop/BackToTop';
import AdminSwitchBar from '@/components/AdminSwitchBar/AdminSwitchBar';

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
        <CartProvider>
          <AnnouncementBar />
          <Header />
          <main>{children}</main>
          <Footer />
          <WhatsAppFAB />
          <BackToTop />
          <AdminSwitchBar />
        </CartProvider>
      </body>
    </html>
  );
}
