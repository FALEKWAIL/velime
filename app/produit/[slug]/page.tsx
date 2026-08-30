'use client';
import { useState, useMemo } from 'react';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { use } from 'react';
import { getProductBySlug, formatPrice, getColorHex, isVariantInStock } from '@/data/products';
import { useSiteData } from '@/hooks/useSiteData';
import { useCart } from '@/context/CartContext';
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

  const [selectedColor, setSelectedColor] = useState(() => {
    if (productColors.length > 0) {
      // Pick first available color if possible
      const firstAvail = productColors.find(c => product.sizes.some(sz => isVariantInStock(product, sz, c)));
      return firstAvail || productColors[0];
    }
    return '';
  });

  const [selectedSize, setSelectedSize] = useState(() => {
    // Pick first available size for the initial color
    const initialColor = productColors.length > 0 ? productColors[0] : undefined;
    const firstAvail = product.sizes.find(sz => isVariantInStock(product, sz, initialColor));
    return firstAvail || '';
  });

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [added, setAdded] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');

  // Extract gallery images
  const galleryImages = product.images && product.images.length > 0 
    ? product.images 
    : [product.image || '/images/p1.jpg'];

  const currentImage = galleryImages[selectedImageIndex] || galleryImages[0];

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

  // Build WhatsApp pre-filled message
  const getWhatsAppMessage = () => {
    let msg = `Bonjour, je souhaite commander l'article : ${product.name} (${formatPrice(product.price)})`;
    if (selectedColor) msg += `\n• Couleur : ${selectedColor}`;
    if (selectedSize) msg += `\n• Taille : ${selectedSize}`;
    if (quantity > 1) msg += `\n• Quantité : ${quantity}`;
    return encodeURIComponent(msg);
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* ============================================================
            IMAGE GALLERY SECTION (MULTI-PHOTOS)
           ============================================================ */}
        <div className={styles.imageSection}>
          {/* Main Large Image */}
          <div className={styles.imageWrapper}>
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
              <span className={styles.badgeCustom}>{product.badge}</span>
            ) : product.isNew ? (
              <span className={styles.badgeNew}>Nouveau</span>
            ) : null}
          </div>

          {/* Thumbnail Gallery Row */}
          {galleryImages.length > 1 && (
            <div className={styles.galleryThumbRow}>
              {galleryImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`${styles.thumbBtn} ${idx === selectedImageIndex ? styles.thumbBtnActive : ''}`}
                  onClick={() => setSelectedImageIndex(idx)}
                  aria-label={`Afficher la photo ${idx + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`Miniature ${idx + 1}`} className={styles.thumbImg} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ============================================================
            DETAILS SECTION
           ============================================================ */}
        <div className={styles.details}>
          <p className={styles.category}>{product.category}</p>
          <h1 className={styles.name}>{product.name}</h1>
          
          <div className={styles.priceRow}>
            <span className={styles.price}>{formatPrice(product.price)}</span>
            {product.originalPrice && (
              <span className={styles.originalPrice}>{formatPrice(product.originalPrice)}</span>
            )}
          </div>

          {/* Stock state indicator banner */}
          {isTotalOut ? (
            <div className={styles.stockAlertTotal}>
              <strong>Article actuellement en rupture totale</strong>
              <p>Cet article n&apos;est plus disponible pour le moment.</p>
            </div>
          ) : isPartialOut ? (
            <div className={styles.stockAlertPartial}>
              <strong>Rupture partielle sur cet article</strong>
              <p>Certaines combinaisons de tailles et couleurs sont épuisées. Choisissez votre option ci-dessous.</p>
            </div>
          ) : null}

          <div className={styles.divider} />

          <p className={styles.description}>{product.description}</p>

          <div className={styles.divider} />

          {/* ============================================================
              COLOR SELECTOR
             ============================================================ */}
          {productColors.length > 0 && (
            <div className={styles.colorSection}>
              <div className={styles.optionHeaderRow}>
                <p className={styles.optionLabel}>1. Choisissez une couleur</p>
                {selectedColor && (
                  <span className={styles.selectedOptionDisplay}>
                    Couleur : <strong>{selectedColor}</strong>
                  </span>
                )}
              </div>

              <div className={styles.colorGrid}>
                {productColors.map((color) => {
                  // A color is globally available if at least 1 size is in stock for this color
                  const isColorAvailableAnySize = product.sizes.some(sz => isVariantInStock(product, sz, color));
                  const isSelected = selectedColor === color;
                  const hexCode = getColorHex(color);

                  return (
                    <button
                      key={color}
                      id={`color-${color.toLowerCase().replace(/\s+/g, '-')}`}
                      type="button"
                      disabled={isTotalOut || (!isColorAvailableAnySize && isPartialOut)}
                      className={`${styles.colorBtn} 
                        ${isSelected ? styles.colorBtnActive : ''} 
                        ${!isColorAvailableAnySize && isPartialOut ? styles.colorBtnDisabled : ''}
                        ${isTotalOut ? styles.colorBtnTotalOut : ''}
                      `}
                      onClick={() => handleColorChange(color)}
                      title={!isColorAvailableAnySize && isPartialOut ? `${color} (Épuisé)` : color}
                    >
                      <span
                        className={styles.colorCircle}
                        style={{ backgroundColor: hexCode }}
                      />
                      <span className={styles.colorNameText}>{color}</span>
                      {!isColorAvailableAnySize && isPartialOut && (
                        <span className={styles.optionEpuiseTag}>Épuisé</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================
              SIZE SELECTOR (DYNAMICALLY FILTERED BY SELECTED COLOR)
             ============================================================ */}
          <div className={styles.sizeSection}>
            <div className={styles.optionHeaderRow}>
              <p className={styles.optionLabel}>2. Choisissez une taille</p>
              {selectedSize && (
                <span className={styles.selectedOptionDisplay}>
                  Taille : <strong>{selectedSize}</strong>
                </span>
              )}
            </div>

            <div className={styles.sizeGrid}>
              {product.sizes.map((size) => {
                // Check if this specific size is in stock for currently selected color
                const isSizeInStockForColor = isVariantInStock(product, size, selectedColor || undefined);
                const isSelected = selectedSize === size;

                return (
                  <button
                    key={size}
                    id={`size-${size}`}
                    type="button"
                    disabled={isTotalOut || (!isSizeInStockForColor && isPartialOut)}
                    className={`${styles.sizeBtn} 
                      ${isSelected ? styles.sizeBtnActive : ''} 
                      ${!isSizeInStockForColor && isPartialOut ? styles.sizeBtnDisabled : ''}
                      ${isTotalOut ? styles.sizeBtnTotalOut : ''}
                    `}
                    onClick={() => {
                      if (isSizeInStockForColor || !isPartialOut) {
                        setSelectedSize(size);
                        setError('');
                      }
                    }}
                  >
                    <span className={styles.sizeNameText}>{size}</span>
                    {!isSizeInStockForColor && isPartialOut && (
                      <span className={styles.optionEpuiseTag}>Épuisé</span>
                    )}
                  </button>
                );
              })}
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

          {/* Quantity */}
          {!isTotalOut && isCurrentSelectionInStock && (
            <div className={styles.qtySection}>
              <p className={styles.optionLabel}>Quantité</p>
              <div className={styles.qtyRow}>
                <button
                  className={styles.qtyBtn}
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  id="qty-decrease"
                  type="button"
                >−</button>
                <span className={styles.qtyVal}>{quantity}</span>
                <button
                  className={styles.qtyBtn}
                  onClick={() => setQuantity(quantity + 1)}
                  id="qty-increase"
                  type="button"
                >+</button>
              </div>
            </div>
          )}

          {/* Add to cart */}
          <button
            id="add-to-cart-btn"
            type="button"
            className={`${styles.addBtn} ${isTotalOut || !isCurrentSelectionInStock ? styles.addBtnDisabled : ''} ${added ? styles.addBtnSuccess : ''}`}
            onClick={handleAddToCart}
            disabled={isTotalOut || !isCurrentSelectionInStock}
          >
            {isTotalOut || !isCurrentSelectionInStock
              ? 'Stock Épuisé pour cette sélection'
              : added
              ? 'Article ajouté au panier !'
              : 'Ajouter au Panier'}
          </button>

          {/* Direct WhatsApp Order */}
          <a
            href={`https://wa.me/213000000000?text=${getWhatsAppMessage()}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.whatsappOrderBtn} ${!isCurrentSelectionInStock ? styles.whatsappBtnDisabled : ''}`}
            id="whatsapp-direct-btn"
          >
            Commander directement par WhatsApp
          </a>

          <div className={styles.features}>
            <div className={styles.feature}>
              <span>Livraison rapide</span> dans les 58 wilayas d&apos;Algérie
            </div>
            <div className={styles.feature}>
              <span>Paiement sécurisé</span> en espèces à la livraison
            </div>
            <div className={styles.feature}>
              <span>Emballage soigné</span> & qualité garantie
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
