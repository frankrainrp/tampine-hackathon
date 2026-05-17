import type { AIResponse } from '../store/useAppStore';

/**
 * Mock AI responses for demonstration purposes.
 * In production, these would come from the AI backend.
 */
export const MOCK_RESPONSES: Record<string, AIResponse> = {
  default: {
    type: 'summary_list',
    reply: 'Here is the information you requested. I have organized the key details below:',
    bullet_points: [
      { icon: 'who', label: 'Assigned Officer', value: 'Ms Farah Lim (Social Services)' },
      { icon: 'what', label: 'Current Task', value: 'Fund Verification & Interview' },
      { icon: 'when', label: 'Appointment', value: 'This Tuesday, 10:30 AM' },
      { icon: 'where', label: 'Location', value: 'Outram Community Hub, Level 3' },
      { icon: 'how', label: 'Required Docs', value: 'NRIC, Retrenchment Letter' },
    ],
    actions: [
      { label: 'Confirm Booking', action_id: 'confirm_booking' },
    ],
  },

  housing: {
    type: 'summary_list',
    reply: 'Your HDB flat application status has been updated:',
    bullet_points: [
      { icon: 'who', label: 'Applicant', value: 'You (Primary) + 1 Co-Applicant' },
      { icon: 'what', label: 'Application', value: 'BTO Flat — 4-Room, Tengah' },
      { icon: 'when', label: 'Ballot Date', value: '15 June 2026, 2:00 PM' },
      { icon: 'where', label: 'Selection Venue', value: 'HDB Hub, Toa Payoh' },
      { icon: 'why', label: 'Eligibility', value: 'First-timer priority — confirmed' },
      { icon: 'how', label: 'Next Step', value: 'Prepare Option Fee ($2,000 cashier order)' },
    ],
    actions: [
      { label: 'View Floor Plans', action_id: 'view_plans' },
      { label: 'Update Co-Applicant', action_id: 'update_coapplicant' },
    ],
  },

  complex: {
    type: 'composite',
    reply: 'This is a complex cross-agency medical referral. I have extracted the key information and mapped the route for you:',
    bullet_points: [
      { icon: 'what', label: 'Core Issue', value: 'Cross-agency neuro-rehabilitation coordination required' },
      { icon: 'who', label: 'Lead Coordinator', value: 'Dr. Chen Wei (NUH Neurology)' },
      { icon: 'when', label: 'First Appointment', value: 'Next Monday, 9:00 AM' },
    ],
    special_components: [
      {
        component_name: 'RouteCard',
        data: {
          routes: [
            { step: 1, title: 'NUH Neurology', desc: 'Complete specialist assessment' },
            { step: 2, title: 'AIC Care Coordinator', desc: 'Financial subsidy review' },
            { step: 3, title: 'Community Social Work', desc: 'Post-care support & follow-up' },
          ],
        },
      },
    ],
  },

  progress: {
    type: 'composite',
    reply: 'Your current application progress is shown below:',
    bullet_points: [
      { icon: 'what', label: 'Application', value: 'Work Permit Renewal' },
      { icon: 'when', label: 'Estimated Completion', value: '3-5 working days' },
    ],
    special_components: [
      {
        component_name: 'ProgressCard',
        data: {
          progress: 65,
          status: 'Under Review by MOM',
        },
      },
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
    return MOCK_RESPONSES.complex;
  }
  if (lower.includes('progress') || lower.includes('status') || lower.includes('permit') || lower.includes('renewal')) {
    return MOCK_RESPONSES.progress;
  }
  // cycle through for generic
  return MOCK_RESPONSES[responseKeys[Math.floor(Math.random() * responseKeys.length)]];
}
