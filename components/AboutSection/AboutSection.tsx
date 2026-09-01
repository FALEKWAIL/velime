'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import styles from './AboutSection.module.css';

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

export default function AboutSection() {
  const img = useReveal();
  const txt = useReveal();

  return (
    <section className={styles.section} id="a-propos">
      {/* Image */}
      <div ref={img.ref} className={`${styles.imageWrapper} reveal-left ${img.visible ? 'visible' : ''}`}>
        <Image
          src="/images/hero.jpg"
          alt="Velime — Une mode inspirée par l'élégance moderne"
          fill
          className={styles.image}
          sizes="100vw"
        />
      </div>

      {/* Text */}
      <div ref={txt.ref} className={`${styles.textBlock} reveal ${txt.visible ? 'visible' : ''}`}>
        <p className={styles.label}>VELIME</p>
        <h2 className={styles.title}>
          Une mode inspirée par<br />
          l&apos;élégance moderne.
        </h2>
        <div className={styles.divider} />
        <p className={styles.body}>
          Velime propose une sélection de vêtements femme tendance,
          élégants et soigneusement choisis pour accompagner chaque femme avec confiance.
        </p>
        <p className={styles.body}>
          Des pièces modernes qui allient style, confort et qualité afin de
          sublimer votre quotidien avec simplicité et raffinement.
        </p>
        <Link href="/boutique" className={styles.cta} id="about-shop-btn">
          Découvrir la collection
        </Link>
      </div>
    </section>
  );
}
