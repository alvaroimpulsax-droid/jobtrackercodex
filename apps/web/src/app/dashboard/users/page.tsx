'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from '../layout.module.css';
import { createUser, getUsers } from '@/lib/api';

const roles = ['owner', 'admin', 'manager', 'employee', 'auditor'];

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  canViewOwnHistory: boolean;
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
    canViewOwnHistory: false,
  });

  const load = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    setError(null);
    try {
      await createUser(form);
      setForm({ name: '', email: '', password: '', role: 'employee', canViewOwnHistory: false });
      setShowForm(false);
      await load();
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo crear usuario');
    }
  };

  return (
    <div className="fade-in">
      <header className={styles.topbar}>
        <div>
          <h1 className={styles.topbarTitle}>Empleados</h1>
          <p className={styles.topbarMeta}>Gestiona permisos y frecuencia de capturas.</p>
        </div>
        <button className={styles.navItem} onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cerrar' : 'Nuevo empleado'}
        </button>
      </header>

      {showForm ? (
        <section className={styles.panel}>
          <h2 className={styles.topbarTitle}>Alta de empleado</h2>
          <div className={styles.cards}>
            <label className={styles.formRow}>
              Nombre
              <input
                className={styles.formInput}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className={styles.formRow}>
              Email
              <input
                className={styles.formInput}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label className={styles.formRow}>
              Contrasena
              <input
                className={styles.formInput}
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </label>
            <label className={styles.formRow}>
              Rol
              <select
                className={styles.formInput}
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.formRow}>
              Historial propio
              <input
                type="checkbox"
                checked={form.canViewOwnHistory}
                onChange={(e) => setForm({ ...form, canViewOwnHistory: e.target.checked })}
              />
            </label>
            <button className={styles.navItem} onClick={handleCreate}>
              Crear
            </button>
          </div>
        </section>
      ) : null}

      {error ? <p className={styles.topbarMeta}>{error}</p> : null}

      <section className={styles.panel}>
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
                  <div>
                    <Link href={`/dashboard/users/${user.id}`}>{user.name}</Link>
                  </div>
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
