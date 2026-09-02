'use client';
import { useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSiteData } from '@/hooks/useSiteData';
import styles from './CategoriesSection.module.css';

export default function CategoriesSection() {
  const { categories, products } = useSiteData();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchDeltaX, setTouchDeltaX] = useState(0);

  const autoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const resumeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const list = categories && categories.length > 0 ? categories : [];
  const total = list.length;

  const goToCategory = useCallback((nextIdx: number) => {
    if (total <= 1 || isTransitioning) return;
    const normalized = (nextIdx + total) % total;
    if (normalized === currentIndex) return;

    setPrevIndex(currentIndex);
    setCurrentIndex(normalized);
    setIsTransitioning(true);

    setTimeout(() => {
      setIsTransitioning(false);
      setPrevIndex(null);
    }, 750); // Duration matches CSS cross-fade animation
  }, [currentIndex, total, isTransitioning]);

  const handleNext = useCallback(() => {
    goToCategory(currentIndex + 1);
  }, [goToCategory, currentIndex]);

  const handlePrev = useCallback(() => {
    goToCategory(currentIndex - 1);
  }, [goToCategory, currentIndex]);

  // Auto-slide every 4 seconds
  useEffect(() => {
    if (isPaused || total <= 1) return;

    autoTimerRef.current = setInterval(() => {
      goToCategory(currentIndex + 1);
    }, 4000);

    return () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    };
  }, [isPaused, total, currentIndex, goToCategory]);

  // Touch Swipe Handlers for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    setTouchStartX(e.touches[0].clientX);
    setTouchDeltaX(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const currentX = e.touches[0].clientX;
    setTouchDeltaX(currentX - touchStartX);
  };

  const handleTouchEnd = () => {
    if (touchStartX !== null) {
      if (touchDeltaX < -45) {
        // Swiped left -> Next
        handleNext();
      } else if (touchDeltaX > 45) {
        // Swiped right -> Prev
        handlePrev();
      }
    }
    setTouchStartX(null);
    setTouchDeltaX(0);

    // Resume auto-play after 4s
    resumeTimerRef.current = setTimeout(() => {
      setIsPaused(false);
    }, 4000);
  };

  if (!list || list.length === 0) return null;

  const activeCat = list[currentIndex] || list[0];
  if (!activeCat || !activeCat.name) return null;

  const prevCat = prevIndex !== null && list[prevIndex] ? list[prevIndex] : null;

  const countProducts = (catName: string) => {
    return products ? products.filter((p) => p.category === catName).length : 0;
  };

  return (
    <section
      className={styles.section}
      id="categories-section"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className={styles.container}>
        {/* Title: Découvrir Par Catégories */}
        <div className={styles.header}>
          <h2 className={styles.title}>Découvrir Par Catégories</h2>
        </div>

        {/* Morphing Arch Dome Card Container */}
        <div
          className={styles.cardContainer}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Main Arch Frame */}
          <div className={styles.archFrame}>
            {/* Outgoing previous category layer (fading / scaling out) */}
            {prevCat && (
              <div className={`${styles.layer} ${styles.layerOutgoing}`} aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={prevCat.image || `/images/p${(prevIndex! % 7) + 1}.jpg`}
                  alt={prevCat.name}
                  className={styles.categoryImg}
                />
                <div className={styles.overlay} />
                <div className={styles.overlayContent}>
                  <h3 className={styles.catName}>{prevCat.name}</h3>
                  <span className={styles.discoverBtn}>
                    DÉCOUVRIR <span className={styles.arrowIcon}>→</span>
                  </span>
                </div>
              </div>
            )}

            {/* Incoming / Active category layer (fading / scaling in) */}
            <div
              key={`active-cat-${activeCat.id}`}
              className={`${styles.layer} ${styles.layerActive}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeCat.image || `/images/p${(currentIndex % 7) + 1}.jpg`}
                alt={activeCat.name}
                className={styles.categoryImg}
              />
              <div className={styles.overlay} />

              {/* Bottom-left Content with Title & Glass Discover CTA */}
              <Link
                href={`/boutique?cat=${encodeURIComponent(activeCat.name)}`}
                className={styles.overlayLink}
                id={`cat-card-btn-${activeCat.slug}`}
              >
                <div className={styles.overlayContent}>
                  <div className={styles.titleWrapper}>
                    <h3 className={styles.catName}>{activeCat.name}</h3>
                    <span className={styles.catCount}>
                      {countProducts(activeCat.name)} articles
                    </span>
                  </div>

                  <span className={styles.discoverBtn}>
                    DÉCOUVRIR <span className={styles.arrowIcon}>→</span>
                  </span>
                </div>
              </Link>
            </div>

            {/* Subtle Floating Prev/Next Navigation Arrows */}
            <button
              type="button"
              className={`${styles.navArrow} ${styles.navArrowLeft}`}
              onClick={(e) => { e.preventDefault(); handlePrev(); }}
              aria-label="Catégorie précédente"
              id="cat-prev-btn"
            >
              ‹
            </button>
            <button
              type="button"
              className={`${styles.navArrow} ${styles.navArrowRight}`}
              onClick={(e) => { e.preventDefault(); handleNext(); }}
              aria-label="Catégorie suivante"
              id="cat-next-btn"
            >
              ›
            </button>
          </div>

          {/* Digital Dash / Pill Pagination Indicators */}
          <div className={styles.paginationRow}>
            <div className={styles.dashesTrack} role="tablist" aria-label="Catégories carrousel">
              {list.map((cat, i) => (
                <button
                  key={`cat-dash-${cat.id || i}`}
                  type="button"
                  className={`${styles.dash} ${i === currentIndex ? styles.dashActive : ''}`}
                  onClick={() => goToCategory(i)}
                  aria-label={`Voir la catégorie ${cat.name}`}
                  id={`cat-dash-${i}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
