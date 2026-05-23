import styles from '../MomRenewal.module.css';
import type { MomRenewalState } from '../MomRenewal';

interface Props {
  state: MomRenewalState;
  update: (patch: Partial<MomRenewalState>) => void;
  onBack: () => void;
  onSubmit: () => void;
}

const PAYMENT_METHODS = [
  { id: 'paynow', icon: '🇸🇬', name: 'PayNow', desc: 'Instant transfer via NRIC/UEN' },
  { id: 'nets', icon: '💳', name: 'NETS', desc: 'Direct debit from bank account' },
  { id: 'card', icon: '💳', name: 'Credit / Debit Card', desc: 'Visa, Mastercard, AMEX' },
] as const;

export default function Step4Payment({ state, update, onBack, onSubmit }: Props) {
  const valid = state.paymentMethod !== '';

  return (
    <div data-agent-id="page-payment">
      <h1 className={styles.pageTitle}>Review & Payment</h1>
      <p className={styles.pageSubtitle}>
        Review your renewal details and select a payment method to complete the application.
      </p>

      <div className={styles.summary} data-agent-id="summary">
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Worker</span>
          <span className={styles.summaryValue}>{state.workerName || '—'}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>NRIC / FIN</span>
          <span className={styles.summaryValue}>{state.nric || '—'}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Current Pass No.</span>
          <span className={styles.summaryValue}>{state.passNumber || '—'}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>New Expiry</span>
          <span className={styles.summaryValue}>{state.newExpiry || '—'}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Renewal Fee</span>
          <span className={styles.summaryValue}>S$ 60.00</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Levy (1 month)</span>
          <span className={styles.summaryValue}>S$ 300.00</span>
        </div>
        <div className={styles.summaryTotal}>
          <span>Total Payable</span>
          <span>S$ 360.00</span>
        </div>
      </div>

      <div style={{ marginBottom: '0.6rem', fontSize: '0.82rem', fontWeight: 600, color: '#1a1a1a' }}>
        Select payment method
      </div>

      {PAYMENT_METHODS.map((m) => (
        <div
          key={m.id}
          className={`${styles.payOption} ${state.paymentMethod === m.id ? styles.payOptionSelected : ''}`}
          data-agent-id={`pay-${m.id}`}
          onClick={() => update({ paymentMethod: m.id })}
          role="button"
          tabIndex={0}
        >
          <span className={styles.payRadio} />
          <div className={styles.payIcon}>{m.icon}</div>
          <div className={styles.payInfo}>
            <div className={styles.payName}>{m.name}</div>
            <div className={styles.payDesc}>{m.desc}</div>
          </div>
        </div>
      ))}

      <div className={styles.btnRow}>
        <button className={styles.btnSecondary} data-agent-id="btn-back" onClick={onBack}>
          Back
        </button>
        <button
          className={styles.btnPrimary}
          data-agent-id="btn-submit"
          onClick={onSubmit}
          disabled={!valid}
        >
          Submit & Pay S$ 360
        </button>
      </div>
    </div>
  );
}
