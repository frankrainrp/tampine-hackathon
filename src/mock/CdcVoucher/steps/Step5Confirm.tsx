import styles from '../CdcVoucher.module.css';
import type { CdcVoucherState } from '../CdcVoucher';

const LOCATION_NAMES: Record<string, string> = {
  'our-tampines-hub': 'Our Tampines Hub',
  'tampines-mall': 'Tampines Mall',
  'tampines-1': 'Tampines 1',
};

const VOUCHER_AMOUNTS: Record<string, number> = {
  hawkers: 150,
  supermarket: 100,
  heartland: 50,
};

export default function Step5Confirm({ state }: { state: CdcVoucherState }) {
  const total = state.selectedTypes.reduce(
    (sum, id) => sum + (VOUCHER_AMOUNTS[id] || 0),
    0,
  );
  const locName = LOCATION_NAMES[state.selectedLocation] || 'Tampines';

  return (
    <div className={styles.successWrap} data-agent-id="page-done">
      <div className={styles.successIcon}>✓</div>
      <h1 className={styles.successTitle}>Vouchers Claimed!</h1>
      <div className={styles.successAmount} data-agent-id="success-amount">S$ {total}</div>
      <p className={styles.successMsg}>
        Your CDC Vouchers have been issued. Show this QR code at {locName} to collect.
      </p>

      <div className={styles.qrPlaceholder} data-agent-id="qr-code" aria-label="QR code for collection" />

      <p className={styles.qrCaption}>Or quote your reference number below</p>

      <div className={styles.caseIdBox} data-agent-id="case-id-box">
        <div className={styles.caseIdLabel}>Reference Number</div>
        <div className={styles.caseIdValue} data-agent-id="case-id-value">
          {state.caseId || 'CDC2026-00000'}
        </div>
      </div>

      <div className={styles.collectInfo}>
        <div className={styles.collectInfoTitle}>Collection Details</div>
        <ul className={styles.collectInfoList}>
          <li><b>{locName}</b> — pick up by 30 June 2026.</li>
          <li>Bring your NRIC and this QR code.</li>
          <li>Counter staff will print physical vouchers on the spot.</li>
          <li>Vouchers expire 31 December 2026.</li>
        </ul>
      </div>
    </div>
  );
}
