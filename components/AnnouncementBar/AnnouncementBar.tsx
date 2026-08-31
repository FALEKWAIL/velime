'use client';
import styles from './AnnouncementBar.module.css';

const announcements = [
  { icon: '♥', text: 'Livraison disponible 58 wilayas' },
  { icon: '★', text: 'Paiement à la livraison sécurisé' },
  { icon: '♥', text: 'Velime Boutique — Mode & Élégance' },
  { icon: '★', text: 'Livraison rapide & soignée' },
  { icon: '♥', text: 'Qualité & Finitions Haut de Gamme' },
  { icon: '★', text: 'Service Client à votre écoute 7j/7' },
];

export default function AnnouncementBar() {
  return (
    <div className={styles.bar} id="top-announcement-bar" role="region" aria-label="Annonces boutique">
      <div className={styles.track}>
        <div className={styles.content}>
          {announcements.map((item, i) => (
            <span key={`a1-${i}`} className={styles.item}>
              <span className={styles.icon}>{item.icon}</span>
              <span className={styles.text}>{item.text}</span>
            </span>
          ))}
        </div>
        <div className={styles.content} aria-hidden="true">
          {announcements.map((item, i) => (
            <span key={`a2-${i}`} className={styles.item}>
              <span className={styles.icon}>{item.icon}</span>
              <span className={styles.text}>{item.text}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
