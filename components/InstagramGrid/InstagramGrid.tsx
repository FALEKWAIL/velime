'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import styles from './InstagramGrid.module.css';

const photos = [
  { src: '/images/p1.jpg', alt: 'Robe Noire Velime' },
  { src: '/images/p2.jpg', alt: 'Robe Florale Velime' },
  { src: '/images/p3.jpg', alt: 'Chemise Loov Velime' },
  { src: '/images/p4.jpg', alt: 'Ensemble Dalida Velime' },
  { src: '/images/p5.jpg', alt: 'Manteau Mocha Velime' },
  { src: '/images/p6.jpg', alt: 'Ensemble Lin Velime' },
];

function useReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

export default function InstagramGrid() {
  const header = useReveal(0.2);
  const grid = useReveal(0.05);

  return (
    <section className={styles.section} id="instagram-section">
      <div ref={header.ref} className={`${styles.header} reveal ${header.visible ? 'visible' : ''}`}>
        <p className={styles.label}>INSTAGRAM</p>
        <h2 className={styles.title}>Suivez-nous sur Instagram</h2>
        <a
          href="https://instagram.com/velime.co"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.handle}
          id="instagram-link"
        >
          @velime.co
        </a>
      </div>

      <div ref={grid.ref} className={styles.grid}>
        {photos.map((photo, i) => (
          <a
            key={i}
            href="https://instagram.com/velime.co"
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.photoLink} reveal-scale ${grid.visible ? 'visible' : ''}`}
            id={`ig-photo-${i}`}
            style={{ transitionDelay: `${i * 0.08}s` }}
          >
            <div className={styles.photoWrapper}>
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                className={styles.photo}
                sizes="(max-width: 768px) 50vw, 33vw"
              />
              <div className={styles.photoOverlay}>
                <InstagramIcon />
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

function InstagramIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="white" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="1.5" />
      <circle cx="17.5" cy="6.5" r="1" fill="white" />
    </svg>
  );
}
