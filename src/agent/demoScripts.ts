import type { AgentAction } from './executor';

/* ─── Hardcoded CDC Voucher claim demo ───
 * For Tampines elderly users: guided auto-pilot through the CDC voucher
 * claim flow. The agent collects NRIC first, then drives every page transition
 * deterministically — no useEffect race with the executor's timing.
 *
 * This is the demo-day safety net. Replay-able verbatim with no AI backend. */

export const CDC_VOUCHER_DEMO: AgentAction[] = [
  {
    type: 'navigate',
    site: 'cdc-voucher',
    narration: "Opening the CDC Voucher portal. I'll guide you step by step.",
  },

  /* ── Step 1: ask for NRIC first, then click Singpass ─────────────
   * Order matters: ask_user highlights input-nric which only lives on Step 1.
   * After click btn-singpass-login the page transitions to Step 2 (~1.5s)
   * so input-nric is no longer in the DOM. */
  {
    type: 'ask_user',
    field: 'NRIC',
    prompt:
      "I just need your NRIC to log in with Singpass. It will be encrypted on this device — your real number never leaves here.",
    target: 'input-nric',
    narration:
      'Please type your NRIC so Singpass can verify your identity. Take your time.',
  },
  {
    type: 'click',
    target: 'btn-singpass-login',
    narration: "Logging you in with Singpass. This usually takes a moment.",
    label: 'Tap "Log in with Singpass"',
  },

  /* ── Step 2: View balance → Step 3 ───────────────────────────────
   * After Singpass click, the page auto-advances to Step 2 in ~1.55s.
   * The first action's own internal delay covers the transition. */
  {
    type: 'click',
    target: 'btn-view-vouchers',
    narration: 'Good news — you have S$ 300 available. Picking your vouchers next.',
    label: 'Tap "View Available Vouchers"',
  },

  /* ── Step 3: Select all three voucher types ─────────────────────── */
  {
    type: 'click',
    target: 'voucher-hawkers',
    narration: 'Selecting the Hawkers voucher — S$ 150.',
    label: 'Hawkers S$ 150',
  },
  {
    type: 'click',
    target: 'voucher-supermarket',
    narration: 'Adding the Supermarket voucher — S$ 100.',
    label: 'Supermarket S$ 100',
  },
  {
    type: 'click',
    target: 'voucher-heartland',
    narration:
      'And the Heartland Merchants voucher — S$ 50. That uses your full balance.',
    label: 'Heartland S$ 50',
  },
  {
    type: 'click',
    target: 'btn-continue-types',
    narration: 'Continuing with all three vouchers selected.',
    label: 'Continue',
  },

  /* ── Step 4: Choose location (nearest = Our Tampines Hub) ────────── */
  {
    type: 'click',
    target: 'location-our-tampines-hub',
    narration:
      "Choosing Our Tampines Hub — it's the closest at 0.3 km, open 9am to 9pm every day.",
    label: 'Our Tampines Hub (0.3 km)',
  },

  /* ── Final confirmation (full-screen modal) ─────────────────────── */
  {
    type: 'confirm',
    title: 'Please check before we submit',
    subtitle: "I'll only send this off after you tap Yes.",
    fields: [
      { label: 'Total', value: 'S$ 300.00', highlight: true },
      { label: 'Vouchers', value: 'Hawkers · Supermarket · Heartland' },
      { label: 'Collect at', value: 'Our Tampines Hub' },
      { label: 'Collect by', value: '30 June 2026' },
    ],
    narration: 'Please double-check the details on screen before we submit.',
  },

  /* ── Submission ── */
  {
    type: 'click',
    target: 'btn-confirm-location',
    narration: 'Sending it off now. Just a moment.',
    label: 'Submit',
  },

  /* ── Done ── */
  {
    type: 'done',
    summary:
      "All done! Your S$ 300 in CDC Vouchers are reserved. Collect at Our Tampines Hub anytime before 30 June 2026.",
  },
];

/* Keep the old name exported as an alias so any leftover import compiles
 * (will be removed in a later pass). */
export const WORK_PERMIT_RENEWAL_DEMO = CDC_VOUCHER_DEMO;
