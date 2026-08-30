'use client';
import { useSiteData } from '@/hooks/useSiteData';
import styles from './BrandsBanner.module.css';

export default function BrandsBanner() {
  const { brands } = useSiteData();
  const displayBrands = brands && brands.length > 0 ? brands : [
    'ZARA', 'MANGO', 'SANDRO', 'MASSIMO DUTTI', 'COS', 'BA&SH',
    '& OTHER STORIES', 'ARKET', 'JACQUEMUS', 'ROUJE', 'SÉZANE', 'IRO PARIS'
  ];

  return (
    <div className={styles.wrapper} id="brands-banner">
      <div className={styles.label}>Nos inspirations & collections</div>
      <div className={styles.track}>
        {/* Forward scroll */}
        <div className={styles.row}>
          <div className={styles.inner}>
            {[...displayBrands, ...displayBrands].map((brand, i) => (
              <span key={`fwd-${i}`} className={styles.brand}>
                {brand}
                <span className={styles.dot}>·</span>
              </span>
            ))}
          </div>
        </div>
        {/* Reverse scroll */}
        <div className={styles.row}>
          <div className={`${styles.inner} ${styles.reverse}`}>
            {[...displayBrands, ...displayBrands].map((brand, i) => (
              <span key={`rev-${i}`} className={styles.brandAlt}>
                <span className={styles.dot}>·</span>
                {brand}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
