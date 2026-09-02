'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import styles from './AboutSection.module.css';

function useReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold, rootMargin: '0px 0px -60px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

export default function AboutSection() {
  const images = useReveal(0.08);
  const text = useReveal(0.1);

  return (
    <section className={styles.section} id="a-propos" aria-label="À propos de Velime">
      <div className={styles.inner}>

        {/* ── LEFT: Staggered dual-image column ── */}
        <div
          ref={images.ref}
          className={`${styles.imageCol} ${images.visible ? styles.imageColVisible : ''}`}
        >
          {/* Floating label accent */}
          <span className={styles.floatAccent}>NEW ARRIVALS</span>

          <div className={styles.imgTop}>
            <Image
              src="/images/about-1.jpg"
              alt="Cardigan navy — Velime"
              fill
              className={styles.img}
              sizes="(max-width: 768px) 100vw, 45vw"
              priority
            />
            <div className={styles.imgBadge}>01</div>
          </div>

          <div className={styles.imgBottom}>
            <Image
              src="/images/about-2.jpg"
              alt="Cardigan tressé — Velime"
              fill
              className={styles.img}
              sizes="(max-width: 768px) 100vw, 35vw"
            />
            <div className={styles.imgBadge}>02</div>
          </div>
        </div>

        {/* ── RIGHT: Editorial text ── */}
        <div
          ref={text.ref}
          className={`${styles.textCol} ${text.visible ? styles.textColVisible : ''}`}
        >
          <p className={styles.eyebrow}>VELIME — Collection</p>

          <h2 className={styles.heading}>
            Une mode<br />
            <em>pensée pour vous.</em>
          </h2>

          <div className={styles.divider} />

          <p className={styles.body}>
            Velime propose des pièces soigneusement sélectionnées pour allier
            style, confort et caractère — des cardigans doux aux coupes
            raffinées qui accompagnent chaque moment de votre quotidien.
          </p>

          <p className={styles.body}>
            Chaque article est choisi avec attention pour sublimer votre
            silhouette avec une élégance naturelle et moderne.
          </p>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statNum}>100%</span>
              <span className={styles.statLabel}>Qualité sélectionnée</span>
            </div>
            <div className={styles.statSep} />
            <div className={styles.stat}>
              <span className={styles.statNum}>58</span>
              <span className={styles.statLabel}>Wilayas livrées</span>
            </div>
          </div>

          <Link href="/boutique" className={styles.cta} id="about-shop-btn">
            <span>Explorer la boutique</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>

      </div>
    </section>
  );
}
