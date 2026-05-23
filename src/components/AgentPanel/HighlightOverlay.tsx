import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './AgentPanel.module.css';

interface Props {
  /** CSS selector or data-agent-id value (without the `[data-agent-id="..."]` wrapper) */
  target: string | null;
  /** Container element to measure relative to. Highlight will be positioned absolute inside it. */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Optional short label shown above the highlight box */
  label?: string;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function HighlightOverlay({ target, containerRef, label }: Props) {
  const [rect, setRect] = useState<Rect | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!target || !containerRef.current) {
      setRect(null);
      return;
    }

    const measure = () => {
      const container = containerRef.current;
      if (!container) return;

      // Resolve target: first try as data-agent-id, then as raw selector
      let el: HTMLElement | null = container.querySelector(`[data-agent-id="${target}"]`);
      if (!el) {
        try { el = container.querySelector(target); } catch { el = null; }
      }
      if (!el) {
        setRect(null);
        return;
      }

      const containerBox = container.getBoundingClientRect();
      const targetBox = el.getBoundingClientRect();

      setRect({
        top: targetBox.top - containerBox.top,
        left: targetBox.left - containerBox.left,
        width: targetBox.width,
        height: targetBox.height,
      });
    };

    // Initial measure + retry after a tick (animation/layout may not be settled)
    measure();
    const t1 = setTimeout(measure, 60);
    const t2 = setTimeout(measure, 250);

    // Keep tracking while target is visible (in case of scroll / layout shift)
    const tick = () => {
      measure();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, containerRef]);

  return (
    <AnimatePresence>
      {rect && (
        <motion.div
          key={target}
          className={styles.highlight}
          style={{
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
          }}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ duration: 0.2 }}
        >
          {label && <div className={styles.highlightLabel}>{label}</div>}
          <motion.div
            className={styles.scanLine}
            initial={{ top: 0 }}
            animate={{ top: rect.height }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
