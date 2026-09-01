'use client';
import { Suspense, useState, useEffect, useId, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getProductBySlug, formatPrice, getColorHex, isVariantInStock } from '@/data/products';
import { useSiteData } from '@/hooks/useSiteData';
import { useCart } from '@/context/CartContext';
import { useOrders } from '@/hooks/useOrders';
import { WILAYAS_ALGERIA, getWilayaByCode } from '@/lib/wilayas';
import { DeliveryType, Order, Product } from '@/types';
import styles from './commander.module.css';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const formId = useId();

  const { products: dynamicProducts } = useSiteData();
  const { items: cartItems, totalPrice: cartTotalPrice, clearCart } = useCart();
  const { placeOrder } = useOrders();

  // URL query params for single product express checkout
  const slugParam = searchParams.get('slug');
  const sizeParam = searchParams.get('size');
  const colorParam = searchParams.get('color');
  const qtyParam = searchParams.get('qty');

  // Find product if direct buy
  const singleProduct: Product | undefined = useMemo(() => {
    if (!slugParam) return undefined;
    return dynamicProducts?.find((p) => p.slug === slugParam) || getProductBySlug(slugParam);
  }, [slugParam, dynamicProducts]);

  const isCartMode = !singleProduct && cartItems.length > 0;

  // Single product choices
  const productColors = singleProduct?.colors && singleProduct.colors.length > 0 ? singleProduct.colors : [];
  
  const [selectedColor, setSelectedColor] = useState(colorParam || (productColors.length > 0 ? productColors[0] : ''));
  const [selectedSize, setSelectedSize] = useState(sizeParam || (singleProduct?.sizes ? singleProduct.sizes[0] : ''));
  const [quantity, setQuantity] = useState(parseInt(qtyParam || '1', 10) || 1);

  // Customer Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedWilayaCode, setSelectedWilayaCode] = useState('16'); // Default Alger
  const [commune, setCommune] = useState('');
  const [addressNotes, setAddressNotes] = useState('');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('domicile');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  const currentWilaya = getWilayaByCode(selectedWilayaCode) || WILAYAS_ALGERIA[15];
  const deliveryFee = deliveryType === 'domicile' ? currentWilaya.homePrice : currentWilaya.deskPrice;

  // Calculate Subtotal and Total
  const subtotal = useMemo(() => {
    if (singleProduct) {
      return singleProduct.price * quantity;
    }
    if (isCartMode) {
      return cartTotalPrice;
    }
    return 0;
  }, [singleProduct, quantity, isCartMode, cartTotalPrice]);

  const totalAmount = subtotal + deliveryFee;

  // Sync communes when wilaya changes
  const handleWilayaChange = (code: string) => {
    setSelectedWilayaCode(code);
    const wil = getWilayaByCode(code);
    if (wil?.communes && wil.communes.length > 0) {
      setCommune(wil.communes[0]);
    } else {
      setCommune('');
    }
  };

  const handleColorChange = (newColor: string) => {
    setSelectedColor(newColor);
    setErrorMsg('');
    if (singleProduct && selectedSize && !isVariantInStock(singleProduct, selectedSize, newColor)) {
      const avail = singleProduct.sizes.find((s) => isVariantInStock(singleProduct, s, newColor));
      setSelectedSize(avail || '');
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!singleProduct && cartItems.length === 0) {
      setErrorMsg('Votre commande ne contient aucun article.');
      return;
    }

    if (singleProduct) {
      if (productColors.length > 0 && !selectedColor) {
        setErrorMsg('Veuillez sélectionner une couleur pour votre article.');
        return;
      }
      if (!selectedSize) {
        setErrorMsg('Veuillez sélectionner une taille pour votre article.');
        return;
      }
      if (!isVariantInStock(singleProduct, selectedSize, selectedColor || undefined)) {
        setErrorMsg(`La taille (${selectedSize}) est actuellement épuisée en ${selectedColor || 'cette variante'}.`);
        return;
      }
    }

    if (!customerName.trim()) {
      setErrorMsg('Veuillez entrer votre nom et prénom.');
      return;
    }

    const cleanPhone = customerPhone.trim().replace(/\s+/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      setErrorMsg('Veuillez entrer un numéro de téléphone valide (ex: 0550 12 34 56).');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      let orderItems: any[] = [];

      if (singleProduct) {
        orderItems = [
          {
            productId: singleProduct.id,
            productName: singleProduct.name,
            productImage: singleProduct.image || (singleProduct.images && singleProduct.images[0]) || '/images/p1.jpg',
            price: singleProduct.price,
            quantity,
            size: selectedSize,
            color: selectedColor || undefined,
          },
        ];
      } else {
        orderItems = cartItems.map((it) => ({
          productId: it.product.id,
          productName: it.product.name,
          productImage: it.product.image || (it.product.images && it.product.images[0]) || '/images/p1.jpg',
          price: it.product.price,
          quantity: it.quantity,
          size: it.size,
          color: it.color || undefined,
        }));
      }

      const order = await placeOrder({
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
        wilayaCode: currentWilaya.code,
        wilayaName: currentWilaya.name,
        commune: commune.trim() || currentWilaya.name,
        deliveryType,
        items: orderItems,
        itemsSubtotal: subtotal,
        deliveryCost: deliveryFee,
        totalAmount,
        notes: addressNotes.trim(),
      });

      if (isCartMode) {
        clearCart();
      }

      setCreatedOrder(order);
    } catch (err: any) {
      setErrorMsg(err.message || 'Une erreur est survenue lors de la commande.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS CONFIRMATION SCREEN
  if (createdOrder) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.successModalCard} id="order-success-view">
            <div className={styles.successCelebrationIcon}>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <span className={styles.successOrderTag}>Commande #{createdOrder.orderNumber}</span>
            <h1 className={styles.successMainTitle}>Merci {createdOrder.customerName} !</h1>
            <p className={styles.successMainDesc}>
              Votre commande a bien été validée. Notre équipe du service client vous contactera par téléphone au{' '}
              <strong>{createdOrder.customerPhone}</strong> pour confirmer l&apos;expédition de votre colis.
            </p>

            <div className={styles.successRecapBox}>
              <div className={styles.recapHeaderRow}>
                <span>Détail de votre commande</span>
                <span className={styles.recapStatusBadge}>En attente d&apos;expédition</span>
              </div>

              <div className={styles.successItemsList}>
                {createdOrder.items.map((item, idx) => (
                  <div key={idx} className={styles.successItemRow}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.productImage} alt={item.productName} className={styles.successItemThumb} />
                    <div className={styles.successItemDetails}>
                      <strong className={styles.successItemName}>{item.productName}</strong>
                      <span className={styles.successItemMeta}>
                        Taille : <strong>{item.size}</strong> {item.color ? `• Couleur : ${item.color}` : ''} • Qté : <strong>{item.quantity}</strong>
                      </span>
                    </div>
                    <span className={styles.successItemPrice}>{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className={styles.recapInfoGrid}>
                <div className={styles.recapInfoItem}>
                  <span className={styles.recapInfoLabel}>Destination</span>
                  <strong className={styles.recapInfoValue}>
                    {createdOrder.wilayaName} ({createdOrder.wilayaCode}) — {createdOrder.commune}
                  </strong>
                </div>
                <div className={styles.recapInfoItem}>
                  <span className={styles.recapInfoLabel}>Mode de livraison</span>
                  <strong className={styles.recapInfoValue}>
                    {createdOrder.deliveryType === 'domicile' ? '🏠 À Domicile' : '🏢 Bureau Stop-Desk'}
                  </strong>
                </div>
              </div>

              <div className={styles.successTotalsSection}>
                <div className={styles.successTotalRow}>
                  <span>Sous-total articles :</span>
                  <span>{formatPrice(createdOrder.itemsSubtotal)}</span>
                </div>
                <div className={styles.successTotalRow}>
                  <span>Frais de livraison :</span>
                  <span>{formatPrice(createdOrder.deliveryCost)}</span>
                </div>
                <div className={styles.successGrandTotalRow}>
                  <span>Total à payer à la livraison :</span>
                  <strong className={styles.successGrandTotalValue}>{formatPrice(createdOrder.totalAmount)}</strong>
                </div>
              </div>
            </div>

            <div className={styles.successActionButtons}>
              <Link href="/boutique" className={styles.btnReturnShop}>
                Continuer mes achats sur Velime
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // IF NO PRODUCT AND EMPTY CART
  if (!singleProduct && cartItems.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.emptyStateCard}>
            <div className={styles.emptyIconCircle}>🛍️</div>
            <h2 className={styles.emptyTitle}>Aucun article sélectionné</h2>
            <p className={styles.emptyDesc}>Choisissez un article dans notre collection pour finaliser votre commande.</p>
            <Link href="/boutique" className={styles.btnReturnShop}>
              Découvrir la Collection
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Top Breadcrumb & Trust Header */}
      <div className={styles.checkoutTopBar}>
        <div className={styles.container}>
          <div className={styles.topBarContent}>
            <Link href={singleProduct ? `/produit/${singleProduct.slug}` : '/boutique'} className={styles.backLink}>
              ← Retour au produit
            </Link>
            <div className={styles.secureBadge}>
              <span className={styles.lockIcon}>🔒</span>
              <span>Paiement Sécurisé en Espèces à la Livraison</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1 className={styles.mainTitle}>Finaliser votre Commande</h1>
          <p className={styles.subTitle}>
            Remplissez vos coordonnées ci-dessous. Paiement en espèces lors de la réception de votre colis.
          </p>
        </div>

        <form onSubmit={handleSubmitOrder} className={styles.checkoutLayout}>
          {/* ============================================================
              LEFT COLUMN: CUSTOMER & DELIVERY FORM
             ============================================================ */}
          <div className={styles.formColumn}>
            {/* STEP 1: ARTICLE CUSTOMIZATION (IF SINGLE PRODUCT DIRECT CHECKOUT) */}
            {singleProduct && (
              <div className={styles.modernCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.stepBadge}>1</div>
                  <div>
                    <h2 className={styles.cardTitle}>Détails de l&apos;Article</h2>
                    <p className={styles.cardSubtitle}>Personnalisez votre taille et couleur souhaitée</p>
                  </div>
                </div>

                <div className={styles.productReviewBox}>
                  <div className={styles.productReviewThumbWrapper}>
                    <Image
                      src={singleProduct.image || (singleProduct.images && singleProduct.images[0]) || '/images/p1.jpg'}
                      alt={singleProduct.name}
                      fill
                      className={styles.productReviewImg}
                      sizes="90px"
                    />
                  </div>

                  <div className={styles.productReviewMeta}>
                    <span className={styles.productCategoryTag}>{singleProduct.category}</span>
                    <h3 className={styles.productReviewName}>{singleProduct.name}</h3>
                    <span className={styles.productReviewPrice}>{formatPrice(singleProduct.price)}</span>
                  </div>
                </div>

                <div className={styles.optionsGridModern}>
                  {/* Color Selector */}
                  {productColors.length > 0 && (
                    <div className={styles.formGroup}>
                      <label className={styles.modernLabel}>Couleur sélectionnée</label>
                      <div className={styles.swatchesRow}>
                        {productColors.map((col) => {
                          const isSelected = selectedColor === col;
                          const isAvail = singleProduct.sizes.some((s) => isVariantInStock(singleProduct, s, col));
                          return (
                            <button
                              key={col}
                              type="button"
                              disabled={!isAvail}
                              className={`${styles.colorChipBtn} ${isSelected ? styles.colorChipActive : ''} ${!isAvail ? styles.chipDisabled : ''}`}
                              onClick={() => handleColorChange(col)}
                            >
                              <span
                                className={styles.colorDotInside}
                                style={{ backgroundColor: getColorHex(col) }}
                              />
                              <span>{col}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Size Selector */}
                  <div className={styles.formGroup}>
                    <label className={styles.modernLabel}>Taille sélectionnée</label>
                    <div className={styles.sizesRow}>
                      {singleProduct.sizes.map((sz) => {
                        const inStock = isVariantInStock(singleProduct, sz, selectedColor || undefined);
                        const isSelected = selectedSize === sz;
                        return (
                          <button
                            key={sz}
                            type="button"
                            disabled={!inStock}
                            className={`${styles.sizeChipBtn} ${isSelected ? styles.sizeChipActive : ''} ${!inStock ? styles.chipDisabled : ''}`}
                            onClick={() => setSelectedSize(sz)}
                          >
                            <span>{sz}</span>
                            {!inStock && <span className={styles.chipOutTag}>Épuisé</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quantity */}
                  <div className={styles.formGroup}>
                    <label className={styles.modernLabel}>Quantité</label>
                    <div className={styles.modernStepper}>
                      <button
                        type="button"
                        className={styles.stepperBtn}
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      >−</button>
                      <span className={styles.stepperVal}>{quantity}</span>
                      <button
                        type="button"
                        className={styles.stepperBtn}
                        onClick={() => setQuantity(quantity + 1)}
                      >+</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: COORDONNÉES CLIENT */}
            <div className={styles.modernCard}>
              <div className={styles.cardHeader}>
                <div className={styles.stepBadge}>{singleProduct ? '2' : '1'}</div>
                <div>
                  <h2 className={styles.cardTitle}>Vos Coordonnées</h2>
                  <p className={styles.cardSubtitle}>Informations nécessaires pour la livraison et la confirmation</p>
                </div>
              </div>

              <div className={styles.formFieldsGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor={`${formId}-name`} className={styles.modernLabel}>
                    Nom &amp; Prénom <span className={styles.req}>*</span>
                  </label>
                  <input
                    id={`${formId}-name`}
                    type="text"
                    required
                    disabled={isSubmitting}
                    value={customerName}
                    onChange={(e) => { setCustomerName(e.target.value); setErrorMsg(''); }}
                    placeholder="Ex: Sarah Benali"
                    className={styles.modernInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor={`${formId}-phone`} className={styles.modernLabel}>
                    Numéro de Téléphone <span className={styles.req}>*</span>
                  </label>
                  <div className={styles.phoneInputWrapper}>
                    <span className={styles.phoneFlag}>🇩🇿 +213</span>
                    <input
                      id={`${formId}-phone`}
                      type="tel"
                      required
                      disabled={isSubmitting}
                      value={customerPhone}
                      onChange={(e) => { setCustomerPhone(e.target.value); setErrorMsg(''); }}
                      placeholder="05 50 12 34 56"
                      className={styles.modernInputPhone}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 3: ADRESSE & DESTINATION */}
            <div className={styles.modernCard}>
              <div className={styles.cardHeader}>
                <div className={styles.stepBadge}>{singleProduct ? '3' : '2'}</div>
                <div>
                  <h2 className={styles.cardTitle}>Adresse de Livraison</h2>
                  <p className={styles.cardSubtitle}>Sélectionnez votre wilaya et commune en Algérie</p>
                </div>
              </div>

              <div className={styles.formFieldsGrid}>
                <div className={styles.twoColRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor={`${formId}-wilaya`} className={styles.modernLabel}>
                      Wilaya ({WILAYAS_ALGERIA.length} Wilayas) <span className={styles.req}>*</span>
                    </label>
                    <select
                      id={`${formId}-wilaya`}
                      value={selectedWilayaCode}
                      disabled={isSubmitting}
                      onChange={(e) => handleWilayaChange(e.target.value)}
                      className={styles.modernSelect}
                    >
                      {WILAYAS_ALGERIA.map((w) => (
                        <option key={w.code} value={w.code}>
                          {w.code} - {w.name} ({w.arName})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor={`${formId}-commune`} className={styles.modernLabel}>
                      Commune / Ville <span className={styles.req}>*</span>
                    </label>
                    {currentWilaya.communes && currentWilaya.communes.length > 0 ? (
                      <select
                        id={`${formId}-commune`}
                        value={commune || currentWilaya.communes[0]}
                        disabled={isSubmitting}
                        onChange={(e) => setCommune(e.target.value)}
                        className={styles.modernSelect}
                      >
                        {currentWilaya.communes.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={`${formId}-commune`}
                        type="text"
                        required
                        disabled={isSubmitting}
                        value={commune}
                        onChange={(e) => setCommune(e.target.value)}
                        placeholder="Ex: Centre ville"
                        className={styles.modernInput}
                      />
                    )}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor={`${formId}-notes`} className={styles.modernLabel}>
                    Précisions d&apos;adresse / Remarques (Optionnel)
                  </label>
                  <input
                    id={`${formId}-notes`}
                    type="text"
                    disabled={isSubmitting}
                    value={addressNotes}
                    onChange={(e) => setAddressNotes(e.target.value)}
                    placeholder="Ex: Près de la grande poste, 2ème étage..."
                    className={styles.modernInput}
                  />
                </div>
              </div>
            </div>

            {/* STEP 4: MODE DE LIVRAISON */}
            <div className={styles.modernCard}>
              <div className={styles.cardHeader}>
                <div className={styles.stepBadge}>{singleProduct ? '4' : '3'}</div>
                <div>
                  <h2 className={styles.cardTitle}>Mode de Livraison</h2>
                  <p className={styles.cardSubtitle}>Choisissez entre livraison à domicile ou retrait en bureau</p>
                </div>
              </div>

              <div className={styles.deliveryCardsGrid}>
                <label
                  className={`${styles.deliveryOptionCard} ${deliveryType === 'domicile' ? styles.deliveryOptionActive : ''}`}
                >
                  <input
                    type="radio"
                    name={`delivMode-${formId}`}
                    value="domicile"
                    checked={deliveryType === 'domicile'}
                    onChange={() => setDeliveryType('domicile')}
                    className={styles.hiddenRadio}
                  />
                  <div className={styles.delivHeader}>
                    <span className={styles.delivIconBadge}>🏠</span>
                    <div>
                      <strong className={styles.delivOptionName}>Livraison à Domicile</strong>
                      <span className={styles.delivOptionSub}>Remise en main propre</span>
                    </div>
                  </div>
                  <div className={styles.delivFeeAmount}>{formatPrice(currentWilaya.homePrice)}</div>
                </label>

                <label
                  className={`${styles.deliveryOptionCard} ${deliveryType === 'bureau' ? styles.deliveryOptionActive : ''}`}
                >
                  <input
                    type="radio"
                    name={`delivMode-${formId}`}
                    value="bureau"
                    checked={deliveryType === 'bureau'}
                    onChange={() => setDeliveryType('bureau')}
                    className={styles.hiddenRadio}
                  />
                  <div className={styles.delivHeader}>
                    <span className={styles.delivIconBadge}>🏢</span>
                    <div>
                      <strong className={styles.delivOptionName}>Bureau / Stop-Desk</strong>
                      <span className={styles.delivOptionSub}>Récupération en agence</span>
                    </div>
                  </div>
                  <div className={styles.delivFeeAmount}>{formatPrice(currentWilaya.deskPrice)}</div>
                </label>
              </div>
            </div>
          </div>

          {/* ============================================================
              RIGHT COLUMN: ORDER SUMMARY & CONFIRMATION (STICKY)
             ============================================================ */}
          <div className={styles.summaryColumn}>
            <div className={styles.stickySummaryCard}>
              <h2 className={styles.summaryCardTitle}>Récapitulatif</h2>
              <div className={styles.summaryDivider} />

              {/* Items List */}
              <div className={styles.summaryItemsList}>
                {singleProduct ? (
                  <div className={styles.summaryItemRow}>
                    <div className={styles.summaryItemThumbWrap}>
                      <Image
                        src={singleProduct.image || (singleProduct.images && singleProduct.images[0]) || '/images/p1.jpg'}
                        alt={singleProduct.name}
                        fill
                        className={styles.summaryItemThumbImg}
                        sizes="60px"
                      />
                    </div>
                    <div className={styles.summaryItemInfo}>
                      <strong className={styles.summaryItemName}>{singleProduct.name}</strong>
                      <span className={styles.summaryItemMeta}>
                        {selectedSize ? `Taille ${selectedSize}` : ''} {selectedColor ? `• ${selectedColor}` : ''} × {quantity}
                      </span>
                    </div>
                    <span className={styles.summaryItemPrice}>{formatPrice(subtotal)}</span>
                  </div>
                ) : (
                  cartItems.map((it) => (
                    <div key={`${it.product.id}-${it.size}-${it.color}`} className={styles.summaryItemRow}>
                      <div className={styles.summaryItemThumbWrap}>
                        <Image
                          src={it.product.image || (it.product.images && it.product.images[0]) || '/images/p1.jpg'}
                          alt={it.product.name}
                          fill
                          className={styles.summaryItemThumbImg}
                          sizes="60px"
                        />
                      </div>
                      <div className={styles.summaryItemInfo}>
                        <strong className={styles.summaryItemName}>{it.product.name}</strong>
                        <span className={styles.summaryItemMeta}>
                          Taille {it.size} {it.color ? `• ${it.color}` : ''} × {it.quantity}
                        </span>
                      </div>
                      <span className={styles.summaryItemPrice}>{formatPrice(it.product.price * it.quantity)}</span>
                    </div>
                  ))
                )}
              </div>

              <div className={styles.summaryDivider} />

              {/* Pricing breakdown */}
              <div className={styles.pricingRows}>
                <div className={styles.pricingRow}>
                  <span>Sous-total articles</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className={styles.pricingRow}>
                  <span>Livraison ({currentWilaya.name})</span>
                  <span>{formatPrice(deliveryFee)}</span>
                </div>
                <div className={styles.summaryDivider} />
                <div className={styles.grandTotalRow}>
                  <span>Total à payer à la livraison</span>
                  <strong className={styles.grandTotalNumber}>{formatPrice(totalAmount)}</strong>
                </div>
              </div>

              {errorMsg && <div className={styles.errorBanner}>{errorMsg}</div>}

              {/* Big Confirm CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                id="submit-checkout-btn"
                className={styles.btnConfirmOrder}
              >
                {isSubmitting ? (
                  'Traitement de la commande...'
                ) : (
                  <>
                    <span>CONFIRMER MA COMMANDE</span>
                    <span className={styles.btnSubLabel}>Paiement sécurisé en espèces à la livraison</span>
                  </>
                )}
              </button>

              {/* Trust Badges */}
              <div className={styles.trustBadgesBox}>
                <div className={styles.trustItem}>
                  <span>📞</span>
                  <span>Confirmation téléphonique avant expédition</span>
                </div>
                <div className={styles.trustItem}>
                  <span>🚚</span>
                  <span>Livraison rapide 58 wilayas d&apos;Algérie</span>
                </div>
                <div className={styles.trustItem}>
                  <span>✨</span>
                  <span>Qualité &amp; emballage soigné garanti</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '80vh', padding: '4rem 1rem', textAlign: 'center' }}>Chargement de la commande...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
