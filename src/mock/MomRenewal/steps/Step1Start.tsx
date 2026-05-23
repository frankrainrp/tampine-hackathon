import styles from '../MomRenewal.module.css';

export default function Step1Start({ onNext }: { onNext: () => void }) {
  return (
    <div data-agent-id="page-start">
      <h1 className={styles.pageTitle}>Renew Work Permit</h1>
      <p className={styles.pageSubtitle}>
        Apply to renew a Work Permit for migrant workers in the construction, manufacturing,
        marine shipyard, process, or services sectors. Renewal must be submitted no earlier
        than 8 weeks before expiry.
      </p>

      <div className={styles.infoBox} data-agent-id="info-eligibility">
        <b>Before you begin, ensure you have:</b>
        <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem' }}>
          <li>Employer&apos;s UEN (Unique Entity Number)</li>
          <li>Worker&apos;s NRIC / FIN and current Work Permit number</li>
          <li>Soft copy of passport bio-page (PDF/JPG, &lt; 2 MB)</li>
          <li>Recent passport-size photo (JPG, white background)</li>
          <li>Payment method: NETS, PayNow, or credit card</li>
        </ul>
      </div>

      <div className={styles.btnRow}>
        <button
          className={styles.btnLarge}
          data-agent-id="btn-start-renewal"
          onClick={onNext}
        >
          Start Renewal
        </button>
      </div>
    </div>
  );
}
