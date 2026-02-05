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

function formatDuration(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return '0m';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('es-ES');
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

  const sessions = time.map((entry) => {
    const start = new Date(entry.startedAt);
    const end = entry.endedAt ? new Date(entry.endedAt) : new Date();
    const events = activity
      .filter((event) => {
        const startedAt = new Date(event.startedAt);
        return startedAt >= start && startedAt <= end;
      })
      .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

    const shots = screenshots
      .filter((shot) => {
        const takenAt = new Date(shot.takenAt);
        return takenAt >= start && takenAt <= end;
      })
      .sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime());

    const lastEvent = events.length ? events[events.length - 1] : null;
    const duration = formatDuration(end.getTime() - start.getTime());

    return {
      ...entry,
      start,
      end,
      duration,
      events,
      shots,
      lastEvent,
    };
  });

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
        <h2 className={styles.topbarTitle}>Configuracion</h2>
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

      <section className={styles.panel} style={{ marginTop: 20 }}>
        <h2 className={styles.topbarTitle}>Sesiones (ultimas 24h)</h2>
        <p className={styles.topbarMeta}>Cada sesion incluye actividad y capturas dentro del horario.</p>

        {sessions.map((session) => (
          <details key={session.id} className={styles.sessionCard}>
            <summary className={styles.sessionSummary}>
              <div>
                <div className={styles.sessionTitle}>
                  {formatDateTime(session.startedAt)}
                  {session.endedAt ? ` - ${formatDateTime(session.endedAt)}` : ' - En curso'}
                </div>
                <div className={styles.sessionMeta}>Duracion: {session.duration}</div>
              </div>
              <div className={styles.sessionMeta}>
                {session.lastEvent
                  ? session.lastEvent.idle
                    ? 'Idle'
                    : 'Activo'
                  : 'Sin actividad'}
              </div>
            </summary>

            <div className={styles.sessionStats}>
              <div className={styles.card}>
                <div className={styles.cardLabel}>Eventos</div>
                <div className={styles.cardValue}>{session.events.length}</div>
              </div>
              <div className={styles.card}>
                <div className={styles.cardLabel}>Capturas</div>
                <div className={styles.cardValue}>{session.shots.length}</div>
              </div>
              <div className={styles.card}>
                <div className={styles.cardLabel}>Ultima app</div>
                <div className={styles.cardValue}>{session.lastEvent?.appName ?? 'N/D'}</div>
              </div>
            </div>

            <div className={styles.sessionDetails}>
              <div className={styles.panel}>
                <h3 className={styles.sessionTitle}>Actividad</h3>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Inicio</th>
                      <th>Fin</th>
                      <th>App</th>
                      <th>Ventana / URL</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {session.events.map((event) => (
                      <tr key={event.id}>
                        <td>{formatDateTime(event.startedAt)}</td>
                        <td>{formatDateTime(event.endedAt)}</td>
                        <td>{event.appName}</td>
                        <td>{event.windowTitle || event.url || '-'}</td>
                        <td>
                          <span className={styles.tag}>{event.idle ? 'Idle' : 'Activo'}</span>
                        </td>
                      </tr>
                    ))}
                    {session.events.length === 0 ? (
                      <tr>
                        <td colSpan={5}>No hay actividad en esta sesion.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div className={styles.panel}>
                <h3 className={styles.sessionTitle}>Capturas</h3>
                <div className={styles.shotsGrid}>
                  {session.shots.map((shot) => (
                    <div key={shot.id} className={styles.shotCard}>
                      <div className={styles.sessionMeta}>{formatDateTime(shot.takenAt)}</div>
                      {shot.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={shot.url} alt="captura" style={{ width: '100%', marginTop: 10, borderRadius: 10 }} />
                      ) : (
                        <div className={styles.sessionMeta}>Sin URL publica</div>
                      )}
                    </div>
                  ))}
                  {session.shots.length === 0 ? <p className={styles.sessionMeta}>No hay capturas.</p> : null}
                </div>
              </div>
            </div>
          </details>
        ))}

        {sessions.length === 0 ? <p className={styles.topbarMeta}>No hay sesiones registradas.</p> : null}
      </section>
    </div>
  );
}
