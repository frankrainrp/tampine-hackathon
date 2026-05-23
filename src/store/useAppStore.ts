import { create } from 'zustand';

export type UserRole = 'resident' | null;

export interface CurrentUser {
  id: string;
  username: string;
  display_name: string;
  role: 'resident';
  avatar: string;
}

export type FieldType =
  | 'location'
  | 'datetime'
  | 'documents'
  | 'contact'
  | 'cost'
  | 'eligibility'
  | 'person'
  | 'step'
  | 'note';

export interface FieldEntry {
  type: FieldType;
  label: string;
  value: string;
}

export interface ActionButton {
  label: string;
  prompt: string;
}

export interface AIResponse {
  reply: string;
  fields: FieldEntry[];
  actions?: ActionButton[];
}

export interface PrepItem {
  icon: string;
  label: string;
  desc: string;
}

export interface InputFieldSpec {
  /** Key the executor reads via `fill.valueFrom` */
  field: string;
  /** Short label shown above the input (e.g. "NRIC") */
  label: string;
  /** Helper text explaining why we need this */
  hint?: string;
  /** Input placeholder (e.g. "S1234567A") */
  placeholder?: string;
  /** If true, value is PII-masked locally before the cloud / form ever sees it */
  pii?: boolean;
  /** Optional regex check before allowing submission */
  pattern?: string;
}

/** One filled-in field, as stored on the message after the user submits the form */
export interface InputFieldFilled {
  field: string;
  display: string;       // what to show in chat (masked form for PII)
  token?: string;        // the semantic token if PII-masked, else absent
  raw?: string;          // raw value, only kept for non-PII fields
}

export interface AgentMessageData {
  kind: 'prep_list' | 'input_form' | 'started' | 'ask_user' | 'done';
  title?: string;
  /** For prep_list: items the user must have on hand */
  items?: PrepItem[];
  /** For prep_list / input_form: tracks whether user has confirmed */
  confirmed?: boolean;
  /** For prep_list: tracks cancellation (user clicked "let me check first") */
  cancelled?: boolean;
  /** For input_form: the spec the user fills in */
  inputs?: InputFieldSpec[];
  /** For input_form: filled values after submission */
  filled?: InputFieldFilled[];
  /** Optional submit button label override */
  submitLabel?: string;
  /** For ask_user (legacy / fallback): */
  field?: string;
  prompt?: string;
  /** For ask_user: filled in after user submits the answer (the masked display form) */
  answer?: string;
  /** For ask_user: the semantic token uploaded to the cloud, e.g. "[NRIC_001]" */
  maskedToken?: string;
  /** For ask_user: redacted display form, e.g. "S••••••A" */
  maskedDisplay?: string;
  /** For done: */
  summary?: string;
  caseId?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content?: string;
  aiResponse?: AIResponse;
  agent?: AgentMessageData;
  timestamp: number;
  attachments?: { name: string; type: string; url: string }[];
}

interface AppState {
  /* Auth */
  role: UserRole;
  currentUser: CurrentUser | null;
  setRole: (role: UserRole) => void;
  setCurrentUser: (user: CurrentUser | null) => void;
  loginAs: (user: CurrentUser) => void;
  logout: () => void;

  /* Session — 与后端 SQLite 同步 */
  sessionId: string | null;
  setSessionId: (id: string | null) => void;

  /* Backend Status */
  backendAvailable: boolean;
  setBackendAvailable: (v: boolean) => void;

  /* Chat */
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  clearMessages: () => void;

  /* UI */
  sidebarOpen: boolean;
  toggleSidebar: () => void;

  /* Voice narration */
  speechMuted: boolean;
  toggleSpeechMuted: () => void;
}

const initialMuted = (() => {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem('agent-speech-muted') === '1';
})();

export const useAppStore = create<AppState>((set) => ({
  role: null,
  currentUser: null,
  setRole: (role) => set({ role }),
  setCurrentUser: (user) => set({ currentUser: user }),
  loginAs: (user) => set({ role: user.role, currentUser: user, messages: [], sessionId: null }),
  logout: () => set({ role: null, currentUser: null, messages: [], sessionId: null }),

  sessionId: null,
  setSessionId: (id) => set({ sessionId: id }),

  backendAvailable: false,
  setBackendAvailable: (v) => set({ backendAvailable: v }),

  messages: [],
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  clearMessages: () => set({ messages: [], sessionId: null }),

  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  speechMuted: initialMuted,
  toggleSpeechMuted: () =>
    set((s) => {
      const next = !s.speechMuted;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('agent-speech-muted', next ? '1' : '0');
      }
      return { speechMuted: next };
    }),
}));

