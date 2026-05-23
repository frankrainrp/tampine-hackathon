import type { AgentAction } from './executor';
import type { InputFieldSpec } from '../store/useAppStore';

/* ─── CDC Voucher claim demo (collect-then-automate) ───
 *
 * Two parts:
 *   1. `inputs` — every user-supplied field the agent will need. The chat UI
 *      surfaces these as ONE form so the user fills everything once, then
 *      the agent runs end-to-end without pausing.
 *   2. `actions` — the deterministic action sequence. `fill.valueFrom` looks
 *      up the value the user already provided. PII fields hand the executor
 *      a semantic token (e.g. "[NRIC_001]") so the form layer never receives
 *      the raw value.
 *
 * No `ask_user` actions any more — that pattern broke on mobile because the
 * agent panel covers the whole screen and the user couldn't tap the chat
 * input behind it. */

export interface DemoScript {
  inputs: InputFieldSpec[];
  actions: AgentAction[];
  /** Headline shown above the user input form */
  inputsTitle: string;
  /** Sub-line explaining why we need all this up-front */
  inputsHint: string;
}

export const CDC_VOUCHER_DEMO: DemoScript = {
  inputsTitle: 'A few details before we start',
  inputsHint:
    "Fill these once and I'll take care of the rest — no more typing during the process.",

  inputs: [
    {
      field: 'NRIC',
      label: 'Your NRIC',
      hint: 'For Singpass identity verification',
      placeholder: 'e.g. S1234567A',
      pii: true,
    },
    {
      field: 'Mobile',
      label: 'Mobile number',
      hint: 'For an SMS when your vouchers are ready',
      placeholder: 'e.g. 91234567',
      pii: true,
    },
  ],

  actions: [
    {
      type: 'navigate',
      site: 'cdc-voucher',
      narration: "Opening the CDC Voucher portal. Sit back — I'll guide you through.",
    },

    /* ── Step 1: Singpass login ───────────────────────────────────
     * NRIC is filled from the form the user already submitted in chat.
     * The fill action uses the semantic token (PII never reaches the form). */
    {
      type: 'fill',
      target: 'input-nric',
      valueFrom: 'NRIC',
      narration: 'Filling in your NRIC for Singpass verification.',
      label: 'NRIC',
    },
    {
      type: 'click',
      target: 'btn-singpass-login',
      narration: 'Logging you in with Singpass.',
      label: 'Tap "Log in with Singpass"',
    },

    /* ── Step 2: View balance → Step 3 ─── */
    {
      type: 'click',
      target: 'btn-view-vouchers',
      narration: 'Good news — you have S$ 300 available. Picking your vouchers next.',
      label: 'Tap "View Available Vouchers"',
    },

    /* ── Step 3: Select all three voucher types ─── */
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

    /* ── Step 4: Choose location (nearest = Our Tampines Hub) ─── */
    {
      type: 'click',
      target: 'location-our-tampines-hub',
      narration:
        "Choosing Our Tampines Hub — it's the closest at 0.3 km, open 9am to 9pm every day.",
      label: 'Our Tampines Hub (0.3 km)',
    },

    /* ── Final confirmation (full-screen modal) ─── */
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
  ],
};

/* Back-compat: the constant used to be a raw AgentAction[]. Anything that
 * still expects the old shape can read `.actions`. */
export const WORK_PERMIT_RENEWAL_DEMO = CDC_VOUCHER_DEMO.actions;
