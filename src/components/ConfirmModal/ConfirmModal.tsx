import { motion, AnimatePresence } from 'framer-motion';
import styles from './ConfirmModal.module.css';

export interface ConfirmField {
  label: string;
  value: string;
  highlight?: boolean;
}

interface Props {
  open: boolean;
  title: string;
  subtitle?: string;
  fields: ConfirmField[];
  onYes: () => void;
  onNo: () => void;
}

export default function ConfirmModal({ open, title, subtitle, fields, onYes, onNo }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className={styles.modal}
            initial={{ scale: 0.92, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95 }}
            transition={{ type: 'spring', damping: 22, stiffness: 220 }}
          >
            <div className={styles.icon}>⚠️</div>
            <h2 className={styles.title}>{title}</h2>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}

            <div className={styles.summary}>
              {fields.map((f, i) => (
                <div key={i} className={styles.row}>
                  <span className={styles.rowLabel}>{f.label}</span>
                  <span
                    className={`${styles.rowValue} ${f.highlight ? styles.rowValueHighlight : ''}`}
                  >
                    {f.value}
                  </span>
                </div>
              ))}
            </div>

            <div className={styles.actions}>
              <button className={styles.btnYes} onClick={onYes} autoFocus>
                ✓ Yes, submit now
              </button>
              <button className={styles.btnNo} onClick={onNo}>
                No, let me check
              </button>
            </div>

            <div className={styles.privacy}>
              <span>🔒</span>
              <span>Your data is encrypted on this device.</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
