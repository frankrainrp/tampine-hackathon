import { useState, useRef, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import type { ChatMessage as ChatMessageType } from '../store/useAppStore';
import { getMockResponse } from '../data/mockResponses';
import {
  checkHealth,
  createSession,
  sendMessage as apiSendMessage,
  listSessions,
  deleteSession,
  renameSession,
  getSessionMessages,
  testApiConnection,
} from '../api/client';
import type { DBSession } from '../api/client';
import ChatMessage, { TypingIndicator } from '../components/ChatMessage';
import styles from './WorkspacePage.module.css';

let msgCounter = 0;
function nextId() {
  return `msg-${++msgCounter}-${Date.now()}`;
}

const QUICK_STARTERS = [
  'Check my HDB application status',
  'I need a medical referral',
  'Track my permit renewal progress',
  'Help with unemployment benefits',
];

export default function WorkspacePage() {
  const {
    role, logout, currentUser,
    messages, addMessage, clearMessages,
    sidebarOpen, toggleSidebar,
    sessionId, setSessionId,
    backendAvailable, setBackendAvailable,
  } = useAppStore();

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; type: string; url: string }[]>([]);
  const [sessions, setSessions] = useState<DBSession[]>([]);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported] = useState(() =>
    typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  );
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // ── 启动时检测后端健康状态 ──────────────────────────────────────
  useEffect(() => {
    checkHealth()
      .then((h) => {
        setBackendAvailable(h.ok);
        setAiConfigured(h.ai_configured);
        console.log(
          `[API] Backend ${h.ok ? '✅ online' : '❌ offline'}`,
          `| AI: ${h.ai_configured ? '✅ configured' : '⚠️ not configured'}`,
          `| Model: ${h.model}`,
          `| URL: ${h.base_url}`,
        );
        if (h.ai_configured) {
          testApiConnection().then((t) => {
            if (t.ok) {
              console.log(`[API] ✅ Connection test passed (${t.latency_ms}ms)`);
            } else {
              console.warn(`[API] ⚠️ Connection test failed: ${t.error}`);
            }
          });
        }
      })
      .catch(() => {
        setBackendAvailable(false);
        console.warn('[API] Backend offline — falling back to mock responses');
      });
  }, []);

  // ── 加载历史会话列表 ─────────────────────────────────────────────
  const refreshSessions = useCallback(() => {
    if (!backendAvailable) return;
    listSessions().then(setSessions).catch(console.error);
  }, [backendAvailable]);

  useEffect(() => { refreshSessions(); }, [refreshSessions, sessionId]);

  // ── 自动滚动到底部 ──────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ── 点击外部关闭右键菜单 ────────────────────────────────────────
  useEffect(() => {
    const handler = () => setContextMenu(null);
    if (contextMenu) document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [contextMenu]);

  // ── 编辑时自动聚焦 ──────────────────────────────────────────────
  useEffect(() => {
    if (editingSessionId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingSessionId]);

  // ── Dropzone ────────────────────────────────────────────────────
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newAttach = acceptedFiles.map((f) => ({
      name: f.name,
      type: f.type,
      url: URL.createObjectURL(f),
    }));
    setAttachments((prev) => [...prev, ...newAttach]);
  }, []);

  const { getRootProps, getInputProps, open: openFileDialog } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
  });

  // ── 核心发送逻辑 ────────────────────────────────────────────────
  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text && attachments.length === 0) return;

    // 1. 立即显示用户消息（乐观更新）
    const userMsg: ChatMessageType = {
      id: nextId(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };
    addMessage(userMsg);
    setInput('');
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    setIsTyping(true);

    try {
      if (backendAvailable) {
        let sid = sessionId;

        if (!sid) {
          const newSession = await createSession(role!, text.slice(0, 30));
          sid = newSession.id;
          setSessionId(sid);
        }

        const result = await apiSendMessage(sid, text, attachments.length > 0 ? attachments : undefined);

        addMessage({
          id: nextId(),
          role: 'assistant',
          aiResponse: result.ai_response,
          timestamp: Date.now(),
        });
        refreshSessions();
      } else {
        await new Promise((r) => setTimeout(r, 1000 + Math.random() * 600));
        addMessage({
          id: nextId(),
          role: 'assistant',
          aiResponse: getMockResponse(text),
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      console.error('[Send Error]', err);
      addMessage({
        id: nextId(),
        role: 'assistant',
        aiResponse: {
          reply: `❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
          fields: [{ type: 'step', label: 'Tip', value: 'Check if the backend server is running on port 3001.' }],
        },
        timestamp: Date.now(),
      });
    } finally {
      setIsTyping(false);
    }
  };

  // ── 加载历史会话的消息 ──────────────────────────────────────────
  const handleLoadSession = async (sess: DBSession) => {
    clearMessages();
    setSessionId(sess.id);
    setContextMenu(null);
    if (sidebarOpen) toggleSidebar();

    if (!backendAvailable) return;

    try {
      const dbMessages = await getSessionMessages(sess.id);
      for (const m of dbMessages) {
        addMessage({
          id: m.id,
          role: m.role,
          content: m.content || undefined,
          aiResponse: m.ai_response || undefined,
          attachments: m.attachments || undefined,
          timestamp: m.created_at * 1000,
        });
      }
    } catch (err) {
      console.error('[Load Session]', err);
    }
  };

  // ── 删除会话 ────────────────────────────────────────────────────
  const handleDeleteSession = async (id: string) => {
    setContextMenu(null);
    try {
      await deleteSession(id);
      if (sessionId === id) {
        clearMessages();
      }
      refreshSessions();
    } catch (err) {
      console.error('[Delete Session]', err);
    }
  };

  // ── 开始重命名 ──────────────────────────────────────────────────
  const handleStartRename = (sess: DBSession) => {
    setContextMenu(null);
    setEditingSessionId(sess.id);
    setEditTitle(sess.title);
  };

  // ── 提交重命名 ──────────────────────────────────────────────────
  const handleSubmitRename = async () => {
    if (!editingSessionId || !editTitle.trim()) {
      setEditingSessionId(null);
      return;
    }
    try {
      await renameSession(editingSessionId, editTitle.trim());
      refreshSessions();
    } catch (err) {
      console.error('[Rename Session]', err);
    }
    setEditingSessionId(null);
  };

  // ── 新建对话 ────────────────────────────────────────────────────
  const handleNewChat = () => {
    clearMessages();
    setInput('');
    if (sidebarOpen) toggleSidebar();
  };

  // ── 右键菜单 ────────────────────────────────────────────────────
  const handleContextMenu = (e: React.MouseEvent, sessId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ id: sessId, x: e.clientX, y: e.clientY });
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

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── 语音输入 (Web Speech API) ──────────────────────────────────
  const toggleVoiceInput = () => {
    if (!speechSupported) return;

    if (isListening) {
      // 停止录音
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = 'en-US';
    recognition.continuous = false;  // 单次识别
    recognition.interimResults = true; // 实时显示中间结果

    recognition.onstart = () => {
      setIsListening(true);
      console.log('[Voice] 🎤 Listening...');
    };

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
      // 自动调整 textarea 高度
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      console.log('[Voice] 🎤 Stopped');
    };

    recognition.onerror = (event: any) => {
      console.error('[Voice] Error:', event.error);
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <div className={styles.workspace} {...getRootProps()}>
      <input {...getInputProps()} />

      {/* ── Top Bar ── */}
      <header className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <button className={styles.menuBtn} onClick={toggleSidebar} aria-label="Toggle sidebar">
            <svg viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
          </button>
          <span className={styles.topBarTitle}>Smart Service Agent</span>
        </div>
        <div className={styles.topBarRight}>
          <span
            className={styles.statusDot}
            title={
              !backendAvailable ? 'Backend offline (Mock mode)'
              : aiConfigured ? 'Backend online, AI connected'
              : 'Backend online, AI not configured'
            }
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

      {/* ── Sidebar ── */}
      <div
        className={`${styles.sidebarOverlay} ${sidebarOpen ? styles.sidebarOverlayVisible : ''}`}
        onClick={toggleSidebar}
      />
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <button className={styles.newChatBtn} onClick={handleNewChat}>
          <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/></svg>
          New Conversation
        </button>

        {/* ── 历史会话列表 (CRUD) ── */}
        {sessions.length > 0 && (
          <>
            <div className={styles.sidebarLabel}>Recent Conversations</div>
            <div className={styles.sessionList}>
              {sessions.map((sess) => (
                <div
                  key={sess.id}
                  className={`${styles.sessionItem} ${sess.id === sessionId ? styles.sessionItemActive : ''}`}
                  onClick={() => handleLoadSession(sess)}
                  onContextMenu={(e) => handleContextMenu(e, sess.id)}
                >
                  <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" fill="currentColor"/></svg>

                  {editingSessionId === sess.id ? (
                    <input
                      ref={editInputRef}
                      className={styles.sessionEditInput}
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSubmitRename();
                        if (e.key === 'Escape') setEditingSessionId(null);
                      }}
                      onBlur={handleSubmitRename}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className={styles.sidebarItemText}>{sess.title}</span>
                  )}

                  {/* 操作按钮（三点） */}
                  <button
                    className={styles.sessionMoreBtn}
                    onClick={(e) => { e.stopPropagation(); handleContextMenu(e, sess.id); }}
                    aria-label="More options"
                  >
                    ⋯
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {!backendAvailable && (
          <div className={styles.offlineNotice}>
            ⚠️ Backend offline<br/>Running in mock mode.<br/>Run <code>npm run server</code>
          </div>
        )}

        {backendAvailable && !aiConfigured && (
          <div className={styles.offlineNotice}>
            ⚠️ AI not configured<br/>Set <code>API_KEY</code> in <code>server/.env</code>
          </div>
        )}

        <div className={styles.sidebarLabel}>Quick Actions</div>
        <button className={styles.sidebarItem} onClick={() => { handleSend('Check my HDB application status'); if (sidebarOpen) toggleSidebar(); }}>
          <svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" fill="currentColor"/></svg>
          Housing Status
        </button>
        <button className={styles.sidebarItem} onClick={() => { handleSend('I need a medical referral'); if (sidebarOpen) toggleSidebar(); }}>
          <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z" fill="currentColor"/></svg>
          Medical Referral
        </button>
        <button className={styles.sidebarItem} onClick={() => { handleSend('Track my permit renewal progress'); if (sidebarOpen) toggleSidebar(); }}>
          <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.89 2 1.99 2H19c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z" fill="currentColor"/></svg>
          Permit Renewal
        </button>
      </aside>

      {/* ── 右键上下文菜单 ── */}
      {contextMenu && (
        <div
          className={styles.contextMenu}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className={styles.contextMenuItem}
            onClick={() => {
              const sess = sessions.find((s) => s.id === contextMenu.id);
              if (sess) handleStartRename(sess);
            }}
          >
            ✏️ Rename
          </button>
          <button
            className={`${styles.contextMenuItem} ${styles.contextMenuDanger}`}
            onClick={() => handleDeleteSession(contextMenu.id)}
          >
            🗑️ Delete
          </button>
        </div>
      )}

      {/* ── Main Chat ── */}
      <main className={styles.main}>
        <div className={styles.chatArea}>
          {messages.length === 0 && !isTyping ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/></svg>
              </div>
              <h2 className={styles.emptyTitle}>How can I help you today?</h2>
              <p className={styles.emptyHint}>
                {!backendAvailable
                  ? '⚠️ Mock mode — start the backend with npm run server to enable AI & SQLite.'
                  : aiConfigured
                    ? 'Connected to AI backend. Your conversations are saved.'
                    : 'Backend online, but AI key not set. Messages will be saved but responses are fallback.'}
              </p>
              <div className={styles.quickStarters}>
                {QUICK_STARTERS.map((q) => (
                  <button key={q} className={styles.quickBtn} onClick={() => handleSend(q)}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => <ChatMessage key={msg.id} msg={msg} onAction={handleSend} />)}
              <AnimatePresence>
                {isTyping && <TypingIndicator />}
              </AnimatePresence>
            </>
          )}
          <div ref={chatEndRef} />
        </div>
      </main>

      {/* ── Input Bar (Glassmorphism) ── */}
      <div className={styles.inputBarWrap}>
        <div className={styles.inputBar}>
          <button className={styles.uploadBtn} onClick={openFileDialog} aria-label="Upload file">
            <div className={styles.uploadOverlay} />
            <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          </button>

          <div className={styles.inputGlass}>
            <div className={styles.inputGlassInner} />
            {attachments.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', padding: '0.5rem 0 0 0', position: 'relative', zIndex: 5 }}>
                {attachments.map((a, i) => (
                  <div key={i} className={styles.attachmentChip}>
                    📎 {a.name}
                    <button className={styles.attachmentRemove} onClick={() => removeAttachment(i)}>×</button>
                  </div>
                ))}
              </div>
            )}
            <textarea
              ref={textareaRef}
              className={styles.textarea}
              placeholder={
                !backendAvailable ? 'Type your question here... (mock mode)'
                : aiConfigured ? 'Type your question here...'
                : 'Type your question... (AI not configured)'
              }
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <div className={styles.inputActions}>
              {/* 语音输入按钮 */}
              {speechSupported && (
                <button
                  className={`${styles.voiceBtn} ${isListening ? styles.voiceBtnActive : ''}`}
                  onClick={toggleVoiceInput}
                  aria-label={isListening ? 'Stop recording' : 'Start voice input'}
                  title={isListening ? 'Stop recording' : 'Voice input'}
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                  </svg>
                  {isListening && <span className={styles.voicePulse} />}
                </button>
              )}
              {/* 发送按钮 */}
              <button
                className={styles.sendBtn}
                onClick={() => handleSend()}
                disabled={!input.trim() && attachments.length === 0}
                aria-label="Send message"
              >
                <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
