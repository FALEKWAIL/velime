'use client';
import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSiteData } from '@/hooks/useSiteData';
import styles from './CategoriesSection.module.css';

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

export default function CategoriesSection() {
  const { categories, products } = useSiteData();
  const header = useReveal();

  if (!categories || categories.length === 0) return null;

  return (
    <section className={styles.section} id="categories-section">
      <div className={styles.container}>
        <div ref={header.ref} className={`${styles.header} reveal ${header.visible ? 'visible' : ''}`}>
          <p className={styles.preTitle}>COLLECTIONS</p>
          <h2 className={styles.title}>Nos Catégories</h2>
          <div className={styles.line} />
        </div>

        <div className={styles.grid}>
          {categories.map((cat, idx) => {
            const count = products ? products.filter((p) => p.category === cat.name).length : 0;
            const catImage = cat.image || `/images/p${(idx % 7) + 1}.jpg`;

            return (
              <Link
                key={cat.id}
                href={`/boutique?cat=${encodeURIComponent(cat.name)}`}
                className={`${styles.card} reveal-scale ${header.visible ? 'visible' : ''}`}
                style={{ transitionDelay: `${idx * 0.1}s` }}
                id={`home-category-${cat.slug}`}
              >
                <div className={styles.imageWrapper}>
                  <Image
                    src={catImage}
                    alt={cat.name}
                    fill
                    className={styles.image}
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  />
                  <div className={styles.overlay} />
                  
                  <div className={styles.content}>
                    <h3 className={styles.catName}>{cat.name}</h3>
                    <span className={styles.catCount}>
                      {count} article{count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
