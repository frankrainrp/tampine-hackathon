import { useState } from 'react';
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
  onSubmit,
}: {
  field: string;
  prompt: string;
  answered: boolean;
  answer?: string;
  onSubmit: (v: string) => void;
}) {
  const [value, setValue] = useState(answer || '');

  if (answered) {
    return (
      <motion.div
        className={styles.agentAskAnswered}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <span className={styles.agentAskField}>{field}</span>
        <span className={styles.agentAskValue}>{answer}</span>
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
function AgentDoneCard({ summary, caseId }: { summary?: string; caseId?: string }) {
  return (
    <motion.div
      className={styles.agentDone}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        className={styles.agentDoneIcon}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.15, type: 'spring', damping: 12 }}
      >
        ✓
      </motion.div>
      <div className={styles.agentDoneTitle}>Application Submitted</div>
      {summary && <div className={styles.agentDoneSummary}>{summary}</div>}
      {caseId && (
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
}

/* ──── Main Component ──── */
export default function ChatMessage({ msg, onAction, onAgentAnswer }: ChatMessageProps) {
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
          onSubmit={(v) => onAgentAnswer?.(msg.id, v)}
        />
      );
    }
    if (msg.agent.kind === 'done') {
      return <AgentDoneCard summary={msg.agent.summary} caseId={msg.agent.caseId} />;
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
