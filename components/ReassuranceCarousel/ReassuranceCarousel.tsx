'use client';
import { useState, useEffect, useRef } from 'react';
import styles from './ReassuranceCarousel.module.css';

interface ReassuranceSlide {
  id: number;
  label: string;
  title: string;
  description: string;
}

const slides: ReassuranceSlide[] = [
  {
    id: 0,
    label: 'VELIME BOUTIQUE',
    title: 'Livraison rapide & sécurisée',
    description: 'Livraison rapide partout en Algérie avec suivi et emballage soigné.',
  },
  {
    id: 1,
    label: 'VELIME BOUTIQUE',
    title: 'Paiement à la livraison',
    description: 'Payez uniquement à la réception de votre commande, en toute confiance.',
  },
  {
    id: 2,
    label: 'VELIME BOUTIQUE',
    title: 'Service client actif',
    description: 'Support rapide via WhatsApp pour répondre à toutes vos questions.',
  },
];

const tickerWords = [
  'NEW COLLECTION',
  'ELEGANCE',
  'FEMININITY',
  'STYLE',
  'QUALITY',
];

export default function ReassuranceCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto rotate slides every 4.5 seconds
  useEffect(() => {
    if (isPaused) return;

    intervalRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused]);

  return (
    <section
      className={styles.wrapper}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-label="Engagements et Services Velime"
    >
      {/* Upper Reassurance Slide Content */}
      <div className={styles.carouselContainer}>
        <div className={styles.slideContent} key={currentSlide}>
          <span className={styles.label}>{slides[currentSlide].label}</span>
          <h2 className={styles.title}>{slides[currentSlide].title}</h2>
          <div className={styles.divider} />
          <p className={styles.description}>{slides[currentSlide].description}</p>
        </div>

        {/* Pagination Dots */}
        <div className={styles.dotsRow} role="tablist" aria-label="Navigation des engagements">
          {slides.map((slide, idx) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={idx === currentSlide}
              aria-label={`Afficher : ${slide.title}`}
              className={`${styles.dot} ${idx === currentSlide ? styles.dotActive : ''}`}
              onClick={() => setCurrentSlide(idx)}
            />
          ))}
        </div>
      </div>

      {/* Bottom Continuous Scrolling Ticker Bar */}
      <div className={styles.tickerBar} aria-hidden="true">
        <div className={styles.tickerTrack}>
          <div className={styles.tickerContent}>
            {[...tickerWords, ...tickerWords, ...tickerWords, ...tickerWords].map((word, i) => (
              <span key={i} className={styles.tickerItem}>
                <span className={styles.tickerBullet}>•</span>
                <span>{word}</span>
              </span>
            ))}
          </div>
          <div className={styles.tickerContent} aria-hidden="true">
            {[...tickerWords, ...tickerWords, ...tickerWords, ...tickerWords].map((word, i) => (
              <span key={i} className={styles.tickerItem}>
                <span className={styles.tickerBullet}>•</span>
                <span>{word}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
