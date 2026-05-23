import styles from '../CdcVoucher.module.css';

export default function Step2Balance({ onNext }: { onNext: () => void }) {
  return (
    <div data-agent-id="page-balance">
      <h1 className={styles.pageTitle}>Welcome back, Mdm Tan</h1>
      <p className={styles.balanceWelcome}>Here is your CDC Voucher balance for 2026:</p>

      <div className={styles.balanceLabel} style={{ textAlign: 'center', marginTop: '1rem' }}>
        Available to claim
      </div>
      <div className={styles.balanceBig} data-agent-id="balance-total">S$ 300.00</div>

      <div className={styles.balanceBreakdown}>
        <div className={styles.balanceRow}>
          <span className={styles.balanceRowLabel}>CDC Voucher (annual)</span>
          <span className={styles.balanceRowValue}>S$ 250.00</span>
        </div>
        <div className={styles.balanceRow}>
          <span className={styles.balanceRowLabel}>Senior Citizen Top-up</span>
          <span className={styles.balanceRowValue}>S$ 50.00</span>
        </div>
      </div>

      <button
        className={styles.btnLarge}
        data-agent-id="btn-view-vouchers"
        onClick={onNext}
      >
        View Available Vouchers →
      </button>
    </div>
  );
}
