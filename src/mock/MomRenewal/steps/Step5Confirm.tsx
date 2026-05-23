import styles from '../MomRenewal.module.css';
import type { MomRenewalState } from '../MomRenewal';

export default function Step5Confirm({ state }: { state: MomRenewalState }) {
  return (
    <div className={styles.successWrap} data-agent-id="page-confirm">
      <div className={styles.successIcon}>✓</div>
      <h1 className={styles.successTitle}>Renewal Submitted</h1>
      <p className={styles.successMsg}>
        Your Work Permit renewal application has been received. You will receive an SMS
        notification once approved (typically within 3-5 working days).
      </p>

      <div className={styles.caseIdBox} data-agent-id="case-id-box">
        <div className={styles.caseIdLabel}>Case Reference</div>
        <div className={styles.caseIdValue} data-agent-id="case-id-value">
          {state.caseId || 'WP00000-0000'}
        </div>
      </div>

      <div className={styles.nextSteps}>
        <div className={styles.nextStepsTitle}>What happens next</div>
        <ul className={styles.nextStepsList}>
          <li>MOM will verify documents within 1-2 working days.</li>
          <li>Payment of S$ 360.00 has been confirmed via {state.paymentMethod || 'selected method'}.</li>
          <li>New permit card will be mailed to registered address.</li>
          <li>SMS notification will be sent to the worker&apos;s mobile.</li>
        </ul>
      </div>
    </div>
  );
}
