'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import styles from '../../layout.module.css';
import {
  getActivity,
  getCapturePolicy,
  getScreenshots,
  getTime,
  getUsers,
  logAudit,
  setCapturePolicy,
  updateUser,
} from '@/lib/api';

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  canViewOwnHistory: boolean;
};

type ActivityRow = {
  id: string;
  startedAt: string;
  endedAt: string;
  appName: string;
  windowTitle?: string;
  url?: string;
  idle: boolean;
};

type TimeRow = {
  id: string;
  startedAt: string;
  endedAt: string | null;
};

type ScreenshotRow = {
  id: string;
  takenAt: string;
  url: string | null;
  storageKey: string;
};

const roles = ['owner', 'admin', 'manager', 'employee', 'auditor'];

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','));
  const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function UserDetailPage() {
  const params = useParams();
  const userId = params?.id as string;
  const [user, setUser] = useState<UserRow | null>(null);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [time, setTime] = useState<TimeRow[]>([]);
  const [screenshots, setScreenshots] = useState<ScreenshotRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [captureInterval, setCaptureInterval] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const users = await getUsers();
        const target = users.find((u) => u.id === userId) ?? null;
        setUser(target);

        const from = new Date();
        from.setDate(from.getDate() - 1);
        const [events, entries, shots] = await Promise.all([
          getActivity(userId, from.toISOString()),
          getTime(userId, from.toISOString()),
          getScreenshots(userId, from.toISOString()),
        ]);
        setActivity(events);
        setTime(entries);
        setScreenshots(shots);

        try {
          const policy = await getCapturePolicy(userId);
          setCaptureInterval(String(Math.round(policy.intervalSeconds / 60)));
        } catch {
          setCaptureInterval('');
        }
      } catch (err: any) {
        setError(err?.message ?? 'No se pudo cargar el detalle');
      }
    };
    if (userId) load();
  }, [userId]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateUser(user.id, {
        role: user.role,
        status: user.status as 'active' | 'disabled',
        canViewOwnHistory: user.canViewOwnHistory,
      });
      if (captureInterval) {
        await setCapturePolicy(user.id, Number(captureInterval) * 60);
      }
      await logAudit({
        action: 'user.config.update',
        entity: 'user',
        entityId: user.id,
        metadata: { captureInterval },
      });
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    const timeRows = time.map((entry) => [entry.id, entry.startedAt, entry.endedAt ?? '']);
    const activityRows = activity.map((event) => [
      event.id,
      event.startedAt,
      event.endedAt,
      event.appName,
      event.windowTitle ?? '',
      event.url ?? '',
      event.idle ? 'idle' : 'active',
    ]);

    downloadCsv(`time-${userId}.csv`, [['id', 'startedAt', 'endedAt'], ...timeRows]);
    downloadCsv(
      `activity-${userId}.csv`,
      [['id', 'startedAt', 'endedAt', 'appName', 'windowTitle', 'url', 'state'], ...activityRows],
    );

    await logAudit({
      action: 'export.csv',
      entity: 'user',
      entityId: userId,
      metadata: { timeRows: timeRows.length, activityRows: activityRows.length },
    });
  };

  return (
    <div className="fade-in">
      <header className={styles.topbar}>
        <div>
          <h1 className={styles.topbarTitle}>{user ? user.name : 'Empleado'}</h1>
          <p className={styles.topbarMeta}>{user?.email ?? 'Cargando datos...'}</p>
        </div>
        <div className={styles.cards}>
          <button className={styles.navItem} onClick={handleExport}>
            Exportar CSV
          </button>
          <button className={styles.navItem} onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </header>

      {error ? <p className={styles.topbarMeta}>{error}</p> : null}

      <section className={styles.panel}>
        <h2 className={styles.topbarTitle}>Configuraci�n</h2>
        <div className={styles.cards}>
          <label className={styles.formRow}>
            Rol
            <select
              className={styles.formInput}
              value={user?.role ?? 'employee'}
              onChange={(e) => user && setUser({ ...user, role: e.target.value })}
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.formRow}>
            Estado
            <select
              className={styles.formInput}
              value={user?.status ?? 'active'}
              onChange={(e) => user && setUser({ ...user, status: e.target.value })}
            >
              <option value="active">Activo</option>
              <option value="disabled">Desactivado</option>
            </select>
          </label>
          <label className={styles.formRow}>
            Historial propio
            <input
              type="checkbox"
              checked={user?.canViewOwnHistory ?? false}
              onChange={(e) => user && setUser({ ...user, canViewOwnHistory: e.target.checked })}
            />
          </label>
          <label className={styles.formRow}>
            Capturas (min)
            <input
              className={styles.formInput}
              type="number"
              min={1}
              max={60}
              value={captureInterval}
              onChange={(e) => setCaptureInterval(e.target.value)}
              placeholder="Ej. 10"
            />
          </label>
        </div>
      </section>

      <section className={styles.grid}>
        <div className={styles.panel}>
          <h2 className={styles.topbarTitle}>�ltimas 24h</h2>
          <p className={styles.topbarMeta}>Registros horarios recientes.</p>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Inicio</th>
                <th>Fin</th>
              </tr>
            </thead>
            <tbody>
              {time.map((entry) => (
                <tr key={entry.id}>
                  <td>{new Date(entry.startedAt).toLocaleString('es-ES')}</td>
                  <td>{entry.endedAt ? new Date(entry.endedAt).toLocaleString('es-ES') : 'En curso'}</td>
                </tr>
              ))}
              {time.length === 0 ? (
                <tr>
                  <td colSpan={2}>No hay registros.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className={styles.panel}>
          <h2 className={styles.topbarTitle}>Actividad</h2>
          <p className={styles.topbarMeta}>Apps, ventanas y URLs detectadas.</p>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>App</th>
                <th>Ventana</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {activity.slice(0, 8).map((event) => (
                <tr key={event.id}>
                  <td>{event.appName}</td>
                  <td>{event.windowTitle || event.url || '-'}</td>
                  <td>
                    <span className={styles.tag}>{event.idle ? 'Idle' : 'Activo'}</span>
                  </td>
                </tr>
              ))}
              {activity.length === 0 ? (
                <tr>
                  <td colSpan={3}>No hay actividad registrada.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.topbarTitle}>Capturas recientes</h2>
        <p className={styles.topbarMeta}>Solo se muestran si hay URL p�blica configurada.</p>
        <div className={styles.cards}>
          {screenshots.slice(0, 6).map((shot) => (
            <div key={shot.id} className={styles.card}>
              <div className={styles.topbarMeta}>{new Date(shot.takenAt).toLocaleString('es-ES')}</div>
              {shot.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shot.url} alt="captura" style={{ width: '100%', marginTop: 12, borderRadius: 12 }} />
              ) : (
                <div className={styles.topbarMeta}>Sin URL p�blica</div>
              )}
            </div>
          ))}
          {screenshots.length === 0 ? <p className={styles.topbarMeta}>No hay capturas.</p> : null}
        </div>
      </section>
    </div>
  );
}
