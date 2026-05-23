import styles from '../CdcVoucher.module.css';
import type { CdcVoucherState, VoucherTypeId } from '../CdcVoucher';

interface Props {
  state: CdcVoucherState;
  update: (patch: Partial<CdcVoucherState>) => void;
  onNext: () => void;
}

const VOUCHER_TYPES: { id: VoucherTypeId; icon: string; name: string; desc: string; amount: number }[] = [
  {
    id: 'hawkers',
    icon: '🍜',
    name: 'CDC Hawkers Voucher',
    desc: 'Use at all hawker stalls in Singapore',
    amount: 150,
  },
  {
    id: 'supermarket',
    icon: '🛒',
    name: 'CDC Supermarket Voucher',
    desc: 'FairPrice, Sheng Siong, Giant, Cold Storage',
    amount: 100,
  },
  {
    id: 'heartland',
    icon: '🏪',
    name: 'Heartland Merchants Voucher',
    desc: 'Participating shops at HDB heartland areas',
    amount: 50,
  },
];

export default function Step3Type({ state, update, onNext }: Props) {
  const toggle = (id: VoucherTypeId) => {
    const has = state.selectedTypes.includes(id);
    update({
      selectedTypes: has
        ? state.selectedTypes.filter((t) => t !== id)
        : [...state.selectedTypes, id],
    });
  };

  const total = state.selectedTypes.reduce((sum, id) => {
    const v = VOUCHER_TYPES.find((x) => x.id === id);
    return sum + (v?.amount || 0);
  }, 0);

  return (
    <div data-agent-id="page-vouchers">
      <h1 className={styles.pageTitle}>Choose vouchers to claim</h1>
      <p className={styles.pageSubtitle}>
        You may select one or more vouchers. Selected vouchers will be issued together.
      </p>

      <div className={styles.voucherList}>
        {VOUCHER_TYPES.map((v) => {
          const isSelected = state.selectedTypes.includes(v.id);
          return (
            <div
              key={v.id}
              className={`${styles.voucherCard} ${isSelected ? styles.voucherCardSelected : ''}`}
              data-agent-id={`voucher-${v.id}`}
              onClick={() => toggle(v.id)}
              role="button"
              tabIndex={0}
            >
              <div className={styles.voucherCheckbox}>{isSelected ? '✓' : ''}</div>
              <div className={styles.voucherIcon}>{v.icon}</div>
              <div className={styles.voucherInfo}>
                <div className={styles.voucherName}>{v.name}</div>
                <div className={styles.voucherDesc}>{v.desc}</div>
              </div>
              <div className={styles.voucherAmount}>S$ {v.amount}</div>
            </div>
          );
        })}
      </div>

      <button
        className={styles.btnLarge}
        data-agent-id="btn-continue-types"
        onClick={onNext}
        disabled={state.selectedTypes.length === 0}
      >
        {state.selectedTypes.length === 0
          ? 'Select at least one voucher'
          : `Continue (S$ ${total} selected) →`}
      </button>
    </div>
  );
}
