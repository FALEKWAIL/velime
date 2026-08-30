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
    <div className={styles.wrapper} id="brands-banner" aria-label="Inspirations & Collections">
      <div className={styles.track}>
        <div className={styles.inner}>
          {[...displayBrands, ...displayBrands, ...displayBrands].map((brand, i) => (
            <span key={`b1-${i}`} className={styles.brand}>
              <span>{brand}</span>
              <span className={styles.dot}>·</span>
            </span>
          ))}
        </div>
        <div className={styles.inner} aria-hidden="true">
          {[...displayBrands, ...displayBrands, ...displayBrands].map((brand, i) => (
            <span key={`b2-${i}`} className={styles.brand}>
              <span>{brand}</span>
              <span className={styles.dot}>·</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
