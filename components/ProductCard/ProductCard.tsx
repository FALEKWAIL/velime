import Link from 'next/link';
import { Product } from '@/types';
import { formatPrice } from '@/data/products';
import styles from './ProductCard.module.css';

interface Props {
  product: Product;
  index?: number;
}

export default function ProductCard({ product, index = 0 }: Props) {
  const stockStatus = product.stockStatus || (product.inStock ? 'in_stock' : 'total_out');
  const isTotalOut = stockStatus === 'total_out' || !product.inStock;
  const isPartialOut = stockStatus === 'partial_out';

  return (
    <Link
      href={`/produit/${product.slug || product.id}`}
      prefetch={false}
      className={`${styles.card} reveal-scale`}
      id={`product-card-${product.id}`}
      style={{ transitionDelay: `${index * 0.08}s` }}
    >
      {/* Arch image */}
      <div className={styles.imageWrapper}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image}
          alt={product.name}
          className={styles.image}
          loading="lazy"
        />

        {/* Stock & Custom Badges */}
        {isTotalOut ? (
          <span className={styles.badgeTotalOut}>Rupture de Stock</span>
        ) : isPartialOut ? (
          <span className={styles.badgePartialOut}>Stock Limité</span>
        ) : product.badge ? (
          <span className={styles.badgeCustom}>{product.badge}</span>
        ) : product.isNew ? (
          <span className={styles.badgeNew}>Nouveau</span>
        ) : null}

        <div className={styles.overlay}>
          <span className={styles.overlayText}>Voir le produit</span>
        </div>
      </div>

      <div className={styles.info}>
        <h3 className={styles.name}>{product.name}</h3>
        <div className={styles.priceRow}>
          <span className={styles.price}>{formatPrice(product.price)}</span>
          {product.originalPrice && (
            <span className={styles.originalPrice}>{formatPrice(product.originalPrice)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
