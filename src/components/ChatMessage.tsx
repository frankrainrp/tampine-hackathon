import { useState } from 'react';
import { motion } from 'framer-motion';
import type { ChatMessage as ChatMessageType, FieldEntry, FieldType, PrepItem } from '../store/useAppStore';
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

function getFieldHref(type: FieldType, value: string): string | null {
  if (type === 'location') {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`;
  }
  if (type === 'contact') {
    const tel = value.replace(/[^\d+;,]/g, '');
    if (tel.length >= 3) return `tel:${tel}`;
  }
  return null;
}

function DynamicFieldList({ fields }: { fields: FieldEntry[] }) {
  return (
    <div className={styles.bulletList}>
      {fields.map((f, i) => {
        const href = getFieldHref(f.type, f.value);
        const inner = (
          <>
            <div className={styles.bulletIcon}>{ICON_MAP[f.type] || '📌'}</div>
            <div className={styles.bulletText}>
              <span className={styles.bulletLabel}>{f.label}</span>
              <span className={`${styles.bulletValue} ${href ? styles.bulletValueLink : ''}`}>
                {f.value}
                {href && f.type === 'location' && <span className={styles.bulletLinkHint}> ↗</span>}
              </span>
            </div>
          </>
        );
        const animProps = {
          initial: { opacity: 0, x: -12 },
          animate: { opacity: 1, x: 0 },
          transition: { duration: 0.32, delay: i * 0.06 },
        };
        if (href) {
          return (
            <motion.div
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
              {inner}
            </motion.div>
          );
        }
        return (
          <motion.div key={i} className={styles.bulletItem} {...animProps}>
            {inner}
          </motion.div>
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

/* ──── Agent — Prep List ──── */
function AgentPrepListCard({
  title,
  items,
  confirmed,
  cancelled,
  onConfirm,
  onCancel,
}: {
  title?: string;
  items: PrepItem[];
  confirmed: boolean;
  cancelled: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const decided = confirmed || cancelled;

  return (
    <motion.div
      className={styles.prepCard}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35 }}
    >
      <div className={styles.prepHeader}>
        <div className={styles.prepIcon}>📋</div>
        <div className={styles.prepTitle}>{title || "Before we begin, you'll need:"}</div>
      </div>

      <div className={styles.prepList}>
        {items.map((item, i) => (
          <motion.div
            key={i}
            className={styles.prepItem}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.08 }}
          >
            <div className={styles.prepItemIcon}>{item.icon}</div>
            <div className={styles.prepItemText}>
              <div className={styles.prepItemLabel}>{item.label}</div>
              <div className={styles.prepItemDesc}>{item.desc}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {!decided ? (
        <div className={styles.prepActions}>
          <button className={styles.prepBtnConfirm} onClick={onConfirm}>
            ✓ Yes, I have everything
          </button>
          <button className={styles.prepBtnCancel} onClick={onCancel}>
            Let me check first
          </button>
        </div>
      ) : (
        <div className={styles.prepDecided}>
          {confirmed ? '✓ Ready — agent starting...' : '✕ Cancelled. Tell me when you\'re ready.'}
        </div>
      )}
    </motion.div>
  );
}

/* ──── Agent — Started ──── */
function AgentStartedCard({ title }: { title?: string }) {
  return (
    <motion.div
      className={styles.agentStarted}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.agentStartedIcon}>
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
        >
          ⚙️
        </motion.span>
      </div>
      <div>
        <div className={styles.agentStartedTitle}>{title || 'AI Agent Started'}</div>
        <div className={styles.agentStartedSub}>Watch the right panel — I&apos;m handling this for you.</div>
      </div>
    </motion.div>
  );
}

/* ──── Agent — Ask User ──── */
function AgentAskCard({
  field,
  prompt,
  answered,
  answer,
  maskedToken,
  maskedDisplay,
  onSubmit,
}: {
  field: string;
  prompt: string;
  answered: boolean;
  answer?: string;
  maskedToken?: string;
  maskedDisplay?: string;
  onSubmit: (v: string) => void;
}) {
  const [value, setValue] = useState(answer || '');

  if (answered) {
    const showMask = Boolean(maskedDisplay && maskedToken);
    return (
      <motion.div
        className={`${styles.agentAskAnswered} ${showMask ? styles.agentAskAnsweredMasked : ''}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <span className={styles.agentAskField}>{field}</span>
        <span className={styles.agentAskValue}>
          {showMask ? maskedDisplay : answer}
        </span>
        {showMask && (
          <span className={styles.agentAskLock} title={`Cloud only sees ${maskedToken}`}>
            🔒 encrypted
          </span>
        )}
        <span className={styles.agentAskCheck}>✓</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={styles.agentAsk}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.agentAskHeader}>
        <span className={styles.agentAskPulse} />
        <span className={styles.agentAskLabel}>Input needed — {field}</span>
      </div>
      <div className={styles.agentAskPrompt}>{prompt}</div>
      <form
        className={styles.agentAskForm}
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) onSubmit(value.trim());
        }}
      >
        <input
          autoFocus
          className={styles.agentAskInput}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`Enter ${field}...`}
        />
        <button
          className={styles.agentAskBtn}
          type="submit"
          disabled={!value.trim()}
        >
          Send
        </button>
      </form>
    </motion.div>
  );
}

/* ──── Agent — Done ──── */
function AgentDoneCard({
  title,
  summary,
  caseId,
}: {
  title?: string;
  summary?: string;
  caseId?: string;
}) {
  const isCancelled = title === 'Cancelled' || (!caseId && (title || '').toLowerCase().includes('cancel'));

  return (
    <motion.div
      className={`${styles.agentDone} ${isCancelled ? styles.agentDoneCancelled : ''}`}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        className={`${styles.agentDoneIcon} ${isCancelled ? styles.agentDoneIconCancelled : ''}`}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.15, type: 'spring', damping: 12 }}
      >
        {isCancelled ? '✕' : '✓'}
      </motion.div>
      <div className={styles.agentDoneTitle}>
        {title || (isCancelled ? 'Cancelled' : 'Application Submitted')}
      </div>
      {summary && <div className={styles.agentDoneSummary}>{summary}</div>}
      {caseId && !isCancelled && (
        <div className={styles.agentDoneCaseBox}>
          <span className={styles.agentDoneCaseLabel}>CASE REFERENCE</span>
          <span className={styles.agentDoneCaseId}>{caseId}</span>
        </div>
      )}
    </motion.div>
  );
}

/* ──── Props ──── */
interface ChatMessageProps {
  msg: ChatMessageType;
  onAction?: (prompt: string) => void;
  onAgentAnswer?: (msgId: string, answer: string) => void;
  onPrepConfirm?: (msgId: string) => void;
  onPrepCancel?: (msgId: string) => void;
}

/* ──── Main Component ──── */
export default function ChatMessage({ msg, onAction, onAgentAnswer, onPrepConfirm, onPrepCancel }: ChatMessageProps) {
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

  /* ── Agent messages ── */
  if (msg.agent) {
    if (msg.agent.kind === 'prep_list') {
      return (
        <AgentPrepListCard
          title={msg.agent.title}
          items={msg.agent.items || []}
          confirmed={Boolean(msg.agent.confirmed)}
          cancelled={Boolean(msg.agent.cancelled)}
          onConfirm={() => onPrepConfirm?.(msg.id)}
          onCancel={() => onPrepCancel?.(msg.id)}
        />
      );
    }
    if (msg.agent.kind === 'started') {
      return <AgentStartedCard title={msg.agent.title} />;
    }
    if (msg.agent.kind === 'ask_user') {
      return (
        <AgentAskCard
          field={msg.agent.field || 'Information'}
          prompt={msg.agent.prompt || ''}
          answered={Boolean(msg.agent.answer)}
          answer={msg.agent.answer}
          maskedToken={msg.agent.maskedToken}
          maskedDisplay={msg.agent.maskedDisplay}
          onSubmit={(v) => onAgentAnswer?.(msg.id, v)}
        />
      );
    }
    if (msg.agent.kind === 'done') {
      return (
        <AgentDoneCard
          title={msg.agent.title}
          summary={msg.agent.summary}
          caseId={msg.agent.caseId}
        />
      );
    }
  }

  /* ── Standard AI reply ── */
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

      {res.fields && res.fields.length > 0 && <DynamicFieldList fields={res.fields} />}

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
