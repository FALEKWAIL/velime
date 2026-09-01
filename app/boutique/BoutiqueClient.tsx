'use client';
import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSiteData } from '@/hooks/useSiteData';
import ProductCard from '@/components/ProductCard/ProductCard';
import styles from './BoutiqueClient.module.css';

export default function BoutiqueClient() {
  const { products: dynamicProducts, categories: dynamicCategories } = useSiteData();
  const searchParams = useSearchParams();
  const initialCat = searchParams.get('cat') || 'Toutes';
  const [activeCategory, setActiveCategory] = useState(initialCat);

  // Combine 'Toutes' with dynamic category names
  const categoryNames = useMemo(() => {
    const names = dynamicCategories?.map((c) => c.name) || ['Robes', 'Chemises', 'Ensembles', 'Combinaisons', 'Manteaux'];
    return ['Toutes', ...names];
  }, [dynamicCategories]);

  const filtered = useMemo(() => {
    if (!dynamicProducts) return [];
    if (activeCategory === 'Toutes') return dynamicProducts;
    return dynamicProducts.filter((p) => p.category === activeCategory);
  }, [activeCategory, dynamicProducts]);

  return (
    <div className={styles.page}>
      <div className={styles.heroBar}>
        <h1 className={styles.pageTitle}>Collection</h1>
        <p className={styles.subtitle}>{filtered.length} article{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      <div className={styles.container}>
        {/* Dynamic Category Filters */}
        <div className={styles.filters} role="group" aria-label="Catégories">
          {categoryNames.map((cat) => (
            <button
              key={cat}
              id={`filter-${cat.toLowerCase().replace(/\s+/g, '-')}`}
              className={`${styles.filterBtn} ${activeCategory === cat ? styles.filterActive : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <p>Aucun article dans cette catégorie pour le moment.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {filtered.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
