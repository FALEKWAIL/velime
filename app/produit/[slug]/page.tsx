'use client';
import { useState, useMemo } from 'react';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { use } from 'react';
import { getProductBySlug, formatPrice, getColorHex, isVariantInStock } from '@/data/products';
import { useSiteData } from '@/hooks/useSiteData';
import { useCart } from '@/context/CartContext';
import DirectOrderForm from '@/components/DirectOrderForm/DirectOrderForm';
import styles from './product.module.css';

interface Props {
  params: Promise<{ slug: string }>;
}

export default function ProductPage({ params }: Props) {
  const { slug } = use(params);
  const { products: dynamicProducts } = useSiteData();
  
  // Find product in dynamic products or fallback to static catalog
  const product = 
    dynamicProducts?.find((p) => p.slug === slug) || 
    getProductBySlug(slug);

  if (!product) notFound();

  const { addItem } = useCart();
  const productColors = useMemo(() => product.colors && product.colors.length > 0 ? product.colors : [], [product.colors]);

  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [added, setAdded] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Extract gallery images
  const galleryImages = product.images && product.images.length > 0 
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

    // If current selected size is not in stock for new color, auto-switch to first available size
    if (selectedSize && !isVariantInStock(product, selectedSize, newColor)) {
      const firstAvailSize = product.sizes.find(sz => isVariantInStock(product, sz, newColor));
      setSelectedSize(firstAvailSize || '');
    }
  };

  const handleAddToCart = () => {
    if (isTotalOut) return;

    // Check color selection if product has colors
    if (productColors.length > 0 && !selectedColor) {
      setError('Veuillez sélectionner une couleur.');
      return;
    }

    // Check size selection
    if (!selectedSize) {
      setError('Veuillez sélectionner une taille.');
      return;
    }

    // Check precise matrix availability
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

    // Check color selection if product has colors
    if (productColors.length > 0 && !selectedColor) {
      setError('Veuillez sélectionner une couleur.');
      return;
    }

    // Check size selection
    if (!selectedSize) {
      setError('Veuillez sélectionner une taille.');
      return;
    }

    // Check availability
    if (!isVariantInStock(product, selectedSize, selectedColor || undefined)) {
      setError(`Cette taille (${selectedSize}) est actuellement épuisée en ${selectedColor || 'cette variante'}.`);
      return;
    }

    setError('');
    setIsOrderFormOpen(true);

    setTimeout(() => {
      const el = document.getElementById('direct-order-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 120);
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
              DROPDOWN SELECTORS (LIKE SCREENSHOT)
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
              QUANTITY + AJOUTER AU PANIER ROW (EXACTLY LIKE SCREENSHOT)
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
              COMMANDER MAINTENANT (FULL WIDTH BUTTON)
             ============================================================ */}
          <button
            id="order-now-trigger-btn"
            type="button"
            className={styles.orderNowBtn}
            onClick={handleOrderNowClick}
            disabled={isTotalOut}
          >
            {isOrderFormOpen ? 'Informations de Commande Directe ▾' : 'Commander maintenant'}
          </button>

          {/* ============================================================
              DIRECT ORDER FORM SECTION (EXPANDED WHEN CLICKED)
             ============================================================ */}
          {isOrderFormOpen && (
            <div className={styles.orderFormExpandedWrapper} id="direct-order-section">
              <DirectOrderForm
                product={product}
                selectedSize={selectedSize}
                selectedColor={selectedColor}
                quantity={quantity}
                disabled={isTotalOut || !isCurrentSelectionInStock}
              />
            </div>
          )}

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
