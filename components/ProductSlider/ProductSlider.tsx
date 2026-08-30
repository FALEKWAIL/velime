'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Product } from '@/types';
import ProductCard from '@/components/ProductCard/ProductCard';
import { useSiteData } from '@/hooks/useSiteData';
import styles from './ProductSlider.module.css';

interface Props {
  products?: Product[];
  title?: string;
}

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

export default function ProductSlider({ products: initialProducts, title = 'Meilleure vente' }: Props) {
  const { products: dynamicProducts } = useSiteData();
  const [page, setPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(2);
  const header = useReveal();

  useEffect(() => {
    const update = () => setItemsPerPage(window.innerWidth >= 768 ? 4 : 2);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const allProducts = dynamicProducts && dynamicProducts.length > 0 ? dynamicProducts : initialProducts || [];
  const bestSellers = allProducts.filter((p) => p.isBestSeller);
  const displayProducts = bestSellers.length > 0 ? bestSellers : allProducts.slice(0, 4);

  const totalPages = Math.max(1, Math.ceil(displayProducts.length / itemsPerPage));
  const visible = displayProducts.slice(page * itemsPerPage, page * itemsPerPage + itemsPerPage);

  const changePage = (p: number) => setPage(Math.max(0, Math.min(totalPages - 1, p)));

  return (
    <section className={styles.section} id="meilleure-vente">
      {/* Controls */}
      <div ref={header.ref} className={`${styles.controls} reveal ${header.visible ? 'visible' : ''}`}>
        <button className={styles.chevronBtn} aria-label="Vers le bas"><ChevronDown /></button>
        <div className={styles.prevNext}>
          <button id="slider-prev" className={styles.navBtn} onClick={() => changePage(page - 1)} disabled={page === 0}><ChevronLeft /></button>
          <span className={styles.navLabel}>Prev</span>
          <span className={styles.navLabel}>Next</span>
          <button id="slider-next" className={styles.navBtn} onClick={() => changePage(page + 1)} disabled={page >= totalPages - 1}><ChevronRight /></button>
        </div>
        <span className={styles.counter}>
          {String(Math.min((page + 1) * itemsPerPage, displayProducts.length)).padStart(2, '0')} / {String(displayProducts.length).padStart(2, '0')}
        </span>
      </div>

      {/* Header */}
      <div className={styles.header}>
        <h2 className={`${styles.title} reveal ${header.visible ? 'visible' : ''}`} style={{ transitionDelay: '0.1s' }}>{title}</h2>
        <Link href="/boutique" className={`${styles.seeAll} reveal ${header.visible ? 'visible' : ''}`} style={{ transitionDelay: '0.2s' }} id="slider-see-all">
          TOUT VOIR
        </Link>
      </div>

      {/* Grid */}
      <div className={styles.grid}>
        {visible.map((product, i) => (
          <div key={`${product.id}-${page}`} className={`reveal-scale visible`} style={{ transitionDelay: `${i * 0.08}s` }}>
            <ProductCard product={product} index={i} />
          </div>
        ))}
      </div>

      {/* Dots */}
      <div className={styles.dots}>
        {Array.from({ length: totalPages }).map((_, i) => (
          <button key={i} className={`${styles.dot} ${i === page ? styles.dotActive : ''}`} onClick={() => changePage(i)} aria-label={`Page ${i + 1}`} id={`slider-dot-${i}`} />
        ))}
      </div>
    </section>
  );
}

function ChevronDown() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function ChevronLeft() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function ChevronRight() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
