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

/* ──── Action ID → Prompt 映射 ──── */
function actionIdToPrompt(actionId: string, label: string): string {
  // 将 snake_case 的 action_id 转为自然语言 prompt
  const promptMap: Record<string, string> = {
    start_inquiry: '我想开始咨询，请告诉我详细的服务流程和所需材料',
    check_status: '请帮我查询当前的申请状态和进度',
    start_service: '我想开始办理这项服务，请告诉我详细步骤',
    get_details: '请提供更详细的信息和具体说明',
    book_appointment: '我想预约办理时间，请告诉我可选时段',
    submit_application: '我想提交申请，请告诉我需要准备哪些材料',
    view_requirements: '请列出办理这项业务的所有要求和条件',
    contact_support: '我需要人工客服帮助，请提供联系方式',
    download_form: '请提供需要下载的表格和文件链接',
    track_progress: '请帮我追踪办理进度',
    get_directions: '请告诉我办理地点的具体地址和交通方式',
    learn_more: '我想了解更多相关信息',
    apply_now: '我现在想申请，请引导我完成申请流程',
    view_fees: '请告诉我办理费用和缴费方式',
    check_eligibility: '请帮我检查我是否符合申请条件',
  };

  return promptMap[actionId] || `${label}：请提供更详细的信息和操作指引`;
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

