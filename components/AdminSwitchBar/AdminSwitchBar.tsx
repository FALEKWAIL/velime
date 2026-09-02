'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './AdminSwitchBar.module.css';

export default function AdminSwitchBar() {
  const pathname = usePathname();
  const [isAdminAuthed, setIsAdminAuthed] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      try {
        if (typeof window !== 'undefined') {
          const isAuthed = localStorage.getItem('velime-admin-session') === 'active';
          setIsAdminAuthed(isAuthed);
        }
      } catch {}
    };

    checkAuth();
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  // Do not show if not authenticated or already on admin page
  if (!isAdminAuthed || pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <div className={styles.switchBarWrapper} id="admin-quick-switch-bar">
      <Link href="/admin" className={styles.switchButton}>
        <span className={styles.pulseDot} />
        <span className={styles.switchIcon}>⚡</span>
        <span className={styles.switchText}>Tableau de bord</span>
        <span className={styles.arrowIcon}>→</span>
      </Link>
    </div>
  );
}
