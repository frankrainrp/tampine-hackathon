import { useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './AgentPanel.module.css';
import CdcVoucher from '../../mock/CdcVoucher/CdcVoucher';
import HighlightOverlay from './HighlightOverlay';

export type MockSiteId = 'cdc-voucher';

interface Props {
  open: boolean;
  site: MockSiteId | null;
  narration: string;
  highlightTarget: string | null;
  highlightLabel?: string;
  onClose: () => void;
  onCaseCreated?: (caseId: string) => void;
  stageRef: React.RefObject<HTMLDivElement | null>;
  /** Current width in pixels (lifted to parent so chat area can react) */
  width: number;
  /** Setter for the lifted width */
  onWidthChange: (w: number) => void;
}

const MIN_WIDTH = 360;
const MAX_WIDTH_RATIO = 0.78; // never exceed 78% of viewport

export default function AgentPanel({
  open,
  site,
  narration,
  highlightTarget,
  highlightLabel,
  onClose,
  onCaseCreated,
  stageRef,
  width,
  onWidthChange,
}: Props) {
  const fallbackRef = useRef<HTMLDivElement | null>(null);
  const containerRef = stageRef || fallbackRef;
  const dragStateRef = useRef<{ startX: number; startW: number } | null>(null);

  /* ── Drag-to-resize on left edge ── */
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const s = dragStateRef.current;
      if (!s) return;
      // dragging left → width grows; dragging right → shrinks
      const delta = s.startX - e.clientX;
      const next = s.startW + delta;
      const max = Math.floor(window.innerWidth * MAX_WIDTH_RATIO);
      const clamped = Math.min(max, Math.max(MIN_WIDTH, next));
      onWidthChange(clamped);
    },
    [onWidthChange],
  );

  const handleMouseUp = useCallback(() => {
    dragStateRef.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragStateRef.current = { startX: e.clientX, startW: width };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [width, handleMouseMove, handleMouseUp],
  );

  /* Cleanup on unmount */
  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          className={styles.panel}
          style={{ width: `${width}px` }}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 220 }}
        >
          {/* drag handle — left edge */}
          <div
            className={styles.dragHandle}
            onMouseDown={handleMouseDown}
            title="Drag to resize"
            aria-label="Resize panel"
          >
            <div className={styles.dragHandleGrip} />
          </div>

          <div className={styles.panelHeader}>
            <div className={styles.statusBadge}>
              <span className={styles.statusDot} />
              AI AGENT ACTIVE
            </div>
            <div className={styles.narration}>{narration}</div>
            <button
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close agent panel"
            >
              <svg viewBox="0 0 24 24"><path d="M19 6.4L17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z" /></svg>
            </button>
          </div>

          <div className={styles.stageWrap}>
            <div ref={containerRef} className={styles.stage}>
              {site === 'cdc-voucher' && <CdcVoucher onCaseCreated={onCaseCreated} />}
              <HighlightOverlay
                target={highlightTarget}
                containerRef={containerRef}
                label={highlightLabel}
              />
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
