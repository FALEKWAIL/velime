'use client';
import { useState, useEffect, useId } from 'react';
import Link from 'next/link';
import { Product, DeliveryType, Order } from '@/types';
import { WILAYAS_ALGERIA, getWilayaByCode } from '@/lib/wilayas';
import { useOrders } from '@/hooks/useOrders';
import { formatPrice, isVariantInStock } from '@/data/products';
import styles from './DirectOrderForm.module.css';

interface Props {
  product: Product;
  selectedSize?: string;
  selectedColor?: string;
  quantity?: number;
  onColorChange?: (color: string) => void;
  onSizeChange?: (size: string) => void;
  onQuantityChange?: (qty: number) => void;
  disabled?: boolean;
}

export default function DirectOrderForm({
  product,
  selectedSize: initialSize = '',
  selectedColor: initialColor = '',
  quantity: initialQuantity = 1,
  onColorChange,
  onSizeChange,
  onQuantityChange,
  disabled = false,
}: Props) {
  const { placeOrder } = useOrders();
  const formId = useId();

  // Local state for choices
  const [color, setColor] = useState(initialColor);
  const [size, setSize] = useState(initialSize);
  const [qty, setQty] = useState(initialQuantity);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedWilayaCode, setSelectedWilayaCode] = useState('16'); // Default Alger (16)
  const [commune, setCommune] = useState('');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('domicile');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  const productColors = product.colors && product.colors.length > 0 ? product.colors : [];
  const currentWilaya = getWilayaByCode(selectedWilayaCode) || WILAYAS_ALGERIA[15]; // Alger fallback
  const deliveryFee = deliveryType === 'domicile' || currentWilaya.deskPrice === 0 ? currentWilaya.homePrice : currentWilaya.deskPrice;
  const itemsSubtotal = product.price * qty;
  const totalAmount = itemsSubtotal + deliveryFee;

  useEffect(() => {
    if (currentWilaya.deskPrice === 0 && deliveryType === 'bureau') {
      setDeliveryType('domicile');
    }
  }, [currentWilaya, deliveryType]);

  const handleColorSelect = (newColor: string) => {
    setColor(newColor);
    setErrorMsg('');
    if (onColorChange) onColorChange(newColor);
    if (size && !isVariantInStock(product, size, newColor)) {
      setSize('');
      if (onSizeChange) onSizeChange('');
    }
  };

  const handleSizeSelect = (newSize: string) => {
    setSize(newSize);
    setErrorMsg('');
    if (onSizeChange) onSizeChange(newSize);
  };

  const handleQtyChange = (newQty: number) => {
    const val = Math.max(1, newQty);
    setQty(val);
    if (onQuantityChange) onQuantityChange(val);
  };

  const handleWilayaChange = (code: string) => {
    setSelectedWilayaCode(code);
    const wil = getWilayaByCode(code);
    if (wil?.communes && wil.communes.length > 0) {
      setCommune(wil.communes[0]);
    } else {
      setCommune('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;

    if (productColors.length > 0 && !color) {
      setErrorMsg('Veuillez sélectionner une couleur.');
      return;
    }

    if (!size) {
      setErrorMsg('Veuillez sélectionner une taille.');
      return;
    }

    if (!isVariantInStock(product, size, color || undefined)) {
      setErrorMsg(`La taille (${size}) est épuisée en ${color || 'cette variante'}.`);
      return;
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
      const order = await placeOrder({
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
        wilayaCode: currentWilaya.code,
        wilayaName: currentWilaya.name,
        commune: commune.trim() || currentWilaya.name,
        deliveryType,
        items: [
          {
            productId: product.id,
            productSlug: product.slug,
            productName: product.name,
            productImage: product.image || (product.images && product.images[0]) || '/images/p1.jpg',
            price: product.price,
            quantity: qty,
            size: size,
            color: color || undefined,
          },
        ],
        itemsSubtotal,
        deliveryCost: deliveryFee,
        totalAmount,
        notes: notes.trim(),
      });

      setCreatedOrder(order);
    } catch (err: any) {
      setErrorMsg(err.message || 'Une erreur est survenue lors de la commande.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS CONFIRMATION MODAL / VIEW
  if (createdOrder) {
    return (
      <div className={styles.successCard} id="order-success-banner">
        <div className={styles.successIconWrapper}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <span className={styles.successOrderBadge}>Commande #{createdOrder.orderNumber}</span>
        <h3 className={styles.successTitle}>Merci {createdOrder.customerName} !</h3>
        <p className={styles.successDesc}>
          Votre commande a été enregistrée avec succès. Notre service client va vous appeler au{' '}
          <strong>{createdOrder.customerPhone}</strong> pour confirmer la livraison.
        </p>

        {/* Order details summary */}
        <div className={styles.successSummaryBox}>
          <div className={styles.successItemRow}>
            <span>Article :</span>
            <strong>{createdOrder.items[0]?.productName} ({createdOrder.items[0]?.size} {createdOrder.items[0]?.color ? `• ${createdOrder.items[0]?.color}` : ''})</strong>
          </div>
          <div className={styles.successItemRow}>
            <span>Destination :</span>
            <span>{createdOrder.wilayaName} - {createdOrder.commune} ({createdOrder.deliveryType === 'domicile' ? 'À domicile' : 'Au bureau'})</span>
          </div>
          <div className={styles.successItemRow}>
            <span>Frais de livraison :</span>
            <span>{formatPrice(createdOrder.deliveryCost)}</span>
          </div>
          <div className={styles.successTotalRow}>
            <span>Total à payer à la livraison :</span>
            <strong className={styles.successTotalNumber}>{formatPrice(createdOrder.totalAmount)}</strong>
          </div>
        </div>

        <div className={styles.successActions}>
          <button
            type="button"
            className={styles.newOrderBtn}
            onClick={() => setCreatedOrder(null)}
          >
            Passer une autre commande
          </button>
          <Link href="/boutique" className={styles.continueShopBtn}>
            Continuer mes achats
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.orderContainer} id="direct-order-section">
      <div className={styles.formHeader}>
        <div className={styles.headerTitleRow}>
          <span className={styles.expressBadge}>⚡ Formulaire de Commande</span>
          <h3 className={styles.formTitle}>Commander Directement</h3>
        </div>
        <p className={styles.formSubtitle}>Choisissez vos options et remplissez vos informations de livraison</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* ============================================================
            PRODUCT OPTIONS (COLOR, SIZE, QUANTITY) DIRECTLY IN FORM
           ============================================================ */}
        <div className={styles.productOptionsSection}>
          {productColors.length > 0 && (
            <div className={styles.formGroup}>
              <label htmlFor={`${formId}-color`} className={styles.formLabel}>
                Couleur <span className={styles.req}>*</span>
              </label>
              <select
                id={`${formId}-color`}
                value={color}
                onChange={(e) => handleColorSelect(e.target.value)}
                className={styles.formSelect}
                required
              >
                <option value="">Choisir une option</option>
                {productColors.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          <div className={styles.twoColGrid}>
            <div className={styles.formGroup}>
              <label htmlFor={`${formId}-size`} className={styles.formLabel}>
                Taille <span className={styles.req}>*</span>
              </label>
              <select
                id={`${formId}-size`}
                value={size}
                onChange={(e) => handleSizeSelect(e.target.value)}
                className={styles.formSelect}
                required
              >
                <option value="">Choisir une option</option>
                {product.sizes.map((s) => {
                  const inStock = isVariantInStock(product, s, color || undefined);
                  return (
                    <option key={s} value={s} disabled={!inStock}>
                      {s} {!inStock ? '(Épuisé)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Quantité</label>
              <div className={styles.qtyStepperBox}>
                <button
                  type="button"
                  className={styles.qtyStepBtn}
                  onClick={() => handleQtyChange(qty - 1)}
                >−</button>
                <span className={styles.qtyStepVal}>{qty}</span>
                <button
                  type="button"
                  className={styles.qtyStepBtn}
                  onClick={() => handleQtyChange(qty + 1)}
                >+</button>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.formDivider} />

        {/* Customer Full Name */}
        <div className={styles.formGroup}>
          <label htmlFor={`${formId}-name`} className={styles.formLabel}>
            Nom &amp; Prénom <span className={styles.req}>*</span>
          </label>
          <input
            id={`${formId}-name`}
            type="text"
            required
            disabled={disabled || isSubmitting}
            value={customerName}
            onChange={(e) => { setCustomerName(e.target.value); setErrorMsg(''); }}
            placeholder="Ex: Sarah Benali"
            className={styles.formInput}
          />
        </div>

        {/* Customer Phone */}
        <div className={styles.formGroup}>
          <label htmlFor={`${formId}-phone`} className={styles.formLabel}>
            Numéro de Téléphone <span className={styles.req}>*</span>
          </label>
          <input
            id={`${formId}-phone`}
            type="tel"
            required
            disabled={disabled || isSubmitting}
            value={customerPhone}
            onChange={(e) => { setCustomerPhone(e.target.value); setErrorMsg(''); }}
            placeholder="Ex: 0550 12 34 56"
            className={styles.formInput}
          />
        </div>

        {/* Wilaya & Commune Grid */}
        <div className={styles.twoColGrid}>
          <div className={styles.formGroup}>
            <label htmlFor={`${formId}-wilaya`} className={styles.formLabel}>
              Wilaya ({WILAYAS_ALGERIA.length} Wilayas) <span className={styles.req}>*</span>
            </label>
            <select
              id={`${formId}-wilaya`}
              value={selectedWilayaCode}
              disabled={disabled || isSubmitting}
              onChange={(e) => handleWilayaChange(e.target.value)}
              className={styles.formSelect}
            >
              {WILAYAS_ALGERIA.map((w) => (
                <option key={w.code} value={w.code}>
                  {w.code} - {w.name} ({w.arName})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor={`${formId}-commune`} className={styles.formLabel}>
              Commune / Ville <span className={styles.req}>*</span>
            </label>
            {currentWilaya.communes && currentWilaya.communes.length > 0 ? (
              <select
                id={`${formId}-commune`}
                value={commune || currentWilaya.communes[0]}
                disabled={disabled || isSubmitting}
                onChange={(e) => setCommune(e.target.value)}
                className={styles.formSelect}
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
                disabled={disabled || isSubmitting}
                value={commune}
                onChange={(e) => setCommune(e.target.value)}
                placeholder="Ex: Centre ville"
                className={styles.formInput}
              />
            )}
          </div>
        </div>

        {/* Delivery Type Option: Domicile vs Bureau Stop-Desk */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Type de Livraison</label>
          <div className={styles.deliveryTypeGrid}>
            <label
              className={`${styles.deliveryTypeCard} ${deliveryType === 'domicile' ? styles.deliveryActive : ''}`}
            >
              <input
                type="radio"
                name={`deliveryType-${formId}`}
                value="domicile"
                checked={deliveryType === 'domicile'}
                onChange={() => setDeliveryType('domicile')}
                className={styles.radioHidden}
              />
              <div className={styles.deliveryCardHeader}>
                <span className={styles.deliveryIcon}>🏠</span>
                <strong className={styles.deliveryTitle}>À Domicile</strong>
              </div>
              <span className={styles.deliveryFeeText}>{formatPrice(currentWilaya.homePrice)}</span>
            </label>

            <label
              className={`${styles.deliveryTypeCard} ${deliveryType === 'bureau' ? styles.deliveryActive : ''}`}
              style={currentWilaya.deskPrice === 0 ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
            >
              <input
                type="radio"
                name={`deliveryType-${formId}`}
                value="bureau"
                disabled={currentWilaya.deskPrice === 0}
                checked={deliveryType === 'bureau' && currentWilaya.deskPrice > 0}
                onChange={() => {
                  if (currentWilaya.deskPrice > 0) setDeliveryType('bureau');
                }}
                className={styles.radioHidden}
              />
              <div className={styles.deliveryCardHeader}>
                <span className={styles.deliveryIcon}>🏢</span>
                <strong className={styles.deliveryTitle}>Au Bureau (Stop-Desk)</strong>
              </div>
              <span className={styles.deliveryFeeText}>
                {currentWilaya.deskPrice > 0 ? formatPrice(currentWilaya.deskPrice) : 'Indisponible'}
              </span>
            </label>
          </div>
        </div>

        {/* Live Calculation Bill */}
        <div className={styles.priceRecapBox}>
          <div className={styles.recapRow}>
            <span>{product.name} ({size ? `Taille ${size}` : 'Taille non choisie'} {color ? `• ${color}` : ''}) × {qty}</span>
            <span>{formatPrice(itemsSubtotal)}</span>
          </div>
          <div className={styles.recapRow}>
            <span>Livraison vers {currentWilaya.name} ({deliveryType === 'domicile' ? 'Domicile' : 'Bureau'})</span>
            <span>{formatPrice(deliveryFee)}</span>
          </div>
          <div className={styles.recapDivider} />
          <div className={styles.recapTotalRow}>
            <span>Total net à payer à la livraison :</span>
            <strong className={styles.totalPriceValue}>{formatPrice(totalAmount)}</strong>
          </div>
        </div>

        {errorMsg && <div className={styles.errorAlert}>{errorMsg}</div>}

        {/* Big Direct Confirm CTA */}
        <button
          type="submit"
          id="confirm-direct-order-btn"
          disabled={disabled || isSubmitting}
          className={`${styles.submitOrderBtn} ${disabled ? styles.btnDisabled : ''}`}
        >
          {isSubmitting ? (
            'Enregistrement de la commande...'
          ) : (
            <>
              <span>CONFIRMER LA COMMANDE</span>
              <span className={styles.btnSubtext}>Paiement en espèces à la livraison</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
