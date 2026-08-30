'use client';
import { useEffect, useRef } from 'react';
import styles from './AnnouncementBar.module.css';

const messages = [
  '🚚 Livraison sécurisée',
  '❤️ Livraison disponible dans 58 wilayas',
  '💳 Paiement sécurisé',
  '✨ Nouvelle collection disponible',
  '🎁 Emballage cadeau offert',
];

export default function AnnouncementBar() {
  const trackRef = useRef<HTMLDivElement>(null);

  return (
    <div className={styles.bar}>
      <div className={styles.track} ref={trackRef}>
        <div className={styles.content}>
          {[...messages, ...messages].map((msg, i) => (
            <span key={i} className={styles.item}>
              {msg}
              <span className={styles.dot}>•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
