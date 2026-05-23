import { useState } from 'react';
import styles from '../CdcVoucher.module.css';
import type { CdcVoucherState } from '../CdcVoucher';

interface Props {
  state: CdcVoucherState;
  update: (patch: Partial<CdcVoucherState>) => void;
  onNext: () => void;
}

/**
 * Step 1 — Singpass login.
 *
 * Behaviour:
 * - Hidden NRIC input is the agent's typing target (data-agent-id="input-nric").
 * - The visible Singpass button drives the whole auth+advance flow when clicked,
 *   so the agent can deterministically control timing via two actions:
 *     1) ask_user → types NRIC into hidden input
 *     2) click btn-singpass-login → button runs the 1.2s auth animation, then advances
 *
 * No useEffect-based auto-progress here — that caused a race with the agent's wait.
 */
export default function Step1Singpass({ state, update, onNext }: Props) {
  const [authenticating, setAuthenticating] = useState(false);

  const handleLogin = () => {
    if (state.loggedIn || authenticating) return;

    setAuthenticating(true);

    // 1.2s "Singpass authenticating..." animation, then mark logged-in and advance
    setTimeout(() => {
      update({ loggedIn: true });
      setAuthenticating(false);
      // small beat so the "✓ Authenticated" label is visible before page transition
      setTimeout(() => onNext(), 350);
    }, 1200);
  };

  return (
    <div data-agent-id="page-login">
      <h1 className={styles.pageTitle}>Welcome to CDC Vouchers</h1>
      <p className={styles.pageSubtitle}>
        Please log in with Singpass so we can show you what you can claim.
      </p>

      <div className={styles.singpassCenter}>
        <p className={styles.singpassNote}>
          Singpass is Singapore&apos;s secure digital ID. Your details stay private.
        </p>

        <button
          className={styles.singpassBtn}
          data-agent-id="btn-singpass-login"
          onClick={handleLogin}
          disabled={authenticating || state.loggedIn}
        >
          <span className={styles.singpassLogo}>sp</span>
          {authenticating
            ? 'Logging you in...'
            : state.loggedIn
              ? '✓ Logged in'
              : 'Log in with Singpass'}
        </button>

        {/* Hidden NRIC input — the agent types into this */}
        <input
          type="text"
          data-agent-id="input-nric"
          name="nric"
          value={state.nric}
          onChange={(e) => update({ nric: e.target.value })}
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1 }}
          aria-hidden="true"
          tabIndex={-1}
        />

        <p className={styles.expireNote}>Vouchers can be claimed any time before 31 December 2026.</p>
      </div>
    </div>
  );
}
