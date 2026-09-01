'use client';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSiteData } from '@/hooks/useSiteData';
import ProductCard from '@/components/ProductCard/ProductCard';
import styles from './RechercheClient.module.css';

export default function RechercheClient() {
  const { products: dynamicProducts } = useSiteData();
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';

  const results = useMemo(() => {
    if (!q || !dynamicProducts) return [];
    const lower = q.toLowerCase();
    return dynamicProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.description.toLowerCase().includes(lower) ||
        p.category.toLowerCase().includes(lower)
    );
  }, [q, dynamicProducts]);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            {q ? `Résultats pour « ${q} »` : 'Recherche'}
          </h1>
          {q && (
            <p className={styles.count}>
              {results.length} résultat{results.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {!q ? (
          <p className={styles.hint}>Utilisez la barre de recherche pour trouver un article.</p>
        ) : results.length === 0 ? (
          <div className={styles.noResults}>
            <p>Aucun résultat pour « {q} ».</p>
            <a href="/boutique" className="btn-primary" id="search-browse-btn">
              Parcourir la collection
            </a>
          </div>
        ) : (
          <div className={styles.grid}>
            {results.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
