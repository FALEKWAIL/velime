'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/types';
import { useSiteData } from '@/hooks/useSiteData';
import { formatPrice, products as fallbackProducts } from '@/data/products';
import styles from './NewArrivalsSlider.module.css';

interface Props {
  products?: Product[];
}

export default function NewArrivalsSlider({ products: initialProducts }: Props) {
  const { products: dynamicProducts } = useSiteData();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get the 6 last products only (newest arrivals)
  const allProducts = dynamicProducts && dynamicProducts.length > 0 ? dynamicProducts : initialProducts || fallbackProducts;
  const newProducts = allProducts.slice(0, 6);
  const totalItems = newProducts.length;

  // Scroll to specific product index
  const scrollToIndex = useCallback((index: number) => {
    if (!trackRef.current || totalItems === 0) return;
    const targetIdx = (index + totalItems) % totalItems;
    const track = trackRef.current;
    const item = track.children[targetIdx] as HTMLElement;
    if (item) {
      const trackWidth = track.clientWidth;
      const itemWidth = item.offsetWidth;
      // Center item or align to view
      const targetScroll = item.offsetLeft - (trackWidth - itemWidth) / 2;
      track.scrollTo({
        left: Math.max(0, targetScroll),
        behavior: 'smooth',
      });
    }
    setActiveIndex(targetIdx);
  }, [totalItems]);

  // Sync active indicator on user manual touch/scroll
  const handleScroll = useCallback(() => {
    if (!trackRef.current || totalItems === 0) return;
    const track = trackRef.current;
    const scrollLeft = track.scrollLeft;
    const firstItem = track.children[0] as HTMLElement;
    if (!firstItem) return;
    const itemWidth = firstItem.offsetWidth + 16; // width + gap
    const calculatedIndex = Math.round(scrollLeft / itemWidth);
    const clamped = Math.max(0, Math.min(totalItems - 1, calculatedIndex));
    setActiveIndex(clamped);
  }, [totalItems]);

  // Auto-play interval: smooth, gentle pace (~3.8s)
  useEffect(() => {
    if (isPaused || totalItems <= 1) return;

    autoPlayTimerRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % totalItems;
        scrollToIndex(next);
        return next;
      });
    }, 3800);

    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [isPaused, totalItems, scrollToIndex]);

  return (
    <section
      className={styles.section}
      id="nouveautes"
      aria-label="Nouveautés"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => {
        // Resume auto-play after 4 seconds of inactivity
        setTimeout(() => setIsPaused(false), 4000);
      }}
    >
      <div className={styles.container}>
        {/* Header: Nouveautés & TOUT VOIR */}
        <div className={styles.headerRow}>
          <h2 className={styles.title}>Nouveautés</h2>
          <Link href="/boutique" className={styles.seeAllLink} id="nouveautes-see-all">
            <span>TOUT VOIR</span>
            <span className={styles.seeAllUnderline} />
          </Link>
        </div>

        {/* Arched Product Carousel Track */}
        <div
          ref={trackRef}
          className={styles.track}
          onScroll={handleScroll}
        >
          {newProducts.map((product, idx) => (
            <div
              key={`new-prod-${product.id}-${idx}`}
              className={`${styles.cardWrapper} ${idx === activeIndex ? styles.cardActive : ''}`}
            >
              <Link href={`/produit/${product.slug}`} className={styles.cardLink}>
                {/* Arch Dome Photo Container */}
                <div className={styles.archWrapper}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.image || (product.images && product.images[0]) || '/images/p1.jpg'}
                    alt={product.name}
                    className={styles.archImage}
                    loading={idx < 2 ? 'eager' : 'lazy'}
                  />
                  {product.badge && (
                    <span className={styles.badge}>{product.badge}</span>
                  )}
                </div>

                {/* Info: Centered Name & Dinar Price */}
                <div className={styles.info}>
                  <h3 className={styles.productName}>{product.name}</h3>
                  <p className={styles.productPrice}>{formatPrice(product.price)}</p>
                </div>
              </Link>
            </div>
          ))}
        </div>

        {/* Digital Pill / Dash Pagination Indicators */}
        <div className={styles.paginationRow}>
          <div className={styles.dashesContainer} role="tablist" aria-label="Pagination nouveautés">
            {newProducts.map((_, i) => (
              <button
                key={`dash-${i}`}
                type="button"
                className={`${styles.dash} ${i === activeIndex ? styles.dashActive : ''}`}
                onClick={() => scrollToIndex(i)}
                aria-label={`Voir l'article ${i + 1} sur ${totalItems}`}
                id={`nouveautes-dash-${i}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
