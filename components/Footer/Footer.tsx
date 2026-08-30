'use client';
import Link from 'next/link';
import { useSiteData } from '@/hooks/useSiteData';
import styles from './Footer.module.css';

export default function Footer() {
  const { categories } = useSiteData();
  const displayCategories = categories && categories.length > 0 ? categories : [
    { id: '1', name: 'Robes', slug: 'robes' },
    { id: '2', name: 'Ensembles', slug: 'ensembles' },
    { id: '3', name: 'Chemises', slug: 'chemises' },
    { id: '4', name: 'Manteaux', slug: 'manteaux' },
  ];

  return (
    <footer className={styles.footer} id="footer">
      <div className={styles.inner}>
        {/* Logo & tagline */}
        <div className={styles.brand}>
          <div className={styles.logo}>
            <span className={styles.logoSub}>Boutique</span>
            <span className={styles.logoMain}>Velime</span>
          </div>
          <p className={styles.tagline}>
            Une mode pensée pour accompagner chaque femme avec élégance, confiance et modernité.
          </p>
        </div>

        {/* Nav columns */}
        <div className={styles.navColumns}>
          <div className={styles.navCol}>
            <h3 className={styles.colTitle}>Navigation</h3>
            <ul className={styles.colList}>
              <li><Link href="/" className={styles.footLink}>Accueil</Link></li>
              <li><Link href="/boutique" className={styles.footLink}>Boutique</Link></li>
              <li><Link href="/boutique?cat=Nouveau" className={styles.footLink}>Nouveautés</Link></li>
              <li><Link href="/panier" className={styles.footLink}>Panier</Link></li>
            </ul>
          </div>
          <div className={styles.navCol}>
            <h3 className={styles.colTitle}>Catégories</h3>
            <ul className={styles.colList}>
              {displayCategories.slice(0, 5).map((cat) => (
                <li key={cat.id}>
                  <Link href={`/boutique?cat=${encodeURIComponent(cat.name)}`} className={styles.footLink}>
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.navCol}>
            <h3 className={styles.colTitle}>Contact</h3>
            <ul className={styles.colList}>
              <li>
                <a href="https://wa.me/213000000000" target="_blank" rel="noopener noreferrer" className={styles.footLink}>
                  WhatsApp
                </a>
              </li>
              <li>
                <a href="https://instagram.com/velime_boutique" target="_blank" rel="noopener noreferrer" className={styles.footLink}>
                  Instagram
                </a>
              </li>
              <li className={styles.footText}>Livraison dans 58 wilayas</li>
              <li className={styles.footText}>Paiement sécurisé</li>
            </ul>
          </div>
        </div>
      </div>

      <div className={styles.bottom}>
        <p className={styles.copyright}>© {new Date().getFullYear()} Velime Boutique. Tous droits réservés.</p>
        <div className={styles.adminLinkWrapper}>
          <Link href="/admin" className={styles.adminFootLink} id="footer-admin-link">
            Accès Administration
          </Link>
        </div>
      </div>
    </footer>
  );
}
