'use client';
import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { formatPrice, isVariantInStock } from '@/data/products';
import { useSiteData } from '@/hooks/useSiteData';
import { useCart } from '@/context/CartContext';
import { fetchProductBySlugFromSupabase } from '@/lib/supabase';
import { Product } from '@/types';
import styles from './product.module.css';

interface Props {
  params: Promise<{ slug: string }>;
}

export default function ProductPage({ params }: Props) {
  const { slug } = use(params);
  const { products: dynamicProducts, isLoaded } = useSiteData();
  const [supabaseProduct, setSupabaseProduct] = useState<Product | null>(null);
  const [isFetchingSupabase, setIsFetchingSupabase] = useState(false);
  const [hasAttemptedSupabase, setHasAttemptedSupabase] = useState(false);

  // 1. Check if product exists in dynamicProducts (memory/cache)
  const productFromList = useMemo(() => {
    if (!dynamicProducts || dynamicProducts.length === 0) return null;
    const raw = (slug || '').trim();
    const decoded = decodeURIComponent(raw).trim().toLowerCase();
    const lowerRaw = raw.toLowerCase();

    return (
      dynamicProducts.find((p) => {
        const pSlug = (p.slug || '').toLowerCase().trim();
        const pId = (p.id || '').toLowerCase().trim();
        const pName = (p.name || '').toLowerCase().trim();
        return (
          pSlug === decoded ||
          pSlug === lowerRaw ||
          pId === decoded ||
          pId === lowerRaw ||
          pName === decoded ||
          pName === lowerRaw
        );
      }) || null
    );
  }, [dynamicProducts, slug]);

  // 2. If not found in dynamicProducts, directly fetch from Supabase
  useEffect(() => {
    if (productFromList) return;

    let isMounted = true;
    setIsFetchingSupabase(true);

    fetchProductBySlugFromSupabase(slug)
      .then((p) => {
        if (isMounted) {
          setSupabaseProduct(p);
          setHasAttemptedSupabase(true);
          setIsFetchingSupabase(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setHasAttemptedSupabase(true);
          setIsFetchingSupabase(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [slug, productFromList]);

  const resolvedProduct = productFromList || supabaseProduct;

  // Show loading skeleton while data is still loading
  if (!resolvedProduct) {
    if (!isLoaded || isFetchingSupabase || !hasAttemptedSupabase) {
      return (
        <div style={{ minHeight: '65vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            border: '2.5px solid #e8e2dc',
            borderTopColor: '#2b221a',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{
            fontFamily: 'var(--font-sans)',
            color: '#8c7864',
            fontSize: '0.85rem',
            letterSpacing: '0.08em',
          }}>
            Chargement de l&apos;article…
          </p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      );
    }

    // Truly not found
    return (
      <div style={{ minHeight: '65vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', padding: '2rem', textAlign: 'center' }}>
        <span style={{ fontSize: '2.5rem' }}>👗</span>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', color: '#2b221a', fontWeight: 500, margin: 0 }}>
          Article introuvable
        </h2>
        <p style={{ color: '#8c7864', fontSize: '0.9rem', maxWidth: '380px', lineHeight: 1.5, margin: 0 }}>
          Cet article n&apos;est plus disponible ou son lien a été modifié.
        </p>
        <Link
          href="/boutique"
          style={{
            marginTop: '0.75rem',
            padding: '0.75rem 1.75rem',
            backgroundColor: '#2b221a',
            color: '#ffffff',
            borderRadius: '4px',
            textDecoration: 'none',
            fontSize: '0.8rem',
            letterSpacing: '0.1em',
            fontWeight: 600,
            textTransform: 'uppercase',
          }}
        >
          Découvrir la collection →
        </Link>
      </div>
    );
  }

  // Safe unconditional hook execution in sub-component
  return <ProductDetailContent product={resolvedProduct} />;
}

function ProductDetailContent({ product }: { product: Product }) {
  const router = useRouter();
  const { addItem } = useCart();

  const productColors = useMemo(
    () => (product.colors && product.colors.length > 0 ? product.colors : []),
    [product.colors]
  );

  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [added, setAdded] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Extract gallery images
  const galleryImages =
    product.images && product.images.length > 0
      ? product.images
      : [product.image || '/images/p1.jpg'];

  const currentImage = galleryImages[selectedImageIndex] || galleryImages[0];

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40 && galleryImages.length > 1) {
      if (diff > 0) {
        setSelectedImageIndex((prev) => (prev + 1) % galleryImages.length);
      } else {
        setSelectedImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
      }
    }
    setTouchStartX(null);
  };

  // Stock status evaluation
  const stockStatus = product.stockStatus || (product.inStock ? 'in_stock' : 'total_out');
  const isTotalOut = stockStatus === 'total_out' || !product.inStock;
  const isPartialOut = stockStatus === 'partial_out';

  // Check whether current selected combination (size + color) is in stock
  const isCurrentSelectionInStock = useMemo(() => {
    if (isTotalOut) return false;
    if (!selectedSize) return true;
    return isVariantInStock(product, selectedSize, selectedColor || undefined);
  }, [product, selectedSize, selectedColor, isTotalOut]);

  // Handle color change: if selected size is out of stock in new color, pick first available size or clear
  const handleColorChange = (newColor: string) => {
    setSelectedColor(newColor);
    setError('');

    if (selectedSize && !isVariantInStock(product, selectedSize, newColor)) {
      const firstAvailSize = product.sizes.find((sz) => isVariantInStock(product, sz, newColor));
      setSelectedSize(firstAvailSize || '');
    }
  };

  const handleAddToCart = () => {
    if (isTotalOut) return;

    if (productColors.length > 0 && !selectedColor) {
      setError('Veuillez sélectionner une couleur.');
      return;
    }

    if (!selectedSize) {
      setError('Veuillez sélectionner une taille.');
      return;
    }

    if (!isVariantInStock(product, selectedSize, selectedColor || undefined)) {
      setError(`La combinaison (${selectedColor ? selectedColor + ' - ' : ''}Taille ${selectedSize}) est actuellement épuisée.`);
      return;
    }

    addItem(product, selectedSize, selectedColor || undefined, quantity);
    setAdded(true);
    setError('');
    setTimeout(() => setAdded(false), 2500);
  };

  const handleOrderNowClick = () => {
    if (isTotalOut) return;
    const params = new URLSearchParams();
    params.set('slug', product.slug || product.id);
    if (selectedSize) params.set('size', selectedSize);
    if (selectedColor) params.set('color', selectedColor);
    if (quantity > 1) params.set('qty', quantity.toString());
    router.push(`/commander?${params.toString()}`);
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* ============================================================
            IMAGE GALLERY SECTION (MULTI-PHOTOS)
           ============================================================ */}
        <div className={styles.imageSection}>
          {/* Main Large Image */}
          <div
            className={styles.imageWrapper}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <Image
              src={currentImage}
              alt={product.name}
              fill
              priority
              className={styles.image}
              sizes="(max-width: 768px) 100vw, 50vw"
            />

            {/* Badges */}
            {isTotalOut ? (
              <span className={styles.badgeTotalOut}>Rupture de Stock</span>
            ) : isPartialOut ? (
              <span className={styles.badgePartialOut}>Stock Limité</span>
            ) : product.badge ? (
              <span className={styles.badge}>{product.badge}</span>
            ) : null}

            {/* Gallery Arrows */}
            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length)}
                  className={`${styles.imageArrow} ${styles.imageArrowPrev}`}
                  aria-label="Photo précédente"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedImageIndex((prev) => (prev + 1) % galleryImages.length)}
                  className={`${styles.imageArrow} ${styles.imageArrowNext}`}
                  aria-label="Photo suivante"
                >
                  ›
                </button>
              </>
            )}

            {/* Dots Indicator for Mobile */}
            {galleryImages.length > 1 && (
              <div className={styles.dotsRow}>
                {galleryImages.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`${styles.dot} ${idx === selectedImageIndex ? styles.dotActive : ''}`}
                    aria-label={`Voir photo ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Thumbnails Row */}
          {galleryImages.length > 1 && (
            <div className={styles.thumbRow}>
              {galleryImages.map((imgSrc, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`${styles.thumbBtn} ${idx === selectedImageIndex ? styles.thumbBtnActive : ''}`}
                >
                  <Image
                    src={imgSrc}
                    alt={`${product.name} vue ${idx + 1}`}
                    width={70}
                    height={85}
                    className={styles.thumbImg}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ============================================================
            PRODUCT DETAILS & FORM
           ============================================================ */}
        <div className={styles.details}>
          <div className={styles.category}>{product.category}</div>
          <h1 className={styles.title}>{product.name}</h1>

          <div className={styles.priceRow}>
            <span className={styles.price}>{formatPrice(product.price)}</span>
            {product.originalPrice && (
              <span className={styles.originalPrice}>{formatPrice(product.originalPrice)}</span>
            )}
          </div>

          {/* Stock Notification Banner */}
          {isTotalOut ? (
            <div className={styles.stockAlertTotalOut}>
              <strong>Article Épuisé</strong>
              <p>Cet article est actuellement en rupture de stock totale.</p>
            </div>
          ) : isPartialOut ? (
            <div className={styles.stockAlertPartialOut}>
              <strong>Rupture partielle sur cet article</strong>
              <p>Certaines tailles ou couleurs sont épuisées. Choisissez vos options ci-dessous.</p>
            </div>
          ) : null}

          <div className={styles.divider} />

          <p className={styles.description}>{product.description}</p>

          <div className={styles.divider} />

          {/* ============================================================
              DROPDOWN SELECTORS
             ============================================================ */}
          {productColors.length > 0 && (
            <div className={styles.selectOptionGroup}>
              <label htmlFor="color-select" className={styles.selectOptionLabel}>
                Couleur
              </label>
              <div className={styles.selectWrapper}>
                <select
                  id="color-select"
                  className={styles.dropdownSelect}
                  value={selectedColor}
                  onChange={(e) => handleColorChange(e.target.value)}
                  disabled={isTotalOut}
                >
                  <option value="">Choisir une option</option>
                  {productColors.map((color) => {
                    const isColorAvail = product.sizes.some((sz) => isVariantInStock(product, sz, color));
                    return (
                      <option key={color} value={color} disabled={!isColorAvail && isPartialOut}>
                        {color} {!isColorAvail && isPartialOut ? '(Épuisé)' : ''}
                      </option>
                    );
                  })}
                </select>
                <span className={styles.selectChevron}>▾</span>
              </div>
            </div>
          )}

          {/* Size Dropdown */}
          <div className={styles.selectOptionGroup}>
            <label htmlFor="size-select" className={styles.selectOptionLabel}>
              Taille
            </label>
            <div className={styles.selectWrapper}>
              <select
                id="size-select"
                className={styles.dropdownSelect}
                value={selectedSize}
                onChange={(e) => {
                  setSelectedSize(e.target.value);
                  setError('');
                }}
                disabled={isTotalOut}
              >
                <option value="">Choisir une option</option>
                {product.sizes.map((size) => {
                  const isSizeInStock = isVariantInStock(product, size, selectedColor || undefined);
                  return (
                    <option key={size} value={size} disabled={!isSizeInStock && isPartialOut}>
                      {size} {!isSizeInStock && isPartialOut ? '(Épuisé)' : ''}
                    </option>
                  );
                })}
              </select>
              <span className={styles.selectChevron}>▾</span>
            </div>
          </div>

          {/* Live Variant Status Banner */}
          {selectedSize && selectedColor && !isTotalOut && (
            <div className={isCurrentSelectionInStock ? styles.variantAvailableBox : styles.variantOutOfStockBox}>
              <span className={styles.variantStatusDot} />
              <span>
                {isCurrentSelectionInStock
                  ? `Disponible en ${selectedColor} (Taille ${selectedSize})`
                  : `Cette taille (${selectedSize}) est épuisée en ${selectedColor}`}
              </span>
            </div>
          )}

          {error && <p className={styles.error}>{error}</p>}

          {/* ============================================================
              QUANTITY + AJOUTER AU PANIER ROW
             ============================================================ */}
          <div className={styles.cartActionRow}>
            <div className={styles.qtyBox}>
              <button
                type="button"
                className={styles.qtyBtnSquare}
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                aria-label="Diminuer quantité"
              >−</button>
              <span className={styles.qtyNumberText}>{quantity}</span>
              <button
                type="button"
                className={styles.qtyBtnSquare}
                onClick={() => setQuantity(quantity + 1)}
                aria-label="Augmenter quantité"
              >+</button>
            </div>

            <button
              id="add-to-cart-btn"
              type="button"
              className={`${styles.addToCartBtn} ${added ? styles.addToCartSuccess : ''}`}
              onClick={handleAddToCart}
              disabled={isTotalOut || (!isCurrentSelectionInStock && selectedSize !== '')}
            >
              {added ? '✓ Article ajouté !' : 'Ajouter au panier'}
            </button>
          </div>

          {/* ============================================================
              COMMANDER MAINTENANT (PRIMARY FULL WIDTH BUTTON)
             ============================================================ */}
          <button
            id="order-now-trigger-btn"
            type="button"
            className={styles.orderNowBtn}
            onClick={handleOrderNowClick}
            disabled={isTotalOut}
          >
            <span>Commander maintenant</span>
          </button>

          <div className={styles.features}>
            <div className={styles.feature}>
              <span>Livraison disponible</span> dans les 58 wilayas d&apos;Algérie (Domicile &amp; Bureau)
            </div>
            <div className={styles.feature}>
              <span>Paiement sécurisé</span> en espèces à la réception de votre colis
            </div>
            <div className={styles.feature}>
              <span>Service client</span> &amp; vérification avant expédition
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
