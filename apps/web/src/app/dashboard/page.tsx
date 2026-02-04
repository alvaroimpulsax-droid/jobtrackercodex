'use client';

import { useEffect, useState } from 'react';
import styles from './layout.module.css';
import { getActivity, getTime, getUsers } from '@/lib/api';

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  canViewOwnHistory: boolean;
};

export default function DashboardPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentEvents, setRecentEvents] = useState<number>(0);
  const [recentHours, setRecentHours] = useState<number>(0);
  const todayLabel = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getUsers();
        setUsers(data);
        if (data.length) {
          const today = new Date();
          const from = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
          const userId = data[0].id;
          const [activity, time] = await Promise.all([
            getActivity(userId, from),
            getTime(userId, from),
          ]);
          setRecentEvents(activity.length);
          const totalMs = time.reduce((acc, entry) => {
            const end = entry.endedAt ? new Date(entry.endedAt).getTime() : Date.now();
            return acc + (end - new Date(entry.startedAt).getTime());
          }, 0);
          setRecentHours(totalMs / 36e5);
        }
      } catch (err: any) {
        setError(err?.message ?? 'No se pudo cargar el resumen');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="fade-in">
      <header className={styles.topbar}>
        <div>
          <h1 className={styles.topbarTitle}>Resumen operativo</h1>
          <p className={styles.topbarMeta}>{todayLabel}</p>
        </div>
        <button className={styles.navItem}>Exportar CSV</button>
      </header>

      {error ? <p className={styles.topbarMeta}>{error}</p> : null}

      <section className={styles.cards}>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Empleados activos</div>
          <div className={styles.cardValue}>{loading ? '...' : users.length}</div>
          <p className={styles.topbarMeta}>Con acceso asignado</p>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Eventos (1 usuario)</div>
          <div className={styles.cardValue}>{loading ? '...' : recentEvents}</div>
          <p className={styles.topbarMeta}>Actividad de hoy</p>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Horas hoy (1 usuario)</div>
          <div className={styles.cardValue}>{loading ? '...' : `${recentHours.toFixed(1)}h`}</div>
          <p className={styles.topbarMeta}>Tracking manual</p>
        </div>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.topbarTitle}>Equipo</h2>
        <p className={styles.topbarMeta}>Vista rápida de empleados (datos reales).</p>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Empleado</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Historial</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <div>{user.name}</div>
                  <div className={styles.topbarMeta}>{user.email}</div>
                </td>
                <td>{user.role}</td>
                <td>{user.status}</td>
                <td>
                  <span className={styles.tag}>
                    {user.canViewOwnHistory ? 'Permitido' : 'Bloqueado'}
                  </span>
                </td>
              </tr>
            ))}
            {!loading && users.length === 0 ? (
              <tr>
                <td colSpan={4}>No hay usuarios aún.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
