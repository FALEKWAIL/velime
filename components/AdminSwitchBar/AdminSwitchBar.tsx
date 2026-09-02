'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import styles from './AdminSwitchBar.module.css';

export default function AdminSwitchBar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isAdminAuthed, setIsAdminAuthed] = useState(false);

  useEffect(() => {
    setMounted(true);
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

  // Prevent hydration mismatch and do not show if not admin or already on admin page
  if (!mounted || !isAdminAuthed || pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <div className={styles.switchBarWrapper} id="admin-quick-switch-bar">
      <a href="/admin" className={styles.switchButton} title="Accéder au panneau d'administration">
        <span className={styles.pulseDot} />
        <span className={styles.switchIcon}>⚡</span>
        <span className={styles.switchText}>Tableau de bord</span>
        <span className={styles.arrowIcon}>→</span>
      </a>
    </div>
  );
}
