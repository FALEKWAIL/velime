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
            <Link href="/" className={styles.navLink} onClick={onClose}>
              Accueil
            </Link>
          </li>
          <li>
            <Link href="/boutique" className={styles.navLink} onClick={onClose}>
              Toute la Boutique
            </Link>
          </li>
          {categories.map((cat) => (
            <li key={cat.id}>
              <Link
                href={`/boutique?cat=${encodeURIComponent(cat.name)}`}
                className={styles.navLink}
                onClick={onClose}
              >
                {cat.name}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/panier" className={styles.navLink} onClick={onClose}>
              Mon Panier
            </Link>
          </li>
          <li>
            <Link href="/admin" className={styles.navLink} onClick={onClose} style={{ color: '#8c7864', fontSize: '0.75rem' }}>
              Panneau d&apos;Administration
            </Link>
          </li>
        </ul>

        <div className={styles.drawerFooter}>
          <p className={styles.footerText}>Une mode inspirée par l&apos;élégance moderne.</p>
          <div className={styles.socialLinks}>
            <a
              href="https://instagram.com/velime_boutique"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialLink}
            >
              Instagram
            </a>
            <a
              href="https://wa.me/213000000000"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialLink}
            >
              WhatsApp
            </a>
          </div>
        </div>
      </nav>
    </>
  );
}
