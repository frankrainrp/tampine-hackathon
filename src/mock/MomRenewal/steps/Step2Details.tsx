import styles from '../MomRenewal.module.css';
import type { MomRenewalState } from '../MomRenewal';

interface Props {
  state: MomRenewalState;
  update: (patch: Partial<MomRenewalState>) => void;
  onBack: () => void;
  onNext: () => void;
}

export default function Step2Details({ state, update, onBack, onNext }: Props) {
  const valid =
    state.nric.trim().length >= 9 &&
    state.uen.trim().length >= 9 &&
    state.workerName.trim().length >= 2 &&
    state.passNumber.trim().length >= 4 &&
    state.newExpiry.trim().length >= 4;

  return (
    <div data-agent-id="page-details">
      <h1 className={styles.pageTitle}>Worker & Employer Details</h1>
      <p className={styles.pageSubtitle}>
        Please verify the worker and employer information. All fields are required.
      </p>

      <div className={styles.formGroup}>
        <label className={`${styles.label} ${styles.labelRequired}`}>Employer UEN</label>
        <input
          className={styles.input}
          data-agent-id="input-uen"
          name="uen"
          placeholder="e.g. 201234567K"
          value={state.uen}
          onChange={(e) => update({ uen: e.target.value })}
        />
        <div className={styles.help}>Unique Entity Number registered with ACRA.</div>
      </div>

      <div className={styles.formGroup}>
        <label className={`${styles.label} ${styles.labelRequired}`}>Worker NRIC / FIN</label>
        <input
          className={styles.input}
          data-agent-id="input-nric"
          name="nric"
          placeholder="e.g. G1234567X"
          value={state.nric}
          onChange={(e) => update({ nric: e.target.value })}
        />
      </div>

      <div className={styles.formGroup}>
        <label className={`${styles.label} ${styles.labelRequired}`}>Worker Full Name</label>
        <input
          className={styles.input}
          data-agent-id="input-worker-name"
          name="workerName"
          placeholder="As shown on passport"
          value={state.workerName}
          onChange={(e) => update({ workerName: e.target.value })}
        />
      </div>

      <div className={styles.formGroup}>
        <label className={`${styles.label} ${styles.labelRequired}`}>Current Work Permit No.</label>
        <input
          className={styles.input}
          data-agent-id="input-pass-number"
          name="passNumber"
          placeholder="e.g. WP1234567A"
          value={state.passNumber}
          onChange={(e) => update({ passNumber: e.target.value })}
        />
      </div>

      <div className={styles.formGroup}>
        <label className={`${styles.label} ${styles.labelRequired}`}>New Expiry Date</label>
        <input
          className={styles.input}
          data-agent-id="input-new-expiry"
          name="newExpiry"
          placeholder="DD/MM/YYYY"
          value={state.newExpiry}
          onChange={(e) => update({ newExpiry: e.target.value })}
        />
        <div className={styles.help}>Renewal can extend pass up to 24 months from today.</div>
      </div>

      <div className={styles.btnRow}>
        <button className={styles.btnSecondary} data-agent-id="btn-back" onClick={onBack}>
          Back
        </button>
        <button
          className={styles.btnPrimary}
          data-agent-id="btn-next"
          onClick={onNext}
          disabled={!valid}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
