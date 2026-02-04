'use client';

import { useEffect, useState } from 'react';
import styles from './layout.module.css';
import { getActiveSessions, getActivity, getTime, getUsers } from '@/lib/api';

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  canViewOwnHistory: boolean;
};

type ActiveSession = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  deviceId: string | null;
  deviceName: string | null;
  platform: string | null;
  startedAt: string;
  lastActivityAt: string | null;
  lastApp: string | null;
  lastWindowTitle: string | null;
  lastUrl: string | null;
  idle: boolean | null;
};

function formatAgo(value?: string | null) {
  if (!value) return 'Sin actividad';
  const diffMs = Date.now() - new Date(value).getTime();
  if (Number.isNaN(diffMs)) return 'Sin actividad';
  const seconds = Math.max(0, Math.floor(diffMs / 1000));
  if (seconds < 60) return `hace ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `hace ${hours}h`;
}

export default function DashboardPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [activeError, setActiveError] = useState<string | null>(null);
  const [lastActiveRefresh, setLastActiveRefresh] = useState<Date | null>(null);
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

  useEffect(() => {
    let mounted = true;
    const loadActive = async () => {
      try {
        const data = await getActiveSessions();
        if (!mounted) return;
        setActiveSessions(data);
        setActiveError(null);
        setLastActiveRefresh(new Date());
      } catch (err: any) {
        if (!mounted) return;
        setActiveError(err?.message ?? 'No se pudo cargar actividad en vivo');
      }
    };

    loadActive();
    const timer = setInterval(loadActive, 5000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
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
          <div className={styles.cardLabel}>Trabajadores activos ahora</div>
          <div className={styles.cardValue}>{activeSessions.length}</div>
          <p className={styles.topbarMeta}>Sesiones abiertas</p>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Total empleados</div>
          <div className={styles.cardValue}>{loading ? '...' : users.length}</div>
          <p className={styles.topbarMeta}>Con acceso asignado</p>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Horas hoy (1 usuario)</div>
          <div className={styles.cardValue}>{loading ? '...' : `${recentHours.toFixed(1)}h`}</div>
          <p className={styles.topbarMeta}>Tracking manual</p>
        </div>
      </section>

      <section className={styles.panel} style={{ marginBottom: 24 }}>
        <h2 className={styles.topbarTitle}>Trabajadores activos en tiempo real</h2>
        <p className={styles.topbarMeta}>
          {lastActiveRefresh ? `Actualizado ${formatAgo(lastActiveRefresh.toISOString())}` : 'Actualizando...'}
        </p>
        {activeError ? <p className={styles.topbarMeta}>{activeError}</p> : null}
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Empleado</th>
              <th>Estado</th>
              <th>Ultima actividad</th>
              <th>App / URL</th>
              <th>Dispositivo</th>
              <th>Inicio</th>
            </tr>
          </thead>
          <tbody>
            {activeSessions.map((session) => (
              <tr key={session.id}>
                <td>
                  <div>{session.userName}</div>
                  <div className={styles.topbarMeta}>{session.userEmail}</div>
                </td>
                <td>
                  <span className={styles.tag}>{session.idle ? 'Idle' : 'Activo'}</span>
                </td>
                <td>{formatAgo(session.lastActivityAt)}</td>
                <td>
                  <div>{session.lastApp ?? 'Sin datos'}</div>
                  <div className={styles.topbarMeta}>
                    {session.lastUrl ?? session.lastWindowTitle ?? ''}
                  </div>
                </td>
                <td>
                  <div>{session.deviceName ?? 'Sin dispositivo'}</div>
                  <div className={styles.topbarMeta}>{session.platform ?? ''}</div>
                </td>
                <td>{new Date(session.startedAt).toLocaleTimeString('es-ES')}</td>
              </tr>
            ))}
            {activeSessions.length === 0 ? (
              <tr>
                <td colSpan={6}>No hay sesiones activas.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.topbarTitle}>Equipo</h2>
        <p className={styles.topbarMeta}>Vista rapida de empleados (datos reales).</p>
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
                <td colSpan={4}>No hay usuarios aun.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
