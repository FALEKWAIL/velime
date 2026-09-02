'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useSiteData } from '@/hooks/useSiteData';
import styles from './MobileMenu.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function MobileMenu({ open, onClose }: Props) {
  const { categories } = useSiteData();

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      {/* Overlay */}
      <div
        className={`${styles.overlay} ${open ? styles.overlayOpen : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <nav
        className={`${styles.drawer} ${open ? styles.drawerOpen : ''}`}
        role="navigation"
        id="mobile-menu"
      >
        <div className={styles.drawerHeader}>
          <span className={styles.drawerLogo}>Velime</span>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Fermer le menu"
          >
            ✕
          </button>
        </div>

        <ul className={styles.navList}>
          <li>
            <a href="/" className={styles.navLink} onClick={onClose}>
              Accueil
            </a>
          </li>
          <li>
            <a href="/boutique" className={styles.navLink} onClick={onClose}>
              Toute la Collection
            </a>
          </li>
          {categories && categories.length > 0 && categories.map((cat) => (
            <li key={cat.id}>
              <a
                href={`/boutique?cat=${encodeURIComponent(cat.name)}`}
                className={styles.navLink}
                onClick={onClose}
              >
                {cat.name}
              </a>
            </li>
          ))}
          <li>
            <a href="/panier" className={styles.navLink} onClick={onClose}>
              Mon Panier
            </a>
          </li>
        </ul>

        <div className={styles.drawerFooter}>
          <p className={styles.footerText}>Une mode inspirée par l&apos;élégance moderne.</p>
          <div className={styles.socialLinks}>
            <a
              href="https://instagram.com/velime.co"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialLink}
            >
              Instagram (@velime.co)
            </a>
            <a
              href="https://wa.me/213551015886"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialLink}
            >
              WhatsApp (0551 01 58 86)
            </a>
          </div>
        </div>
      </nav>
    </>
  );
}
