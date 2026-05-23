import type { AgentAction } from './executor';

/* ─── Hardcoded Work Permit Renewal demo ───
 * This is the safety net: even if the AI agent backend fails on demo day,
 * we can replay this sequence verbatim and the audience will see the exact
 * same flow. Use this as the source of truth for what a "good" AI run looks like. */

export const WORK_PERMIT_RENEWAL_DEMO: AgentAction[] = [
  {
    type: 'navigate',
    site: 'mom-renewal',
    narration: 'Opening MOM Work Permit Renewal portal...',
  },

  /* ── Step 1 → Step 2 ── */
  {
    type: 'click',
    target: 'btn-start-renewal',
    narration: 'Starting the renewal application.',
    label: 'Click "Start Renewal"',
  },

  /* ── Step 2: Details (4 auto-filled + 1 user-provided) ── */
  {
    type: 'fill',
    target: 'input-uen',
    value: '201234567K',
    narration: 'Auto-filling employer UEN from your business profile.',
    label: 'Filling Employer UEN',
  },
  {
    type: 'ask_user',
    field: 'NRIC',
    prompt: "I need the worker's NRIC / FIN to look up the current pass. Please enter it:",
    target: 'input-nric',
    narration: 'Pausing for your input — NRIC is required.',
  },
  {
    type: 'fill',
    target: 'input-worker-name',
    value: 'Rahman Bin Abdullah',
    narration: 'Loading worker name from MOM records.',
    label: 'Filling Worker Name',
  },
  {
    type: 'fill',
    target: 'input-pass-number',
    value: 'WP8845629A',
    narration: 'Loading current Work Permit number.',
    label: 'Filling Pass Number',
  },
  {
    type: 'fill',
    target: 'input-new-expiry',
    value: '15/06/2028',
    narration: 'Setting new expiry to maximum (24 months).',
    label: 'Filling New Expiry',
  },
  {
    type: 'click',
    target: 'btn-next',
    narration: 'Proceeding to document upload.',
    label: 'Continue',
  },

  /* ── Step 3: Upload ── */
  {
    type: 'click',
    target: 'upload-passport',
    narration: 'Uploading passport bio-page from your secure document vault.',
    label: 'Upload Passport',
  },
  {
    type: 'click',
    target: 'upload-photo',
    narration: 'Uploading recent passport photo.',
    label: 'Upload Photo',
  },
  {
    type: 'click',
    target: 'btn-next',
    narration: 'Documents verified. Moving to payment.',
    label: 'Continue',
  },

  /* ── Step 4: Payment ── */
  {
    type: 'click',
    target: 'pay-paynow',
    narration: 'Selecting PayNow — the fastest payment method.',
    label: 'Select PayNow',
  },
  {
    type: 'wait',
    ms: 700,
    narration: 'Reviewing the application summary one last time...',
  },
  {
    type: 'click',
    target: 'btn-submit',
    narration: 'Submitting application and authorising payment of S$ 360.00.',
    label: 'Submit & Pay',
  },

  /* ── Done ── */
  {
    type: 'done',
    summary: 'Work Permit renewal submitted. SMS notification will arrive in 3-5 working days.',
  },
];
