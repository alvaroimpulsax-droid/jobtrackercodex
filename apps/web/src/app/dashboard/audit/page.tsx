'use client';

import { useEffect, useState } from 'react';
import styles from '../layout.module.css';
import { getAudit } from '@/lib/api';

type AuditRow = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  createdAt: string;
  metadata: any;
};

export default function AuditPage() {
  const [items, setItems] = useState<AuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAudit(undefined, undefined, 200);
        setItems(data);
      } catch (err: any) {
        setError(err?.message ?? 'No se pudo cargar auditoría');
      }
    };
    load();
  }, []);

  return (
    <div className="fade-in">
      <header className={styles.topbar}>
        <div>
          <h1 className={styles.topbarTitle}>Auditoría</h1>
          <p className={styles.topbarMeta}>Registro de acciones administrativas.</p>
        </div>
      </header>

      {error ? <p className={styles.topbarMeta}>{error}</p> : null}

      <section className={styles.panel}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Acción</th>
              <th>Entidad</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id}>
                <td>{new Date(row.createdAt).toLocaleString('es-ES')}</td>
                <td>{row.action}</td>
                <td>{row.entity}</td>
                <td className={styles.topbarMeta}>{row.entityId ?? '-'}</td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={4}>No hay eventos aún.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
