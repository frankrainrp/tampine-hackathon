import { motion } from 'framer-motion';
import styles from '../ChatMessage.module.css';

interface RouteStep {
  step: number;
  title: string;
  desc: string;
}

export default function RouteCard({ data }: { data: { routes?: RouteStep[] } }) {
  const routes = data.routes || [];
  if (routes.length === 0) return null;

  return (
    <motion.div
      className={styles.routeCard}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <div className={styles.routeTitle}>🗺️ Route Plan</div>
      <div className={styles.routeSteps}>
        {routes.map((r, i) => (
          <div key={r.step} className={styles.routeStep}>
            <div className={styles.routeStepNum}>{r.step}</div>
            {i < routes.length - 1 && <div className={styles.routeStepLine} />}
            <div className={styles.routeStepContent}>
              <span className={styles.routeStepTitle}>{r.title}</span>
              <span className={styles.routeStepDesc}>{r.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
