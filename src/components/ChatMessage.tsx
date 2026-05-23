import { motion } from 'framer-motion';
import type { ChatMessage as ChatMessageType, FieldEntry, FieldType } from '../store/useAppStore';
import styles from './ChatMessage.module.css';

/* ──── Field type → icon ──── */
const ICON_MAP: Record<FieldType, string> = {
  location: '📍',
  datetime: '🕒',
  documents: '📄',
  contact: '📞',
  cost: '💲',
  eligibility: '✅',
  person: '👤',
  step: '➡️',
  note: '📝',
};

/* ──── Build interactive href for clickable field types ──── */
function getFieldHref(type: FieldType, value: string): string | null {
  if (type === 'location') {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`;
  }
  if (type === 'contact') {
    // Strip everything except digits, +, and extension marker
    const tel = value.replace(/[^\d+;,]/g, '');
    if (tel.length >= 3) return `tel:${tel}`;
  }
  return null;
}

/* ──── DynamicFieldList ──── */
function DynamicFieldList({ fields }: { fields: FieldEntry[] }) {
  return (
    <div className={styles.bulletList}>
      {fields.map((f, i) => {
        const href = getFieldHref(f.type, f.value);
        const content = (
          <>
            <div className={styles.bulletIcon}>{ICON_MAP[f.type] || '📌'}</div>
            <div className={styles.bulletText}>
              <span className={styles.bulletLabel}>{f.label}</span>
              <span className={`${styles.bulletValue} ${href ? styles.bulletValueLink : ''}`}>
                {f.value}
                {href && <span className={styles.bulletLinkHint}>{f.type === 'location' ? ' ↗' : ''}</span>}
              </span>
            </div>
          </>
        );

        const MotionWrap = motion.div;
        const animProps = {
          initial: { opacity: 0, x: -12 },
          animate: { opacity: 1, x: 0 },
          transition: { duration: 0.35, delay: i * 0.07 },
        };

        if (href) {
          return (
            <MotionWrap
              key={i}
              className={`${styles.bulletItem} ${styles.bulletItemClickable}`}
              {...animProps}
              onClick={() => window.open(href, '_blank', 'noopener,noreferrer')}
              role="link"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') window.open(href, '_blank', 'noopener,noreferrer');
              }}
            >
              {content}
            </MotionWrap>
          );
        }

        return (
          <MotionWrap key={i} className={styles.bulletItem} {...animProps}>
            {content}
          </MotionWrap>
        );
      })}
    </div>
  );
}

/* ──── Typing Indicator ──── */
export function TypingIndicator() {
  return (
    <motion.div
      className={styles.typingWrap}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <div className={styles.typingDot} />
      <div className={styles.typingDot} />
      <div className={styles.typingDot} />
    </motion.div>
  );
}

/* ──── Props ──── */
interface ChatMessageProps {
  msg: ChatMessageType;
  onAction?: (prompt: string) => void;
}

/* ──── Main Component ──── */
export default function ChatMessage({ msg, onAction }: ChatMessageProps) {
  if (msg.role === 'user') {
    return (
      <motion.div
        className={styles.userBubble}
        initial={{ opacity: 0, y: 10, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {msg.content}
        {msg.attachments && msg.attachments.length > 0 && (
          <div className={styles.userAttachments}>
            {msg.attachments.map((a, i) => (
              <span key={i} className={styles.userAttachChip}>📎 {a.name}</span>
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  /* Assistant bubble */
  const res = msg.aiResponse;
  if (!res) return null;

  return (
    <motion.div
      className={styles.aiBubble}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className={styles.aiReply}>{res.reply}</div>

      {res.fields && res.fields.length > 0 && (
        <DynamicFieldList fields={res.fields} />
      )}

      {res.actions && res.actions.length > 0 && (
        <div className={styles.actions}>
          {res.actions.map((a, i) => (
            <button
              key={i}
              className={styles.actionBtn}
              onClick={() => onAction?.(a.prompt)}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
