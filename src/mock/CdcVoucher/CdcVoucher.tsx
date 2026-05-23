import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './CdcVoucher.module.css';
import Step1Singpass from './steps/Step1Singpass';
import Step2Balance from './steps/Step2Balance';
import Step3Type from './steps/Step3Type';
import Step4Location from './steps/Step4Location';
import Step5Confirm from './steps/Step5Confirm';

export type CdcVoucherStep = 1 | 2 | 3 | 4 | 5;

export type VoucherTypeId = 'hawkers' | 'supermarket' | 'heartland';

export interface CdcVoucherState {
  step: CdcVoucherStep;
  /** Singpass auth (NRIC stored as masked/encrypted token in PII-mask mode) */
  nric: string;
  loggedIn: boolean;
  selectedTypes: VoucherTypeId[];
  selectedLocation: string;
  caseId: string;
}

const INITIAL_STATE: CdcVoucherState = {
  step: 1,
  nric: '',
  loggedIn: false,
  selectedTypes: [],
  selectedLocation: '',
  caseId: '',
};

/* ─── Step Indicator ─── */
function StepBar({ current }: { current: CdcVoucherStep }) {
  const labels = ['Login', 'Balance', 'Vouchers', 'Location', 'Done'];
  return (
    <div className={styles.stepBar} data-agent-id="step-bar">
      {labels.map((label, i) => {
        const num = (i + 1) as CdcVoucherStep;
        const isActive = num === current;
        const isDone = num < current;
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div className={`${styles.stepNode} ${isActive ? styles.stepNodeActive : ''}`}>
              <span
                className={`${styles.stepDot} ${isActive ? styles.stepDotActive : ''} ${isDone ? styles.stepDotDone : ''}`}
              >
                {isDone ? '✓' : num}
              </span>
              <span>{label}</span>
            </div>
            {i < labels.length - 1 && (
              <span className={`${styles.stepConnector} ${isDone ? styles.stepConnectorDone : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Browser Chrome ─── */
function BrowserChrome({ step }: { step: CdcVoucherStep }) {
  const urlMap: Record<CdcVoucherStep, string> = {
    1: 'cdcvouchers.gov.sg/login',
    2: 'cdcvouchers.gov.sg/balance',
    3: 'cdcvouchers.gov.sg/claim/types',
    4: 'cdcvouchers.gov.sg/claim/location',
    5: 'cdcvouchers.gov.sg/claim/done',
  };
  return (
    <div className={styles.chrome}>
      <span className={`${styles.dot} ${styles.dotRed}`} />
      <span className={`${styles.dot} ${styles.dotYellow}`} />
      <span className={`${styles.dot} ${styles.dotGreen}`} />
      <div className={styles.urlBar}>
        <svg className={styles.lock} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1C8.7 1 6 3.7 6 7v3H4v12h16V10h-2V7c0-3.3-2.7-6-6-6zm0 2c2.2 0 4 1.8 4 4v3H8V7c0-2.2 1.8-4 4-4z" />
        </svg>
        <span>{urlMap[step]}</span>
      </div>
    </div>
  );
}

/* ─── CDC Header ─── */
function GovHeader() {
  return (
    <>
      <div className={styles.govHeader}>
        <div className={styles.govLogo}>CDC</div>
        <div className={styles.govTitleWrap}>
          <span className={styles.govTitle}>Community Development Council</span>
          <span className={styles.govSubtitle}>CDC Vouchers · Tampines</span>
        </div>
      </div>
      <div className={styles.govNav}>
        Home / <b>Claim CDC Vouchers</b>
      </div>
    </>
  );
}

/* ─── Main Component ─── */
export default function CdcVoucher({
  onCaseCreated,
}: {
  onCaseCreated?: (caseId: string) => void;
}) {
  const [state, setState] = useState<CdcVoucherState>(INITIAL_STATE);

  const update = (patch: Partial<CdcVoucherState>) => setState((s) => ({ ...s, ...patch }));
  const goToStep = (step: CdcVoucherStep) => update({ step });

  const finalize = () => {
    const caseId = `CDC2026-${Math.floor(Math.random() * 90000 + 10000)}`;
    update({ step: 5, caseId });
    onCaseCreated?.(caseId);
  };

  return (
    <div className={styles.browser} data-agent-id="cdc-voucher-browser">
      <BrowserChrome step={state.step} />
      <div className={styles.viewport} data-agent-id="cdc-viewport">
        <GovHeader />
        <div className={styles.page}>
          <StepBar current={state.step} />
          <AnimatePresence mode="wait">
            <motion.div
              key={state.step}
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -14 }}
              transition={{ duration: 0.3 }}
            >
              {state.step === 1 && (
                <Step1Singpass
                  state={state}
                  update={update}
                  onNext={() => goToStep(2)}
                />
              )}
              {state.step === 2 && <Step2Balance onNext={() => goToStep(3)} />}
              {state.step === 3 && (
                <Step3Type state={state} update={update} onNext={() => goToStep(4)} />
              )}
              {state.step === 4 && (
                <Step4Location
                  state={state}
                  update={update}
                  onConfirm={finalize}
                />
              )}
              {state.step === 5 && <Step5Confirm state={state} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
