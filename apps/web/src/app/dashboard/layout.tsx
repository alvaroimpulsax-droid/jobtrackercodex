'use client';

import Link from 'next/link';
import { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import styles from './layout.module.css';
import { getAccessToken, logout } from '@/lib/auth';

const nav = [
  { href: '/dashboard', label: 'Resumen' },
  { href: '/dashboard/users', label: 'Empleados' },
  { href: '/dashboard/policies', label: 'Políticas' },
  { href: '/dashboard/audit', label: 'Auditoría' },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!getAccessToken()) {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.brandRow}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Impulsax" className={styles.logo} />
        </div>
        <nav className={styles.nav}>
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                href={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className={styles.sidebarCard}>
          <div className={styles.cardLabel}>Capturas</div>
          <div className={styles.cardValue}>Cada 10 min</div>
          <p className={styles.topbarMeta}>Retención 15 días</p>
        </div>
        <button
          className={styles.navItem}
          type="button"
          onClick={() => {
            logout();
            router.push('/login');
          }}
        >
          Cerrar sesión
        </button>
      </aside>
      <section className={styles.content}>{children}</section>
    </div>
  );
}
