import { motion } from 'framer-motion';
import { lazy, Suspense } from 'react';
import type { ChatMessage as ChatMessageType, BulletPoint } from '../store/useAppStore';
import styles from './ChatMessage.module.css';

/* ──── 5W1H icon map ──── */
const ICON_MAP: Record<BulletPoint['icon'], string> = {
  who: '👤',
  what: '📋',
  when: '🕒',
  where: '📍',
  why: '❓',
  how: '🔧',
};

/* ──── Lazy-loaded special components ──── */
const RouteCard = lazy(() => import('./Specialized/RouteCard'));
const ProgressCard = lazy(() => import('./Specialized/ProgressCard'));

const SPECIAL_MAP: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
  RouteCard,
  ProgressCard,
};

/* ──── Action ID → Prompt mapping ──── */
function actionIdToPrompt(actionId: string, label: string): string {
  const promptMap: Record<string, string> = {
    start_inquiry: 'I would like to start an inquiry. Please tell me the detailed service process and required documents.',
    check_status: 'Please help me check the current application status and progress.',
    start_service: 'I want to start this service. Please guide me through the detailed steps.',
    get_details: 'Please provide more detailed information and specific instructions.',
    book_appointment: 'I would like to book an appointment. Please show me available time slots.',
    submit_application: 'I want to submit an application. What documents do I need to prepare?',
    view_requirements: 'Please list all the requirements and conditions for this service.',
    contact_support: 'I need human support. Please provide contact information.',
    download_form: 'Please provide the download links for required forms and documents.',
    track_progress: 'Please help me track the processing progress.',
    get_directions: 'Please tell me the address and directions to the service location.',
    learn_more: 'I would like to learn more about this topic.',
    apply_now: 'I want to apply now. Please guide me through the application process.',
    view_fees: 'Please tell me the fees and payment methods.',
    check_eligibility: 'Please help me check if I meet the eligibility requirements.',
  };

  return promptMap[actionId] || `${label}: Please provide more details and guidance.`;
}

/* ──── DynamicBulletList ──── */
function DynamicBulletList({ points }: { points: BulletPoint[] }) {
  return (
    <div className={styles.bulletList}>
      {points.map((bp, i) => (
        <motion.div
          key={i}
          className={styles.bulletItem}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: i * 0.07 }}
        >
          <div className={styles.bulletIcon}>{ICON_MAP[bp.icon] || '📌'}</div>
          <div className={styles.bulletText}>
            <span className={styles.bulletLabel}>{bp.label}</span>
            <span className={styles.bulletValue}>{bp.value}</span>
          </div>
        </motion.div>
      ))}
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
      {/* Reply text */}
      <div className={styles.aiReply}>{res.reply}</div>

      {/* Bullet points */}
      {res.bullet_points && res.bullet_points.length > 0 && (
        <DynamicBulletList points={res.bullet_points} />
      )}

      {/* Special components — lazy loaded */}
      {res.special_components && res.special_components.length > 0 && (
        <Suspense fallback={null}>
          {res.special_components.map((sc, i) => {
            const Comp = SPECIAL_MAP[sc.component_name];
            if (!Comp) return null;
            return <Comp key={i} data={sc.data} />;
          })}
        </Suspense>
      )}

      {/* Actions — now functional */}
      {res.actions && res.actions.length > 0 && (
        <div className={styles.actions}>
          {res.actions.map((a) => (
            <button
              key={a.action_id}
              className={styles.actionBtn}
              onClick={() => {
                const prompt = actionIdToPrompt(a.action_id, a.label);
                if (onAction) onAction(prompt);
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

