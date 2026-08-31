'use client';
import { useState, useId } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Product, DeliveryType, Order } from '@/types';
import { WILAYAS_ALGERIA, getWilayaByCode } from '@/lib/wilayas';
import { useOrders } from '@/hooks/useOrders';
import { formatPrice, getColorHex } from '@/data/products';
import styles from './DirectOrderForm.module.css';

interface Props {
  product: Product;
  selectedSize: string;
  selectedColor?: string;
  quantity: number;
  onQuantityChange?: (qty: number) => void;
  disabled?: boolean;
}

export default function DirectOrderForm({
  product,
  selectedSize,
  selectedColor,
  quantity,
  onQuantityChange,
  disabled = false,
}: Props) {
  const { placeOrder } = useOrders();
  const formId = useId();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedWilayaCode, setSelectedWilayaCode] = useState('16'); // Default Alger (16)
  const [commune, setCommune] = useState('');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('domicile');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  const currentWilaya = getWilayaByCode(selectedWilayaCode) || WILAYAS_ALGERIA[15]; // Alger fallback
  const deliveryFee = deliveryType === 'domicile' ? currentWilaya.homePrice : currentWilaya.deskPrice;
  const itemsSubtotal = product.price * quantity;
  const totalAmount = itemsSubtotal + deliveryFee;

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

    if (!selectedSize) {
      setErrorMsg('Veuillez sélectionner une taille avant de commander.');
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
            productName: product.name,
            productImage: product.image || (product.images && product.images[0]) || '/images/p1.jpg',
            price: product.price,
            quantity,
            size: selectedSize,
            color: selectedColor,
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
          <span className={styles.expressBadge}>⚡ Commande Express</span>
          <h3 className={styles.formTitle}>Commander Directement</h3>
        </div>
        <p className={styles.formSubtitle}>Remplissez vos informations, paiement sécurisé en espèces à la livraison</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
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
            >
              <input
                type="radio"
                name={`deliveryType-${formId}`}
                value="bureau"
                checked={deliveryType === 'bureau'}
                onChange={() => setDeliveryType('bureau')}
                className={styles.radioHidden}
              />
              <div className={styles.deliveryCardHeader}>
                <span className={styles.deliveryIcon}>🏢</span>
                <strong className={styles.deliveryTitle}>Au Bureau (Stop-Desk)</strong>
              </div>
              <span className={styles.deliveryFeeText}>{formatPrice(currentWilaya.deskPrice)}</span>
            </label>
          </div>
        </div>

        {/* Quantity in direct form if provided */}
        {onQuantityChange && (
          <div className={styles.qtyRowInline}>
            <span className={styles.formLabel}>Quantité :</span>
            <div className={styles.qtyButtons}>
              <button
                type="button"
                className={styles.qtyBtn}
                onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
              >−</button>
              <span className={styles.qtyVal}>{quantity}</span>
              <button
                type="button"
                className={styles.qtyBtn}
                onClick={() => onQuantityChange(quantity + 1)}
              >+</button>
            </div>
          </div>
        )}

        {/* Live Calculation Bill */}
        <div className={styles.priceRecapBox}>
          <div className={styles.recapRow}>
            <span>{product.name} ({selectedSize ? `Taille ${selectedSize}` : 'Sans taille'} {selectedColor ? `• ${selectedColor}` : ''}) × {quantity}</span>
            <span>{formatPrice(itemsSubtotal)}</span>
          </div>
          <div className={styles.recapRow}>
            <span>Livraison vers {currentWilaya.name} ({deliveryType === 'domicile' ? 'Domicile' : 'Bureau'})</span>
            <span>{formatPrice(deliveryFee)}</span>
          </div>
          <div className={styles.recapDivider} />
          <div className={styles.recapTotalRow}>
            <span>Total net à payer :</span>
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
