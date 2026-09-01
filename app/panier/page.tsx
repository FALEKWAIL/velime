'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { formatPrice, getColorHex } from '@/data/products';
import { WILAYAS_ALGERIA, getWilayaByCode } from '@/lib/wilayas';
import { useOrders } from '@/hooks/useOrders';
import { DeliveryType, Order } from '@/types';
import styles from './panier.module.css';

export default function PanierPage() {
  const { items, removeItem, updateQuantity, totalPrice, totalItems, clearCart } = useCart();
  const { placeOrder } = useOrders();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedWilayaCode, setSelectedWilayaCode] = useState('16');
  const [commune, setCommune] = useState('');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('domicile');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  const currentWilaya = getWilayaByCode(selectedWilayaCode) || WILAYAS_ALGERIA[15];
  const deliveryFee = deliveryType === 'domicile' ? currentWilaya.homePrice : currentWilaya.deskPrice;
  const finalTotal = totalPrice + deliveryFee;

  const handleWilayaChange = (code: string) => {
    setSelectedWilayaCode(code);
    const wil = getWilayaByCode(code);
    if (wil?.communes && wil.communes.length > 0) {
      setCommune(wil.communes[0]);
    } else {
      setCommune('');
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

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
      const orderItems = items.map((it) => ({
        productId: it.product.id,
        productName: it.product.name,
        productImage: it.product.image || (it.product.images && it.product.images[0]) || '/images/p1.jpg',
        price: it.product.price,
        quantity: it.quantity,
        size: it.size,
        color: it.color,
      }));

      const order = await placeOrder({
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
        wilayaCode: currentWilaya.code,
        wilayaName: currentWilaya.name,
        commune: commune.trim() || currentWilaya.name,
        deliveryType,
        items: orderItems,
        itemsSubtotal: totalPrice,
        deliveryCost: deliveryFee,
        totalAmount: finalTotal,
        notes: notes.trim(),
      });

      clearCart();
      setCreatedOrder(order);
    } catch (err: any) {
      setErrorMsg(err.message || 'Une erreur est survenue lors de la commande.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS SCREEN
  if (createdOrder) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.successBox} id="cart-order-success">
            <div className={styles.successIcon}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span className={styles.successBadge}>Commande #{createdOrder.orderNumber}</span>
            <h1 className={styles.successHeading}>Merci {createdOrder.customerName} !</h1>
            <p className={styles.successSub}>
              Votre commande contenant <strong>{createdOrder.items.length} article(s)</strong> a bien été reçue. Nous vous contacterons au <strong>{createdOrder.customerPhone}</strong> pour confirmer l&apos;expédition.
            </p>

            <div className={styles.successRecap}>
              <div className={styles.successRecapRow}>
                <span>Articles commandés :</span>
                <strong>{createdOrder.items.map(i => `${i.productName} (${i.size}) × ${i.quantity}`).join(', ')}</strong>
              </div>
              <div className={styles.successRecapRow}>
                <span>Destination :</span>
                <span>{createdOrder.wilayaName} - {createdOrder.commune} ({createdOrder.deliveryType === 'domicile' ? 'À Domicile' : 'Au Bureau'})</span>
              </div>
              <div className={styles.successRecapRow}>
                <span>Frais de livraison :</span>
                <span>{formatPrice(createdOrder.deliveryCost)}</span>
              </div>
              <div className={styles.successRecapTotal}>
                <span>Total à payer à la livraison :</span>
                <strong>{formatPrice(createdOrder.totalAmount)}</strong>
              </div>
            </div>

            <Link href="/boutique" className="btn-primary" id="success-back-btn">
              Continuer mes achats
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // EMPTY CART
  if (items.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.pageTitle}>Panier</h1>
          <div className={styles.empty}>
            <div className={styles.emptyBox}>
              <span className={styles.bellIcon}>🛍️</span>
              <p className={styles.emptyText}>Votre panier est actuellement vide.</p>
            </div>
            <Link href="/boutique" className="btn-primary" id="back-to-shop-btn">
              Découvrir la collection
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>Panier &amp; Commande</h1>
        <p className={styles.count}>{totalItems} article{totalItems !== 1 ? 's' : ''}</p>

        <div className={styles.layout}>
          {/* Cart items */}
          <div className={styles.itemsList}>
            {items.map((item) => {
              const itemKey = `${item.product.id}-${item.size}-${item.color || 'default'}`;
              return (
                <div key={itemKey} className={styles.item} id={`cart-item-${item.product.id}`}>
                  <div className={styles.itemImage}>
                    <Image
                      src={item.product.image || (item.product.images && item.product.images[0]) || '/images/p1.jpg'}
                      alt={item.product.name}
                      fill
                      className={styles.itemImg}
                      sizes="100px"
                    />
                  </div>

                  <div className={styles.itemInfo}>
                    <div className={styles.itemHeader}>
                      <div>
                        <p className={styles.itemName}>{item.product.name}</p>
                        <div className={styles.itemMetaRow}>
                          <span className={styles.itemMetaBadge}>Taille : <strong>{item.size}</strong></span>
                          {item.color && (
                            <span className={styles.itemMetaBadge}>
                              <span
                                className={styles.itemMetaColorDot}
                                style={{ backgroundColor: getColorHex(item.color) }}
                              />
                              Couleur : <strong>{item.color}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        className={styles.removeBtn}
                        onClick={() => removeItem(item.product.id, item.size, item.color)}
                        aria-label={`Supprimer ${item.product.name}`}
                        id={`remove-${item.product.id}`}
                      >
                        ✕
                      </button>
                    </div>

                    <div className={styles.itemFooter}>
                      <div className={styles.qty}>
                        <button
                          className={styles.qtyBtn}
                          onClick={() => updateQuantity(item.product.id, item.size, item.color, item.quantity - 1)}
                          id={`qty-dec-${item.product.id}`}
                        >−</button>
                        <span className={styles.qtyVal}>{item.quantity}</span>
                        <button
                          className={styles.qtyBtn}
                          onClick={() => updateQuantity(item.product.id, item.size, item.color, item.quantity + 1)}
                          id={`qty-inc-${item.product.id}`}
                        >+</button>
                      </div>
                      <span className={styles.itemPrice}>{formatPrice(item.product.price * item.quantity)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Direct Checkout Form */}
          <div className={styles.summary}>
            <h2 className={styles.summaryTitle}>Validation de la Commande</h2>
            <p className={styles.summarySub}>Paiement en espèces à la livraison</p>

            <form onSubmit={handleCheckout} className={styles.checkoutForm}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Nom &amp; Prénom *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => { setCustomerName(e.target.value); setErrorMsg(''); }}
                  placeholder="Ex: Sarah Benali"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Numéro de Téléphone *</label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => { setCustomerPhone(e.target.value); setErrorMsg(''); }}
                  placeholder="Ex: 0550 12 34 56"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Wilaya *</label>
                <select
                  value={selectedWilayaCode}
                  onChange={(e) => handleWilayaChange(e.target.value)}
                  className={styles.select}
                >
                  {WILAYAS_ALGERIA.map((w) => (
                    <option key={w.code} value={w.code}>
                      {w.code} - {w.name} ({w.arName})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Commune / Ville *</label>
                {currentWilaya.communes && currentWilaya.communes.length > 0 ? (
                  <select
                    value={commune || currentWilaya.communes[0]}
                    onChange={(e) => setCommune(e.target.value)}
                    className={styles.select}
                  >
                    {currentWilaya.communes.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={commune}
                    onChange={(e) => setCommune(e.target.value)}
                    placeholder="Ex: Centre ville"
                    className={styles.input}
                  />
                )}
              </div>

              {/* Delivery Type Option */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Mode de Livraison</label>
                <div className={styles.deliveryGrid}>
                  <label className={`${styles.deliveryOpt} ${deliveryType === 'domicile' ? styles.deliveryActive : ''}`}>
                    <input
                      type="radio"
                      name="cartDeliveryType"
                      value="domicile"
                      checked={deliveryType === 'domicile'}
                      onChange={() => setDeliveryType('domicile')}
                      className={styles.hiddenRadio}
                    />
                    <span className={styles.delivTitle}>🏠 À Domicile</span>
                    <span className={styles.delivPrice}>{formatPrice(currentWilaya.homePrice)}</span>
                  </label>

                  <label className={`${styles.deliveryOpt} ${deliveryType === 'bureau' ? styles.deliveryActive : ''}`}>
                    <input
                      type="radio"
                      name="cartDeliveryType"
                      value="bureau"
                      checked={deliveryType === 'bureau'}
                      onChange={() => setDeliveryType('bureau')}
                      className={styles.hiddenRadio}
                    />
                    <span className={styles.delivTitle}>🏢 Stop-Desk (Bureau)</span>
                    <span className={styles.delivPrice}>{formatPrice(currentWilaya.deskPrice)}</span>
                  </label>
                </div>
              </div>

              {/* Summary Rows */}
              <div className={styles.billBox}>
                <div className={styles.summaryRow}>
                  <span>Sous-total articles</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>Livraison ({currentWilaya.name})</span>
                  <span>{formatPrice(deliveryFee)}</span>
                </div>
                <div className={styles.summaryDivider} />
                <div className={styles.summaryTotal}>
                  <span>Total à payer</span>
                  <span className={styles.totalNumber}>{formatPrice(finalTotal)}</span>
                </div>
              </div>

              {errorMsg && <div className={styles.errorAlert}>{errorMsg}</div>}

              <button
                type="submit"
                disabled={isSubmitting}
                className={styles.confirmBtn}
                id="cart-submit-order-btn"
              >
                {isSubmitting ? 'Enregistrement de la commande...' : 'CONFIRMER LA COMMANDE'}
              </button>
            </form>

            <Link href="/boutique" className={styles.continueLink} id="continue-shopping">
              ← Continuer mes achats
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
