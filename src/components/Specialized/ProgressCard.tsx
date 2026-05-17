import { motion } from 'framer-motion';
import styles from '../ChatMessage.module.css';

export default function ProgressCard({ data }: { data: { progress?: number; status?: string } }) {
  const progress = data.progress ?? 0;
  const status = data.status ?? 'Processing';

  return (
    <motion.div
      className={styles.progressCard}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <div className={styles.progressTitle}>📊 Application Progress</div>
      <div className={styles.progressBarWrap}>
        <motion.div
          className={styles.progressBarFill}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>
      <div className={styles.progressStatus}>
        <span className={styles.progressPercent}>{progress}%</span> — {status}
      </div>
    </motion.div>
  );
}
