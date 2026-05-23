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
import { runActionSequence } from '../agent/executor';
import { WORK_PERMIT_RENEWAL_DEMO } from '../agent/demoScripts';
import styles from './WorkspacePage.module.css';

let msgCounter = 0;
const nextId = () => `msg-${++msgCounter}-${Date.now()}`;

/* ─── Demo triggers ──────────────────────────────────────────── */
const WP_RENEWAL_TRIGGER = /(renew|续约|更新).{0,12}(work.?permit|permit|工作准证|准证|wp)|wp.?renew/i;

const QUICK_STARTERS = [
  { label: '🚀 Renew Work Permit (Demo)', text: 'I need to renew my work permit', isAgent: true },
  { label: 'Check my HDB application status', text: 'Check my HDB application status', isAgent: false },
  { label: 'I need a medical referral', text: 'I need a medical referral', isAgent: false },
  { label: 'Help with unemployment benefits', text: 'Help with unemployment benefits', isAgent: false },
];

export default function WorkspacePage() {
  const {
    role, logout, currentUser,
    messages, addMessage, clearMessages,
    sessionId, setSessionId,
    backendAvailable, setBackendAvailable,
  } = useAppStore();

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
  const pendingAskRef = useRef<{ msgId: string; resolve: (v: string) => void } | null>(null);

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

  /* ── Handle user's answer to an ask_user prompt ── */
  const handleAgentAnswer = useCallback((msgId: string, answer: string) => {
    if (pendingAskRef.current?.msgId === msgId) {
      updateMessageAgent(msgId, { answer });
      pendingAskRef.current.resolve(answer);
      pendingAskRef.current = null;
    }
  }, [updateMessageAgent]);

  /* ── Run the agent demo ── */
  const startAgentDemo = useCallback(async (kickoffText: string) => {
    // 1. push user message
    addMessage({
      id: nextId(),
      role: 'user',
      content: kickoffText,
      timestamp: Date.now(),
    });

    // 2. push "agent started" message
    addMessage({
      id: nextId(),
      role: 'assistant',
      agent: { kind: 'started', title: 'Work Permit Renewal — Auto-pilot' },
      timestamp: Date.now(),
    });

    // 3. open panel
    setCurrentSite('mom-renewal');
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
    const result = await runActionSequence(WORK_PERMIT_RENEWAL_DEMO, stageRef.current, {
      setHighlight: (target, label) => setHighlight({ target, label }),
      setNarration: (msg) => setNarration(msg),
      askUser: (field, prompt) =>
        new Promise<string>((resolve) => {
          const msgId = nextId();
          addMessage({
            id: msgId,
            role: 'assistant',
            agent: { kind: 'ask_user', field, prompt },
            timestamp: Date.now(),
          });
          pendingAskRef.current = { msgId, resolve };
        }),
    });

    // 6. read caseId from the mock site itself (more reliable than the action payload)
    const caseEl = stageRef.current?.querySelector('[data-agent-id="case-id-value"]');
    const caseId = result.caseId || caseEl?.textContent?.trim() || 'WP00000-0000';

    // 7. push "agent done" message
    addMessage({
      id: nextId(),
      role: 'assistant',
      agent: {
        kind: 'done',
        summary: 'Work Permit renewal submitted. SMS notification will arrive in 3-5 working days.',
        caseId,
      },
      timestamp: Date.now(),
    });

    setAgentRunning(false);
    setNarration('Done. Application submitted successfully.');
    setHighlight({ target: null });
  }, [addMessage]);

  /* ── Send message (with agent trigger detection) ── */
  const handleSend = async (overrideText?: string, forceAgent?: boolean) => {
    const text = (overrideText ?? input).trim();
    if (!text || agentRunning) return;

    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    // Trigger agent demo on matching prompt
    if (forceAgent || WP_RENEWAL_TRIGGER.test(text)) {
      await startAgentDemo(text);
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
    clearMessages();
    setInput('');
    setPanelOpen(false);
    setCurrentSite(null);
    setNarration('Ready');
  };

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
                Try the AI agent demo — I&apos;ll fill the entire MOM renewal form for you.
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
                />
              ))}
              <AnimatePresence>{isTyping && <TypingIndicator />}</AnimatePresence>
            </>
          )}
          <div ref={chatEndRef} />
        </div>
      </main>

      {/* ── Input Bar ── */}
      <div className={styles.inputBarWrap}>
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
    </div>
  );
}
