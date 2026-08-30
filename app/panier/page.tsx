'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { formatPrice, getColorHex } from '@/data/products';
import styles from './panier.module.css';

export default function PanierPage() {
  const { items, removeItem, updateQuantity, totalPrice, totalItems } = useCart();

  // Generate WhatsApp Order Message
  const getWhatsAppCheckoutUrl = () => {
    let text = `*NOUVELLE COMMANDE VELIME*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    items.forEach((item, index) => {
      text += `*${index + 1}. ${item.product.name}*\n`;
      text += `   • Taille : *${item.size}*\n`;
      if (item.color) {
        text += `   • Couleur : *${item.color}*\n`;
      }
      text += `   • Quantité : *${item.quantity}*\n`;
      text += `   • Prix : ${formatPrice(item.product.price * item.quantity)}\n\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `*Total Articles :* ${totalItems}\n`;
    text += `*Montant Total :* *${formatPrice(totalPrice)}*\n\n`;
    text += `*Informations de livraison :*\n`;
    text += `• Nom & Prénom :\n`;
    text += `• Numéro de téléphone :\n`;
    text += `• Wilaya :\n`;
    text += `• Adresse de livraison :\n`;

    return `https://wa.me/213000000000?text=${encodeURIComponent(text)}`;
  };

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
              Retour à la boutique
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>Panier</h1>
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
                      src={item.product.image}
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
                      {/* Quantity */}
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

          {/* Order summary */}
          <div className={styles.summary}>
            <h2 className={styles.summaryTitle}>Récapitulatif</h2>
            <div className={styles.summaryRow}>
              <span>Sous-total</span>
              <span>{formatPrice(totalPrice)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Livraison</span>
              <span className={styles.freeShip}>Calculée à la commande</span>
            </div>
            <div className={styles.summaryDivider} />
            <div className={styles.summaryTotal}>
              <span>Total</span>
              <span>{formatPrice(totalPrice)}</span>
            </div>
            <a
              href={getWhatsAppCheckoutUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.checkoutBtn} btn-primary`}
              id="checkout-btn"
            >
              Commander via WhatsApp
            </a>
            <Link href="/boutique" className={styles.continueLink} id="continue-shopping">
              ← Continuer mes achats
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
