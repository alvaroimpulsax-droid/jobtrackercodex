'use client';

import { useEffect, useState } from 'react';
import styles from '../layout.module.css';
import formStyles from './policies.module.css';
import { getRetention, updateRetention } from '@/lib/api';

export default function PoliciesPage() {
  const [timeRetention, setTimeRetention] = useState<string>('');
  const [activityRetention, setActivityRetention] = useState<string>('');
  const [screenshotRetention, setScreenshotRetention] = useState<string>('15');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const policy = await getRetention();
        setTimeRetention(policy.timeRetentionDays?.toString() ?? '');
        setActivityRetention(policy.activityRetentionDays?.toString() ?? '');
        setScreenshotRetention(policy.screenshotRetentionDays?.toString() ?? '15');
      } catch (err: any) {
        setMessage(err?.message ?? 'No se pudo cargar políticas');
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setMessage(null);
    await updateRetention({
      timeRetentionDays: timeRetention ? Number(timeRetention) : null,
      activityRetentionDays: activityRetention ? Number(activityRetention) : null,
      screenshotRetentionDays: screenshotRetention ? Number(screenshotRetention) : null,
    });
    setMessage('Políticas actualizadas');
  };

  return (
    <div className="fade-in">
      <header className={styles.topbar}>
        <div>
          <h1 className={styles.topbarTitle}>Políticas de retención</h1>
          <p className={styles.topbarMeta}>Configura cuánto tiempo se guardan los datos.</p>
        </div>
      </header>

      <section className={styles.panel}>
        <h2 className={styles.topbarTitle}>Retención por defecto</h2>
        <p className={styles.topbarMeta}>
          Deja vacío para retención indefinida (según tu política interna).
        </p>
        <form className={formStyles.form} onSubmit={(e) => e.preventDefault()}>
          <label className={formStyles.field}>
            Registros horarios (días)
            <input
              className={formStyles.input}
              type="number"
              min={1}
              max={3650}
              value={timeRetention}
              onChange={(e) => setTimeRetention(e.target.value)}
              placeholder="Indefinido"
            />
          </label>
          <label className={formStyles.field}>
            Actividad (días)
            <input
              className={formStyles.input}
              type="number"
              min={1}
              max={3650}
              value={activityRetention}
              onChange={(e) => setActivityRetention(e.target.value)}
              placeholder="Indefinido"
            />
          </label>
          <label className={formStyles.field}>
            Capturas (días)
            <input
              className={formStyles.input}
              type="number"
              min={1}
              max={3650}
              value={screenshotRetention}
              onChange={(e) => setScreenshotRetention(e.target.value)}
            />
          </label>
          <div className={formStyles.actions}>
            <button className={formStyles.save} type="button" onClick={handleSave}>
              Guardar cambios
            </button>
          </div>
        </form>
        {message ? <p className={styles.topbarMeta}>{message}</p> : null}
      </section>
    </div>
  );
}
