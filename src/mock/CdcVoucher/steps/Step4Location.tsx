import styles from '../CdcVoucher.module.css';
import type { CdcVoucherState } from '../CdcVoucher';

interface Props {
  state: CdcVoucherState;
  update: (patch: Partial<CdcVoucherState>) => void;
  onConfirm: () => void;
}

const LOCATIONS = [
  {
    id: 'our-tampines-hub',
    name: 'Our Tampines Hub',
    addr: '1 Tampines Walk, Singapore 528523',
    hours: 'Mon-Sun 9am-9pm',
    distance: '0.3 km',
  },
  {
    id: 'tampines-mall',
    name: 'Tampines Mall',
    addr: '4 Tampines Central 5, Singapore 529510',
    hours: 'Mon-Sun 10am-10pm',
    distance: '0.5 km',
  },
  {
    id: 'tampines-1',
    name: 'Tampines 1',
    addr: '10 Tampines Central 1, Singapore 529536',
    hours: 'Mon-Sun 10am-10pm',
    distance: '0.7 km',
  },
];

export default function Step4Location({ state, update, onConfirm }: Props) {
  return (
    <div data-agent-id="page-location">
      <h1 className={styles.pageTitle}>Where would you like to collect?</h1>
      <p className={styles.pageSubtitle}>
        Choose a collection point near you. Bring your NRIC and the QR code we&apos;ll send you.
      </p>

      <div className={styles.locationList}>
        {LOCATIONS.map((loc) => {
          const isSelected = state.selectedLocation === loc.id;
          return (
            <div
              key={loc.id}
              className={`${styles.locationCard} ${isSelected ? styles.locationCardSelected : ''}`}
              data-agent-id={`location-${loc.id}`}
              onClick={() => update({ selectedLocation: loc.id })}
              role="button"
              tabIndex={0}
            >
              <div className={styles.locationHead}>
                <span className={styles.locationPin}>📍</span>
                <span className={styles.locationName}>{loc.name}</span>
              </div>
              <div className={styles.locationAddr}>{loc.addr}</div>
              <div className={styles.locationMeta}>
                <span>🕒 {loc.hours}</span>
                <span><b>{loc.distance}</b> from you</span>
              </div>
            </div>
          );
        })}
      </div>

      <button
        className={styles.btnLarge}
        data-agent-id="btn-confirm-location"
        onClick={onConfirm}
        disabled={!state.selectedLocation}
      >
        Confirm Collection Location →
      </button>
    </div>
  );
}
