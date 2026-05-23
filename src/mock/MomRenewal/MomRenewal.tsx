import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './MomRenewal.module.css';
import Step1Start from './steps/Step1Start';
import Step2Details from './steps/Step2Details';
import Step3Upload from './steps/Step3Upload';
import Step4Payment from './steps/Step4Payment';
import Step5Confirm from './steps/Step5Confirm';

export type MomRenewalStep = 1 | 2 | 3 | 4 | 5;

export interface MomRenewalState {
  step: MomRenewalStep;
  nric: string;
  uen: string;
  workerName: string;
  passNumber: string;
  newExpiry: string;
  passportUploaded: boolean;
  photoUploaded: boolean;
  paymentMethod: '' | 'nets' | 'paynow' | 'card';
  caseId: string;
}

const INITIAL_STATE: MomRenewalState = {
  step: 1,
  nric: '',
  uen: '',
  workerName: '',
  passNumber: '',
  newExpiry: '',
  passportUploaded: false,
  photoUploaded: false,
  paymentMethod: '',
  caseId: '',
};

/* ─── Step Indicator ─── */
function StepBar({ current }: { current: MomRenewalStep }) {
  const labels = ['Start', 'Details', 'Upload', 'Payment', 'Confirm'];
  return (
    <div className={styles.stepBar} data-agent-id="step-bar">
      {labels.map((label, i) => {
        const num = (i + 1) as MomRenewalStep;
        const isActive = num === current;
        const isDone = num < current;
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
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
function BrowserChrome({ step }: { step: MomRenewalStep }) {
  const urlMap: Record<MomRenewalStep, string> = {
    1: 'mom.gov.sg/work-pass/renewal',
    2: 'mom.gov.sg/work-pass/renewal/details',
    3: 'mom.gov.sg/work-pass/renewal/documents',
    4: 'mom.gov.sg/work-pass/renewal/payment',
    5: 'mom.gov.sg/work-pass/renewal/confirmation',
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

/* ─── Singapore Gov Header ─── */
function GovHeader() {
  return (
    <>
      <div className={styles.govHeader}>
        <div className={styles.govLogo}>MOM</div>
        <div className={styles.govTitleWrap}>
          <span className={styles.govTitle}>Ministry of Manpower</span>
          <span className={styles.govSubtitle}>An Official Singapore Government Service</span>
        </div>
      </div>
      <div className={styles.govNav}>
        Services / Work Passes / <b>Work Permit Renewal</b>
      </div>
    </>
  );
}

/* ─── Main Component ─── */
export default function MomRenewal({
  onCaseCreated,
}: {
  onCaseCreated?: (caseId: string) => void;
}) {
  const [state, setState] = useState<MomRenewalState>(INITIAL_STATE);

  const update = (patch: Partial<MomRenewalState>) =>
    setState((s) => ({ ...s, ...patch }));

  const goToStep = (step: MomRenewalStep) => update({ step });

  const completeRenewal = () => {
    const caseId = `WP${Math.floor(Math.random() * 90000 + 10000)}-${Date.now().toString().slice(-4)}`;
    update({ step: 5, caseId });
    onCaseCreated?.(caseId);
  };

  return (
    <div className={styles.browser} data-agent-id="mom-renewal-browser">
      <BrowserChrome step={state.step} />
      <div className={styles.viewport} data-agent-id="mom-viewport">
        <GovHeader />
        <div className={styles.page}>
          <StepBar current={state.step} />
          <AnimatePresence mode="wait">
            <motion.div
              key={state.step}
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -14 }}
              transition={{ duration: 0.28 }}
            >
              {state.step === 1 && <Step1Start onNext={() => goToStep(2)} />}
              {state.step === 2 && (
                <Step2Details
                  state={state}
                  update={update}
                  onBack={() => goToStep(1)}
                  onNext={() => goToStep(3)}
                />
              )}
              {state.step === 3 && (
                <Step3Upload
                  state={state}
                  update={update}
                  onBack={() => goToStep(2)}
                  onNext={() => goToStep(4)}
                />
              )}
              {state.step === 4 && (
                <Step4Payment
                  state={state}
                  update={update}
                  onBack={() => goToStep(3)}
                  onSubmit={completeRenewal}
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
