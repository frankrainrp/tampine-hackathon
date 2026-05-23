import { useState, useRef, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import type { ChatMessage as ChatMessageType } from '../store/useAppStore';
import { getMockResponse } from '../data/mockResponses';
import {
  checkHealth,
  createSession,
  sendMessage as apiSendMessage,
  testApiConnection,
} from '../api/client';
import ChatMessage, { TypingIndicator } from '../components/ChatMessage';
import AgentPanel from '../components/AgentPanel/AgentPanel';
import type { MockSiteId } from '../components/AgentPanel/AgentPanel';
import ConfirmModal from '../components/ConfirmModal/ConfirmModal';
import type { ConfirmField } from '../components/ConfirmModal/ConfirmModal';
import { runActionSequence } from '../agent/executor';
import { CDC_VOUCHER_DEMO } from '../agent/demoScripts';
import { speak, stopSpeech, speechSupported as isSpeechSynthSupported } from '../agent/voice';
import { maskValue, resetPiiStore } from '../agent/piiMask';
import styles from './WorkspacePage.module.css';

let msgCounter = 0;
const nextId = () => `msg-${++msgCounter}-${Date.now()}`;

/* ─── Demo triggers ──────────────────────────────────────────── */
const CDC_TRIGGER = /(claim|领|拿|申请|get).{0,18}(cdc|voucher|消费券|代金券|vouchers?)|cdc.?voucher|消费券/i;

const QUICK_STARTERS = [
  { label: '🎟️ Claim my CDC Vouchers', text: 'I want to claim my CDC vouchers', isAgent: true },
  { label: 'Check my HDB application', text: 'Check my HDB application status', isAgent: false },
  { label: 'Book a polyclinic appointment', text: 'Help me book a polyclinic appointment', isAgent: false },
  { label: 'Help with healthcare subsidies', text: 'Help with healthcare subsidies', isAgent: false },
];

export default function WorkspacePage() {
  const {
    role, logout, currentUser,
    messages, addMessage, clearMessages,
    sessionId, setSessionId,
    backendAvailable, setBackendAvailable,
    speechMuted, toggleSpeechMuted,
  } = useAppStore();
  const speechAvailable = isSpeechSynthSupported();

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(false);

  /* ── Agent state ── */
  const [agentRunning, setAgentRunning] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(() => {
    if (typeof window === 'undefined') return 620;
    const saved = window.localStorage.getItem('agent-panel-width');
    if (saved) {
      const n = parseInt(saved, 10);
      if (!Number.isNaN(n) && n >= 360) return n;
    }
    return Math.min(720, Math.max(420, Math.floor(window.innerWidth * 0.48)));
  });
  const [currentSite, setCurrentSite] = useState<MockSiteId | null>(null);
  const [narration, setNarration] = useState('Ready');
  const [highlight, setHighlight] = useState<{ target: string | null; label?: string }>({ target: null });
  const stageRef = useRef<HTMLDivElement | null>(null);
  const pendingAskRef = useRef<{
    msgId: string;
    field: string;
    resolve: (v: string) => void;
  } | null>(null);

  /* Confirm modal state */
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    subtitle?: string;
    fields: ConfirmField[];
    resolve: (ok: boolean) => void;
  } | null>(null);

  /* Persist panel width */
  useEffect(() => {
    window.localStorage.setItem('agent-panel-width', String(panelWidth));
  }, [panelWidth]);

  /* ── Voice input ── */
  const [isListening, setIsListening] = useState(false);
  const [speechSupported] = useState(() =>
    typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  );
  const recognitionRef = useRef<any>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* ── Backend health check on mount ── */
  useEffect(() => {
    checkHealth()
      .then((h) => {
        setBackendAvailable(h.ok);
        setAiConfigured(h.ai_configured);
        if (h.ai_configured) testApiConnection().catch(() => {});
      })
      .catch(() => setBackendAvailable(false));
  }, [setBackendAvailable]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  /* ── Update an existing agent message (e.g. mark ask_user answered) ── */
  const updateMessageAgent = useCallback((msgId: string, patch: Partial<ChatMessageType['agent']>) => {
    useAppStore.setState((s) => ({
      messages: s.messages.map((m) =>
        m.id === msgId ? { ...m, agent: { ...m.agent!, ...patch } as any } : m,
      ),
    }));
  }, []);

  /* ── Handle user's answer to an ask_user prompt ──
   * The raw value is PII-masked locally before anything else sees it:
   *   - chat displays the redacted form (e.g. "S••••••A")
   *   - executor receives the semantic token (e.g. "[NRIC_001]") and types
   *     THAT into the mock site, so the "cloud" / form layer never sees the
   *     original. The real value stays in the in-memory PII store.       */
  const handleAgentAnswer = useCallback((msgId: string, rawAnswer: string) => {
    const pending = pendingAskRef.current;
    if (pending?.msgId !== msgId) return;

    const masked = maskValue(pending.field, rawAnswer);
    updateMessageAgent(msgId, {
      answer: masked.display,
      maskedToken: masked.token,
      maskedDisplay: masked.display,
    });

    pending.resolve(masked.token);
    pendingAskRef.current = null;
  }, [updateMessageAgent]);

  /* ── Run the actual agent demo (after prep confirmation) ── */
  const runAgentDemo = useCallback(async () => {
    // push "agent started" message
    addMessage({
      id: nextId(),
      role: 'assistant',
      agent: { kind: 'started', title: 'CDC Voucher Claim — Auto-pilot' },
      timestamp: Date.now(),
    });

    // open panel
    setCurrentSite('cdc-voucher');
    setPanelOpen(true);
    setAgentRunning(true);
    setNarration('Initializing agent...');

    // 4. wait for slide-in
    await new Promise((r) => setTimeout(r, 750));
    if (!stageRef.current) {
      setAgentRunning(false);
      return;
    }

    // 5. run sequence
    const result = await runActionSequence(CDC_VOUCHER_DEMO, stageRef.current, {
      setHighlight: (target, label) => setHighlight({ target, label }),
      setNarration: (msg) => {
        setNarration(msg);
        speak(msg, { muted: useAppStore.getState().speechMuted });
      },
      askUser: (field, prompt) =>
        new Promise<string>((resolve) => {
          const msgId = nextId();
          addMessage({
            id: msgId,
            role: 'assistant',
            agent: { kind: 'ask_user', field, prompt },
            timestamp: Date.now(),
          });
          pendingAskRef.current = { msgId, field, resolve };
          speak(prompt, { muted: useAppStore.getState().speechMuted, interrupt: true });
        }),
      askConfirm: (title, subtitle, fields) =>
        new Promise<boolean>((resolve) => {
          setConfirmModal({
            title,
            subtitle,
            fields,
            resolve: (ok) => {
              setConfirmModal(null);
              resolve(ok);
            },
          });
          // Read out the title + total/headline (first highlighted field) so an
          // elderly user without good eyesight still hears what they're approving.
          const headline = fields.find((f) => f.highlight) ?? fields[0];
          const speech =
            `${title}. ${subtitle ? subtitle + '. ' : ''}` +
            (headline ? `${headline.label}: ${headline.value}.` : '');
          speak(speech, { muted: useAppStore.getState().speechMuted, interrupt: true });
        }),
    });

    if (result.cancelled) {
      // 6a. user declined at the confirm modal — push a cancellation note, not a done card
      const cancelMsg = "I didn't submit anything. Tell me what you'd like to change and we can try again.";
      addMessage({
        id: nextId(),
        role: 'assistant',
        agent: {
          kind: 'done',
          title: 'Cancelled',
          summary: cancelMsg,
        },
        timestamp: Date.now(),
      });
      setAgentRunning(false);
      setNarration('Cancelled — nothing was submitted.');
      setHighlight({ target: null });
      speak(cancelMsg, { muted: useAppStore.getState().speechMuted, interrupt: true });
      return;
    }

    // 6b. read caseId from the mock site itself (more reliable than the action payload)
    const caseEl = stageRef.current?.querySelector('[data-agent-id="case-id-value"]');
    const caseId = result.caseId || caseEl?.textContent?.trim() || 'CDC2026-00000';

    // 7. push "agent done" message
    const doneSummary = 'S$ 300 in CDC Vouchers claimed. Collect at Our Tampines Hub by 30 June 2026.';
    addMessage({
      id: nextId(),
      role: 'assistant',
      agent: {
        kind: 'done',
        summary: doneSummary,
        caseId,
      },
      timestamp: Date.now(),
    });

    setAgentRunning(false);
    setNarration('Done. Vouchers claimed successfully.');
    setHighlight({ target: null });
    speak(
      `All done! ${doneSummary} Your case reference is ${caseId}.`,
      { muted: useAppStore.getState().speechMuted, interrupt: true },
    );
  }, [addMessage]);

  /* ── Push the prep-list card (step before runAgentDemo) ── */
  const startWithPrepCheck = useCallback((kickoffText: string) => {
    // 1. push user message
    addMessage({
      id: nextId(),
      role: 'user',
      content: kickoffText,
      timestamp: Date.now(),
    });

    // 2. push prep list — wait for user confirm
    addMessage({
      id: nextId(),
      role: 'assistant',
      agent: {
        kind: 'prep_list',
        title: "Before we start, you'll need:",
        items: [
          { icon: '🪪', label: 'Your NRIC', desc: 'Identity card number for Singpass login' },
          { icon: '📍', label: 'Where to collect', desc: 'A Tampines location near you' },
          { icon: '⏱️', label: 'About 2 minutes', desc: "I'll do the rest — you just confirm" },
        ],
      },
      timestamp: Date.now(),
    });

    speak(
      "Before we begin, please make sure you have your NRIC ready and pick a collection point in Tampines. I'll do the rest. Tap yes when you are ready.",
      { muted: useAppStore.getState().speechMuted, interrupt: true },
    );
  }, [addMessage]);

  const handlePrepConfirm = useCallback((msgId: string) => {
    updateMessageAgent(msgId, { confirmed: true });
    /* slight delay so the "Ready..." line is visible before panel slides in */
    setTimeout(() => runAgentDemo(), 600);
  }, [updateMessageAgent, runAgentDemo]);

  const handlePrepCancel = useCallback((msgId: string) => {
    updateMessageAgent(msgId, { cancelled: true });
  }, [updateMessageAgent]);

  /* ── Send message (with agent trigger detection) ── */
  const handleSend = async (overrideText?: string, forceAgent?: boolean) => {
    const text = (overrideText ?? input).trim();
    if (!text || agentRunning) return;

    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    // Trigger agent demo on matching prompt → show prep check first
    if (forceAgent || CDC_TRIGGER.test(text)) {
      startWithPrepCheck(text);
      return;
    }

    // Otherwise → standard chat
    addMessage({
      id: nextId(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    });
    setIsTyping(true);

    try {
      if (backendAvailable) {
        let sid = sessionId;
        if (!sid) {
          const newSession = await createSession(role!, text.slice(0, 30));
          sid = newSession.id;
          setSessionId(sid);
        }
        const result = await apiSendMessage(sid, text);
        addMessage({
          id: nextId(),
          role: 'assistant',
          aiResponse: result.ai_response,
          timestamp: Date.now(),
        });
      } else {
        await new Promise((r) => setTimeout(r, 800));
        addMessage({
          id: nextId(),
          role: 'assistant',
          aiResponse: getMockResponse(text),
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      addMessage({
        id: nextId(),
        role: 'assistant',
        aiResponse: {
          reply: `❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
          fields: [{ type: 'step', label: 'Tip', value: 'Check the backend or API key.' }],
        },
        timestamp: Date.now(),
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  /* ── Voice input ── */
  const toggleVoiceInput = () => {
    if (!speechSupported) return;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e: any) => {
      let transcript = '';
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
      setInput(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.start();
  };

  /* ── Reset ── */
  const handleNewChat = () => {
    if (agentRunning) return;
    stopSpeech();
    resetPiiStore();
    clearMessages();
    setInput('');
    setPanelOpen(false);
    setCurrentSite(null);
    setNarration('Ready');
  };

  const handleToggleMute = () => {
    toggleSpeechMuted();
    // If we're muting mid-narration, cut it off immediately.
    if (!speechMuted) stopSpeech();
  };

  /* Stop speech on unmount */
  useEffect(() => stopSpeech, []);

  /* CSS var consumed by chatArea + inputBarWrap so they shrink when panel is open */
  const layoutStyle = {
    ['--panel-width' as any]: panelOpen ? `${panelWidth}px` : '0px',
  };

  return (
    <div className={styles.workspace} style={layoutStyle}>
      {/* ── Top Bar ── */}
      <header className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <button className={styles.menuBtn} onClick={handleNewChat} aria-label="New conversation">
            <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/></svg>
          </button>
          <span className={styles.topBarTitle}>Smart Service Agent</span>
        </div>
        <div className={styles.topBarRight}>
          <span
            className={styles.statusDot}
            title={!backendAvailable ? 'Backend offline' : aiConfigured ? 'AI connected' : 'AI not configured'}
            data-online={backendAvailable}
            data-ai={aiConfigured}
          />
          {speechAvailable && (
            <button
              className={styles.muteBtn}
              onClick={handleToggleMute}
              aria-label={speechMuted ? 'Unmute voice' : 'Mute voice'}
              title={speechMuted ? 'Voice off — tap to enable' : 'Voice on — tap to mute'}
              data-muted={speechMuted}
            >
              {speechMuted ? (
                /* speaker with X — muted */
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.5 12L19 9.5l-1.5-1.5L15 10.5 12.5 8 11 9.5 13.5 12 11 14.5 12.5 16 15 13.5 17.5 16 19 14.5 16.5 12zM3 9v6h4l5 5V4L7 9H3z"/>
                </svg>
              ) : (
                /* speaker with waves — active */
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
              )}
            </button>
          )}
          <span className={styles.roleBadge}>
            {currentUser ? `${currentUser.avatar} ${currentUser.display_name}` : role}
          </span>
          <button className={styles.logoutBtn} onClick={logout} aria-label="Sign out">
            <svg viewBox="0 0 24 24"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
          </button>
        </div>
      </header>

      {/* ── Main Chat ── */}
      <main className={styles.main}>
        <div className={styles.chatArea}>
          {messages.length === 0 && !isTyping ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/></svg>
              </div>
              <h2 className={styles.emptyTitle}>
                {currentUser ? `Hello, ${currentUser.display_name}` : 'How can I help you today?'}
              </h2>
              <p className={styles.emptyHint}>
                Tap the red button below and I&apos;ll claim your CDC Vouchers for you — no
                clicking, no typing forms. Just confirm what I prepare.
              </p>
              <div className={styles.quickStarters}>
                {QUICK_STARTERS.map((q) => (
                  <button
                    key={q.label}
                    className={`${styles.quickBtn} ${q.isAgent ? styles.quickBtnPrimary : ''}`}
                    onClick={() => handleSend(q.text, q.isAgent)}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  msg={msg}
                  onAction={(prompt) => handleSend(prompt)}
                  onAgentAnswer={handleAgentAnswer}
                  onPrepConfirm={handlePrepConfirm}
                  onPrepCancel={handlePrepCancel}
                />
              ))}
              <AnimatePresence>{isTyping && <TypingIndicator />}</AnimatePresence>
            </>
          )}
          <div ref={chatEndRef} />
        </div>
      </main>

      {/* ── Input Bar ── */}
      <div className={styles.inputBarWrap} data-panel-open={panelOpen}>
        <div className={styles.inputBar}>
          <div className={styles.inputGlass}>
            <div className={styles.inputGlassInner} />
            <textarea
              ref={textareaRef}
              className={styles.textarea}
              placeholder={
                agentRunning
                  ? 'Agent is working — please wait or answer the prompt above...'
                  : 'Type a request, or try "renew my work permit"...'
              }
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={agentRunning}
            />
            <div className={styles.inputActions}>
              {speechSupported && (
                <button
                  className={`${styles.voiceBtn} ${isListening ? styles.voiceBtnActive : ''}`}
                  onClick={toggleVoiceInput}
                  aria-label="Voice input"
                  disabled={agentRunning}
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                  </svg>
                </button>
              )}
              <button
                className={styles.sendBtn}
                onClick={() => handleSend()}
                disabled={!input.trim() || agentRunning}
                aria-label="Send"
              >
                <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Agent Panel (right slide-in, resizable) ── */}
      <AgentPanel
        open={panelOpen}
        site={currentSite}
        narration={narration}
        highlightTarget={highlight.target}
        highlightLabel={highlight.label}
        onClose={() => {
          if (!agentRunning) setPanelOpen(false);
        }}
        stageRef={stageRef}
        width={panelWidth}
        onWidthChange={setPanelWidth}
      />

      {/* ── Pre-submission Confirmation Modal ── */}
      <ConfirmModal
        open={confirmModal !== null}
        title={confirmModal?.title || ''}
        subtitle={confirmModal?.subtitle}
        fields={confirmModal?.fields || []}
        onYes={() => confirmModal?.resolve(true)}
        onNo={() => confirmModal?.resolve(false)}
      />
    </div>
  );
}
