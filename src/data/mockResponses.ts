import type { AIResponse } from '../store/useAppStore';

/**
 * Mock AI responses for demonstration purposes.
 * In production, these would come from the AI backend.
 */
export const MOCK_RESPONSES: Record<string, AIResponse> = {
  default: {
    reply: 'Here is the information you requested. I have organized the key details below:',
    fields: [
      { type: 'person', label: 'Assigned Officer', value: 'Ms Farah Lim (Social Services)' },
      { type: 'datetime', label: 'Appointment', value: 'This Tuesday, 10:30 AM' },
      { type: 'location', label: 'Location', value: 'Outram Community Hub, Level 3, Singapore' },
      { type: 'documents', label: 'Required Documents', value: 'NRIC, Retrenchment Letter' },
      { type: 'contact', label: 'Office', value: '+65 6325 9220' },
    ],
    actions: [
      { label: 'Confirm Booking', prompt: 'Please confirm this booking and tell me what to do next.' },
    ],
  },

  housing: {
    reply: 'Your HDB flat application status has been updated:',
    fields: [
      { type: 'note', label: 'Application', value: 'BTO Flat — 4-Room, Tengah' },
      { type: 'datetime', label: 'Ballot Date', value: '15 June 2026, 2:00 PM' },
      { type: 'location', label: 'Selection Venue', value: 'HDB Hub, 480 Lorong 6 Toa Payoh, Singapore 310480' },
      { type: 'eligibility', label: 'Status', value: 'First-timer priority — confirmed' },
      { type: 'cost', label: 'Option Fee', value: 'S$2,000 (cashier order)' },
      { type: 'step', label: 'Next Step', value: 'Prepare cashier order and required documents before the ballot date.' },
    ],
    actions: [
      { label: 'View Floor Plans', prompt: 'Please show me the available floor plans for 4-room Tengah BTO.' },
      { label: 'Update Co-Applicant', prompt: 'I need to update my co-applicant information.' },
    ],
  },

  medical: {
    reply: 'I have routed this cross-agency medical referral for you. Key info below:',
    fields: [
      { type: 'person', label: 'Lead Coordinator', value: 'Dr. Chen Wei (NUH Neurology)' },
      { type: 'datetime', label: 'First Appointment', value: 'Next Monday, 9:00 AM' },
      { type: 'location', label: 'Hospital', value: 'National University Hospital, 5 Lower Kent Ridge Rd, Singapore 119074' },
      { type: 'documents', label: 'Bring Along', value: 'NRIC, referral letter from GP, prior MRI reports' },
      { type: 'step', label: 'Step 1', value: 'NUH Neurology — complete specialist assessment.' },
      { type: 'step', label: 'Step 2', value: 'AIC Care Coordinator — financial subsidy review.' },
    ],
    actions: [
      { label: 'Check Subsidy', prompt: 'Please help me check what subsidies I qualify for.' },
    ],
  },

  progress: {
    reply: 'Your work permit renewal is currently under review by MOM:',
    fields: [
      { type: 'note', label: 'Application', value: 'Work Permit Renewal — 65% complete' },
      { type: 'datetime', label: 'Estimated Completion', value: '3-5 working days' },
      { type: 'contact', label: 'MOM Hotline', value: '+65 6438 5122' },
      { type: 'step', label: 'Next Step', value: 'Wait for MOM officer to review. You will be notified via SMS.' },
    ],
    actions: [
      { label: 'Track Progress', prompt: 'Please give me the latest progress update on my permit.' },
    ],
  },
};

const responseKeys = Object.keys(MOCK_RESPONSES);

export function getMockResponse(userInput: string): AIResponse {
  const lower = userInput.toLowerCase();
  if (lower.includes('housing') || lower.includes('hdb') || lower.includes('flat')) {
    return MOCK_RESPONSES.housing;
  }
  if (lower.includes('medical') || lower.includes('hospital') || lower.includes('referral') || lower.includes('neuro')) {
    return MOCK_RESPONSES.medical;
  }
  if (lower.includes('progress') || lower.includes('status') || lower.includes('permit') || lower.includes('renewal')) {
    return MOCK_RESPONSES.progress;
  }
  return MOCK_RESPONSES[responseKeys[Math.floor(Math.random() * responseKeys.length)]];
}
