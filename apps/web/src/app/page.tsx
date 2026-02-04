import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.hero}>
      <div className="container">
        <span className="badge">MVP listo para escalar</span>
        <div className={styles.heroGrid}>
          <div>
            <h1 className={styles.heroTitle}>
              Control horario y actividad con claridad, no con ruido.
            </h1>
            <p className={styles.heroCopy}>
              Gestiona equipos distribuidos, registra tiempos y revisa actividad con políticas de
              retención configurables. Diseñado para empresas españolas que necesitan orden y
              cumplimiento desde el primer día.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} href="/login">
                Entrar al panel
              </Link>
              <Link className={styles.secondaryButton} href="/dashboard">
                Ver demo del admin
              </Link>
            </div>
          </div>
          <div className={styles.panel}>
            <div className={styles.panelTitle}>Panel Admin</div>
            <div className={styles.panelHeadline}>Visión unificada por empleado</div>
            <p className={styles.heroCopy}>
              Capturas, apps y registros horarios en un solo timeline. Marca inactividad a los 3
              minutos y ajusta la frecuencia por usuario.
            </p>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statValue}>15 días</div>
                <div className={styles.statLabel}>Retención capturas</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>1-60 min</div>
                <div className={styles.statLabel}>Frecuencia configurable</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>3 min</div>
                <div className={styles.statLabel}>Detección idle</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
