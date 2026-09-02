'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Product } from '@/types';
import ProductCard from '@/components/ProductCard/ProductCard';
import { useSiteData } from '@/hooks/useSiteData';
import styles from './ProductSlider.module.css';

interface Props {
  products?: Product[];
  title?: string;
}

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.unobserve(el);
        }
      },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

export default function ProductSlider({ products: initialProducts, title = 'Meilleure vente' }: Props) {
  const { products: dynamicProducts } = useSiteData();
  const [activeMobileIndex, setActiveMobileIndex] = useState(0);
  const [page, setPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(4);
  const [isMobile, setIsMobile] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const header = useReveal();

  const allProducts = dynamicProducts ?? [];
  const bestSellers = allProducts.filter((p) => p.isBestSeller);
  const displayProducts = bestSellers.length > 0 ? bestSellers : allProducts.slice(0, 8);

  if (displayProducts.length === 0) return null;

  const totalPages = Math.max(1, Math.ceil(displayProducts.length / itemsPerPage));

  useEffect(() => {
    const checkViewport = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setItemsPerPage(mobile ? 2 : 4);
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  // Update active index as user swipes horizontally on mobile
  const handleScroll = useCallback(() => {
    if (!trackRef.current) return;
    const el = trackRef.current;
    const scrollLeft = el.scrollLeft;
    const item = el.children[0] as HTMLElement;
    if (!item) return;
    const itemWidth = item.offsetWidth + 16; // width + gap
    const idx = Math.round(scrollLeft / itemWidth);
    const clamped = Math.max(0, Math.min(displayProducts.length - 1, idx));
    setActiveMobileIndex(clamped);
  }, [displayProducts.length]);

  const scrollToItem = (index: number) => {
    if (!trackRef.current) return;
    const targetIdx = Math.max(0, Math.min(displayProducts.length - 1, index));
    const el = trackRef.current;
    const item = el.children[targetIdx] as HTMLElement;
    if (item) {
      item.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    setActiveMobileIndex(targetIdx);
  };

  const changeDesktopPage = (p: number) => {
    const newPage = Math.max(0, Math.min(totalPages - 1, p));
    setPage(newPage);
  };

  const visibleDesktopProducts = displayProducts.slice(
    page * itemsPerPage,
    page * itemsPerPage + itemsPerPage
  );

  return (
    <section className={styles.section} id="meilleure-vente">
      {/* Section Title */}
      <div className={styles.header}>
        <h2
          className={`${styles.title} reveal ${header.visible ? 'visible' : ''}`}
          style={{ transitionDelay: '0.1s' }}
        >
          {title}
        </h2>
        <Link
          href="/boutique"
          className={`${styles.seeAll} reveal ${header.visible ? 'visible' : ''}`}
          style={{ transitionDelay: '0.2s' }}
          id="slider-see-all"
        >
          TOUT VOIR
        </Link>
      </div>

      {/* Track: Digital Swipe Track for Mobile & Grid for Desktop */}
      <div
        ref={trackRef}
        className={styles.track}
        onScroll={handleScroll}
      >
        {(isMobile ? displayProducts : visibleDesktopProducts).map((product, i) => (
          <div
            key={`${product.id}-${isMobile ? i : page}`}
            className={`${styles.cardWrapper} ${isMobile && i === activeMobileIndex ? styles.activeCard : ''}`}
          >
            <ProductCard product={product} index={i} />
          </div>
        ))}
      </div>

      {/* Mobile Swipe Progress Bar & Dots */}
      <div className={styles.dotsWrapper}>
        <div className={styles.dots}>
          {(isMobile ? displayProducts : Array.from({ length: totalPages })).map((_, i) => (
            <button
              key={i}
              className={`${styles.dot} ${(isMobile ? activeMobileIndex : page) === i ? styles.dotActive : ''}`}
              onClick={() => (isMobile ? scrollToItem(i) : changeDesktopPage(i))}
              aria-label={`Article ${i + 1}`}
              id={`slider-dot-${i}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ChevronLeft() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SwipeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M7 16l-4-4m0 0l4-4m-4 4h18m-4 4l4-4m0 0l-4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
