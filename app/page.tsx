import HeroSection from '@/components/HeroSection/HeroSection';
import CategoriesSection from '@/components/CategoriesSection/CategoriesSection';
import ProductSlider from '@/components/ProductSlider/ProductSlider';
import BrandsBanner from '@/components/BrandsBanner/BrandsBanner';
import ReassuranceCarousel from '@/components/ReassuranceCarousel/ReassuranceCarousel';
import AboutSection from '@/components/AboutSection/AboutSection';
import InstagramGrid from '@/components/InstagramGrid/InstagramGrid';
import { getBestSellers } from '@/data/products';

export default function HomePage() {
  const bestSellers = getBestSellers();

  return (
    <>
      <HeroSection />
      <CategoriesSection />
      <ProductSlider products={bestSellers} title="Meilleure vente" />
      <BrandsBanner />
      <ReassuranceCarousel />
      <AboutSection />
      <InstagramGrid />
    </>
  );
}
