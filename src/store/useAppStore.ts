import { create } from 'zustand';

export type UserRole = 'resident' | 'staff' | null;

export interface BulletPoint {
  icon: 'who' | 'what' | 'when' | 'where' | 'why' | 'how';
  label: string;
  value: string;
}

export interface ActionButton {
  label: string;
  action_id: string;
}

export interface RouteStep {
  step: number;
  title: string;
  desc: string;
}

export interface SpecialComponent {
  component_name: 'RouteCard' | 'ProgressCard' | 'LoopCard';
  data: {
    routes?: RouteStep[];
    progress?: number;
    status?: string;
    agencies?: { name: string; status: string }[];
  };
}

export interface AIResponse {
  type: 'summary_list' | 'composite';
  reply: string;
  bullet_points: BulletPoint[];
  actions?: ActionButton[];
  special_components?: SpecialComponent[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content?: string;
  aiResponse?: AIResponse;
  timestamp: number;
  attachments?: { name: string; type: string; url: string }[];
}

interface AppState {
  /* Auth */
  role: UserRole;
  setRole: (role: UserRole) => void;
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
}

export const useAppStore = create<AppState>((set) => ({
  role: null,
  setRole: (role) => set({ role }),
  logout: () => set({ role: null, messages: [], sessionId: null }),

  sessionId: null,
  setSessionId: (id) => set({ sessionId: id }),

  backendAvailable: false,
  setBackendAvailable: (v) => set({ backendAvailable: v }),

  messages: [],
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  clearMessages: () => set({ messages: [], sessionId: null }),

  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
