'use client';
import { useSiteData } from '@/hooks/useSiteData';
import styles from './LookbookMarquee.module.css';

export default function LookbookMarquee() {
  const { lookbookPhotos } = useSiteData();

  const photos = lookbookPhotos && lookbookPhotos.length > 0 
    ? lookbookPhotos 
    : [
        '/images/p1.jpg',
        '/images/p2.jpg',
        '/images/p3.jpg',
        '/images/p4.jpg',
        '/images/p5.jpg',
        '/images/p6.jpg',
        '/images/p7.jpg',
      ];

  return (
    <section className={styles.section} id="lookbook-section" aria-label="Galerie Lookbook">
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.topLabel}>LOOKBOOK &amp; EN SITUATION</span>
        <h2 className={styles.title}>Nos Créations Portées</h2>
        <div className={styles.goldDivider} />
        <p className={styles.subtitle}>Découvrez l&apos;élégance de nos pièces au quotidien</p>
      </div>

      {/* Infinite Horizontal Animated Photo Track */}
      <div className={styles.marqueeContainer}>
        <div className={styles.track}>
          <div className={styles.trackInner}>
            {[...photos, ...photos, ...photos].map((imgSrc, idx) => (
              <div key={`look1-${idx}`} className={styles.photoCard}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imgSrc}
                  alt={`Lookbook photo ${idx + 1}`}
                  className={styles.photoImg}
                  loading="lazy"
                />
                <div className={styles.cardOverlay}>
                  <span className={styles.overlayBrand}>VELIME</span>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.trackInner} aria-hidden="true">
            {[...photos, ...photos, ...photos].map((imgSrc, idx) => (
              <div key={`look2-${idx}`} className={styles.photoCard}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imgSrc}
                  alt={`Lookbook photo ${idx + 1}`}
                  className={styles.photoImg}
                  loading="lazy"
                />
                <div className={styles.cardOverlay}>
                  <span className={styles.overlayBrand}>VELIME</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Subtle Hint */}
      <div className={styles.bottomHint}>
        <span>✨ Défilement continu • Survolez pour figer</span>
      </div>
    </section>
  );
}
