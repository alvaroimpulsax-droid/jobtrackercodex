'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './login.module.css';
import { login, setTokens } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await login(email, password, tenantId || undefined);
      setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.message ?? 'Error de login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.login}>
      <section className={`${styles.card} fade-in`}>
        <span className="badge">Acceso seguro</span>
        <h1 className={styles.title}>Acceso al panel</h1>
        <p className={styles.subtitle}>Introduce tus credenciales para continuar.</p>
        <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
          <label className={styles.field}>
            Email
            <input
              className={styles.input}
              type="email"
              placeholder="admin@empresa.es"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            Contraseña
            <input
              className={styles.input}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            Tenant ID (si aplica)
            <input
              className={styles.input}
              type="text"
              placeholder="Opcional"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
            />
          </label>
          {error ? <div className={styles.hint}>{error}</div> : null}
          <button className={styles.submit} type="button" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p className={styles.hint}>¿Primera vez? Usa el endpoint de bootstrap para crear tu tenant.</p>
        <p className={styles.hint}>
          <Link href="/">Volver al inicio</Link>
        </p>
      </section>
    </main>
  );
}
