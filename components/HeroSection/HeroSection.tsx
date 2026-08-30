'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSiteData } from '@/hooks/useSiteData';
import styles from './HeroSection.module.css';

export default function HeroSection() {
  const { heroTitle, heroSubtitle, heroCtaText, heroImage } = useSiteData();
  const [scrollY, setScrollY] = useState(0);
  const [titleVisible, setTitleVisible] = useState(false);
  const heroRef = useRef<HTMLElement>(null);

  // Parallax on scroll
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setTitleVisible(true), 250);
    return () => clearTimeout(timer);
  }, []);

  const parallaxOffset = scrollY * 0.35;

  return (
    <section className={styles.hero} id="hero" ref={heroRef}>
      {/* Background fabric image with parallax */}
      <div
        className={styles.bgWrapper}
        style={{ transform: `translateY(${parallaxOffset}px)` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroImage || '/images/hero-fabric.jpg'}
          alt=""
          className={styles.bgImage}
          aria-hidden="true"
        />
      </div>

      {/* Subtle overlay for readability */}
      <div className={styles.overlay} />

      {/* Center content — Heralta style */}
      <div className={`${styles.content} ${titleVisible ? styles.contentVisible : ''}`}>
        <p className={styles.preLabel}>Boutique</p>
        <h1 className={styles.brandName}>{heroTitle || 'VELIME'}</h1>
        <div className={styles.divider} />
        <p className={styles.tagline}>{heroSubtitle || "L'élégance au quotidien"}</p>

        <div className={styles.ctaRow}>
          <Link href="/boutique" className={styles.ctaBtn} id="hero-shop-btn">
            {heroCtaText || 'Découvrir'}
          </Link>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className={styles.scrollHint}>
        <span className={styles.scrollLine} />
        <span className={styles.scrollText}>Défiler</span>
      </div>
    </section>
  );
}
