import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, Send, X, Sparkles, Bot } from 'lucide-react';
import { aiApi } from '../services/Api';

const FAB_SIZE = 54;
const CHAT_W = 360;
const CHAT_H = 520;
const EDGE_GAP = 16;

const isMobile = () => window.innerWidth <= 480;

/* ─── position helpers ─────────────────────────────── */
function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

function snapFab(x, y) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isLeft = x + FAB_SIZE / 2 < vw / 2;
  return {
    x: isLeft ? EDGE_GAP : vw - FAB_SIZE - EDGE_GAP,
    y: clamp(y, 60, vh - FAB_SIZE - EDGE_GAP),
    edge: isLeft ? 'left' : 'right',
  };
}

function initChatPos(fabX, fabY) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = clamp(fabX + FAB_SIZE - CHAT_W, EDGE_GAP, vw - CHAT_W - EDGE_GAP);
  let top  = fabY - CHAT_H - 10;
  if (top < 60) top = fabY + FAB_SIZE + 10;
  top = clamp(top, 60, vh - CHAT_H - EDGE_GAP);
  return { left, top };
}
/* ──────────────────────────────────────────────────── */

const ChatWidget = () => {
  const [isOpen, setIsOpen]     = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [messages, setMessages] = useState([
    { text: 'Здравствуйте! Я ваш ИИ-помощник по расписанию Narxoz. Чем могу помочь?', isUser: false },
  ]);
  const [input, setInput]   = useState('');
  const [loading, setLoading] = useState(false);

  // FAB position (left, top)
  const [fab, setFab] = useState(null);      // { x, y, edge }
  const fabDrag = useRef({ active: false, mx: 0, my: 0, ox: 0, oy: 0, moved: false });

  // Chat window position (left, top) — desktop only
  const [chatPos, setChatPos] = useState(null); // { left, top }
  const chatDrag = useRef({ active: false, mx: 0, my: 0, ol: 0, ot: 0 });

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);
  const fabRef         = useRef(null);
  const chatHeaderRef  = useRef(null);

  /* init fab position */
  useEffect(() => {
    const vw = window.innerWidth, vh = window.innerHeight;
    setFab({ x: vw - FAB_SIZE - EDGE_GAP, y: vh - FAB_SIZE - 24, edge: 'right' });
  }, []);

  /* scroll on new message */
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { if (isOpen) scrollToBottom(); }, [messages]);

  /* open/close animation */
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsVisible(true), 10);
      setTimeout(scrollToBottom, 100);
      setTimeout(() => inputRef.current?.focus(), 200);
      if (!isMobile() && fab) setChatPos(initChatPos(fab.x, fab.y));
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  /* ── FAB pointer events ── */
  const fabPointerDown = useCallback((e) => {
    e.preventDefault();
    fabRef.current?.setPointerCapture(e.pointerId);
    fabDrag.current = { active: true, mx: e.clientX, my: e.clientY, ox: fab.x, oy: fab.y, moved: false };
  }, [fab]);

  const fabPointerMove = useCallback((e) => {
    const d = fabDrag.current;
    if (!d.active) return;
    const dx = e.clientX - d.mx, dy = e.clientY - d.my;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true;
    const vw = window.innerWidth, vh = window.innerHeight;
    setFab(prev => ({
      ...prev,
      x: clamp(d.ox + dx, 0, vw - FAB_SIZE),
      y: clamp(d.oy + dy, 0, vh - FAB_SIZE),
    }));
  }, []);

  const fabPointerUp = useCallback((e) => {
    const d = fabDrag.current;
    if (!d.active) return;
    d.active = false;
    if (!d.moved) {
      setIsOpen(true);
    } else {
      const vw = window.innerWidth, vh = window.innerHeight;
      const curX = clamp(d.ox + e.clientX - d.mx, 0, vw - FAB_SIZE);
      const curY = clamp(d.oy + e.clientY - d.my, 0, vh - FAB_SIZE);
      const { x, y, edge } = snapFab(curX, curY);
      setFab({ x, y, edge });
    }
  }, []);

  /* ── Chat header drag (desktop) ── */
  const chatHeaderPointerDown = useCallback((e) => {
    if (isMobile()) return;
    e.preventDefault();
    chatHeaderRef.current?.setPointerCapture(e.pointerId);
    chatDrag.current = { active: true, mx: e.clientX, my: e.clientY, ol: chatPos?.left ?? 0, ot: chatPos?.top ?? 0 };
  }, [chatPos]);

  const chatHeaderPointerMove = useCallback((e) => {
    const d = chatDrag.current;
    if (!d.active) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    setChatPos({
      left: clamp(d.ol + e.clientX - d.mx, 0, vw - CHAT_W),
      top:  clamp(d.ot + e.clientY - d.my, 0, vh - CHAT_H),
    });
  }, []);

  const chatHeaderPointerUp = useCallback(() => {
    chatDrag.current.active = false;
  }, []);

  /* ── Send message ── */
  const handleSend = async () => {
    if (!input.trim() || loading) return;
    setMessages(p => [...p, { text: input, isUser: true }]);
    setInput('');
    setLoading(true);
    try {
      const res = await aiApi.chatSend(input, null);
      setMessages(p => [...p, { text: res.answer || 'Нет ответа', isUser: false }]);
    } catch {
      setMessages(p => [...p, { text: 'Извините, произошла ошибка. Попробуйте позже.', isUser: false }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => setIsOpen(false), 280);
  };

  /* ── Computed styles ── */
  const fabStyle = fab
    ? { left: fab.x, top: fab.y, transition: fabDrag.current.active ? 'none' : 'left 0.32s cubic-bezier(.34,1.4,.64,1), top 0.32s cubic-bezier(.34,1.4,.64,1)' }
    : { right: EDGE_GAP, bottom: 24 };

  const chatWindowStyle = chatPos && !isMobile()
    ? { left: chatPos.left, top: chatPos.top }
    : {};

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }

        /* ═══ FAB ═══ */
        .cw-fab {
          position: fixed;
          width: ${FAB_SIZE}px;
          height: ${FAB_SIZE}px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(135deg, #C8102E 0%, #91001f 100%);
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: grab;
          box-shadow: 0 8px 28px rgba(200,16,46,0.42), 0 2px 8px rgba(0,0,0,0.15);
          z-index: 9999;
          touch-action: none;
          user-select: none; -webkit-user-select: none;
          overflow: visible;
        }
        .cw-fab::before {
          content: '';
          position: absolute; inset: 0; border-radius: 50%;
          background: radial-gradient(circle at 35% 28%, rgba(255,255,255,0.22), transparent 68%);
          pointer-events: none;
        }
        .cw-fab:active { cursor: grabbing; }

        .cw-fab-pulse {
          position: absolute; inset: -5px;
          border-radius: 50%;
          border: 2px solid rgba(200,16,46,0.40);
          animation: cwPulse 2.8s ease-out infinite;
          pointer-events: none;
        }
        @keyframes cwPulse {
          0%   { transform: scale(1);    opacity: .75; }
          70%  { transform: scale(1.38); opacity: 0; }
          100% { transform: scale(1.38); opacity: 0; }
        }

        /* ═══ Chat Window ═══ */
        .cw-window {
          position: fixed;
          width: ${CHAT_W}px;
          height: ${CHAT_H}px;
          border-radius: 20px;
          background: #fff;
          box-shadow: 0 24px 80px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08);
          display: flex; flex-direction: column;
          overflow: hidden;
          z-index: 9998;
          font-family: 'Inter', sans-serif;
          opacity: 0;
          transform: scale(0.88) translateY(12px);
          transform-origin: bottom right;
          transition: opacity 0.28s ease, transform 0.28s cubic-bezier(.34,1.4,.64,1);
          /* default desktop position — overridden by inline style */
          right: ${EDGE_GAP + FAB_SIZE / 2}px;
          bottom: ${EDGE_GAP + FAB_SIZE + 12}px;
        }
        .cw-window.visible { opacity: 1; transform: scale(1) translateY(0); }

        /* ═══ Header ═══ */
        .cw-header {
          background: linear-gradient(135deg, #C8102E 0%, #870013 100%);
          padding: 14px 16px;
          display: flex; align-items: center; gap: 11px;
          flex-shrink: 0;
          position: relative; overflow: hidden;
          cursor: grab;
          user-select: none; -webkit-user-select: none;
          touch-action: none;
        }
        .cw-header:active { cursor: grabbing; }
        .cw-header::after {
          content: ''; position: absolute; top: -28px; right: -28px;
          width: 90px; height: 90px; border-radius: 50%;
          background: rgba(255,255,255,0.07); pointer-events: none;
        }
        .cw-avatar {
          width: 37px; height: 37px; border-radius: 50%;
          background: rgba(255,255,255,0.18);
          display: flex; align-items: center; justify-content: center;
          border: 1.5px solid rgba(255,255,255,0.28);
          flex-shrink: 0; position: relative; z-index: 1;
        }
        .cw-title { color:#fff; font-weight:700; font-size:14.5px; line-height:1.2; }
        .cw-sub {
          display:flex; align-items:center; gap:5px;
          color: rgba(255,255,255,0.75); font-size:11px; margin-top:2px;
        }
        .cw-dot {
          width:7px; height:7px; border-radius:50%; background:#4ade80;
          animation: cwDot 2s ease-in-out infinite;
        }
        @keyframes cwDot { 0%,100%{opacity:1} 50%{opacity:.45} }
        .cw-close {
          background: rgba(255,255,255,0.15); border:none; border-radius:50%;
          width:30px; height:30px;
          display:flex; align-items:center; justify-content:center;
          color:#fff; cursor:pointer;
          transition:background .15s;
          position:relative; z-index:1; flex-shrink:0;
          margin-left: auto;
          touch-action: auto;
        }
        .cw-close:hover { background:rgba(255,255,255,0.28); }

        /* drag hint bar */
        .cw-drag-bar {
          width: 36px; height: 4px; border-radius: 2px;
          background: rgba(255,255,255,0.35);
          margin: 0 auto 2px;
          display: none;
        }

        /* ═══ Messages ═══ */
        .cw-body {
          flex:1; overflow-y:auto; padding:14px 14px;
          background:#f5f7fc; display:flex; flex-direction:column;
          gap:10px; scroll-behavior:smooth;
        }
        .cw-body::-webkit-scrollbar { width:4px; }
        .cw-body::-webkit-scrollbar-thumb { background:#d1d5db; border-radius:4px; }

        .cw-row { display:flex; align-items:flex-end; gap:8px; animation:cwMsg .22s ease-out; }
        @keyframes cwMsg { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .cw-row.user { flex-direction:row-reverse; }

        .cw-bot-av {
          width:28px; height:28px; border-radius:50%;
          background:linear-gradient(135deg,#C8102E,#870013);
          display:flex; align-items:center; justify-content:center;
          flex-shrink:0; box-shadow:0 2px 8px rgba(200,16,46,.28);
        }
        .cw-bubble {
          max-width:78%; padding:9px 13px; border-radius:16px;
          font-size:13.5px; line-height:1.55; word-break:break-word;
        }
        .cw-bubble.user {
          background:linear-gradient(135deg,#C8102E,#a00020);
          color:#fff; border-bottom-right-radius:4px;
          box-shadow:0 4px 14px rgba(200,16,46,.26);
        }
        .cw-bubble.bot {
          background:#fff; color:#1a1a2e; border-bottom-left-radius:4px;
          box-shadow:0 2px 10px rgba(0,0,0,.07);
          border:1px solid rgba(0,0,0,.06);
        }

        .cw-typing { display:flex; align-items:center; gap:5px; padding:11px 15px; }
        .cw-dot-t {
          width:7px; height:7px; border-radius:50%; background:#9ca3af;
          animation:cwTyp 1.2s ease-in-out infinite;
        }
        .cw-dot-t:nth-child(2){animation-delay:.2s}
        .cw-dot-t:nth-child(3){animation-delay:.4s}
        @keyframes cwTyp{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}

        /* ═══ Input ═══ */
        .cw-footer {
          padding:10px 12px; background:#fff;
          border-top:1px solid #f0f0f5;
          display:flex; align-items:center; gap:8px; flex-shrink:0;
        }
        .cw-input {
          flex:1; border:1.5px solid #e5e7eb; border-radius:22px;
          padding:9px 15px; font-size:13.5px; font-family:'Inter',sans-serif;
          outline:none; background:#f9fafb; color:#1a1a2e;
          transition:border-color .18s, box-shadow .18s, background .18s;
        }
        .cw-input:focus { border-color:#C8102E; background:#fff; box-shadow:0 0 0 3px rgba(200,16,46,.1); }
        .cw-input::placeholder { color:#9ca3af; }
        .cw-input:disabled { opacity:.6; cursor:not-allowed; }

        .cw-send {
          width:40px; height:40px; border-radius:50%; border:none;
          background:linear-gradient(135deg,#C8102E,#a00020);
          color:#fff; display:flex; align-items:center; justify-content:center;
          cursor:pointer; flex-shrink:0;
          box-shadow:0 4px 14px rgba(200,16,46,.38);
          transition:transform .15s cubic-bezier(.34,1.56,.64,1), opacity .15s;
        }
        .cw-send:hover:not(:disabled) { transform:scale(1.1); }
        .cw-send:active:not(:disabled) { transform:scale(0.93); }
        .cw-send:disabled { opacity:.38; cursor:not-allowed; transform:none; }

        .cw-hint {
          font-size:10.5px; color:#9ca3af; text-align:center;
          padding:0 14px 8px; background:#fff; font-family:'Inter',sans-serif;
        }

        /* ═══ Mobile ≤ 480px ═══ */
        @media (max-width: 480px) {
          .cw-window {
            position: fixed !important;
            left: 0 !important; right: 0 !important;
            bottom: 0 !important; top: auto !important;
            width: 100% !important;
            height: 93dvh !important;
            border-radius: 18px 18px 0 0 !important;
            transform-origin: bottom center !important;
          }
          .cw-window:not(.visible) { transform: translateY(40px) !important; }
          .cw-window.visible       { transform: translateY(0) !important; }
          .cw-header { cursor: default; padding-top: 8px; flex-direction: column; align-items: center; gap: 6px; }
          .cw-drag-bar { display: block; }
          .cw-header-row { display:flex; align-items:center; gap:11px; width:100%; }
          .cw-footer { padding-bottom: max(12px, env(safe-area-inset-bottom)); }
          .cw-hint   { padding-bottom: max(8px, env(safe-area-inset-bottom)); }
        }
        @media (min-width: 481px) {
          .cw-header-row { display:contents; }
        }
      `}</style>

      {/* ─── FAB ─── */}
      {!isOpen && fab && (
        <button
          ref={fabRef}
          className="cw-fab"
          style={fabStyle}
          onPointerDown={fabPointerDown}
          onPointerMove={fabPointerMove}
          onPointerUp={fabPointerUp}
          aria-label="Открыть чат"
        >
          <span className="cw-fab-pulse" />
          <MessageSquare size={23} />
        </button>
      )}

      {/* ─── Chat Window ─── */}
      {isOpen && (
        <div
          className={`cw-window ${isVisible ? 'visible' : ''}`}
          style={chatWindowStyle}
        >
          {/* Header — draggable on desktop */}
          <div
            className="cw-header"
            ref={chatHeaderRef}
            onPointerDown={chatHeaderPointerDown}
            onPointerMove={chatHeaderPointerMove}
            onPointerUp={chatHeaderPointerUp}
          >
            {/* Mobile drag bar */}
            <div className="cw-drag-bar" />

            <div className="cw-header-row">
              <div className="cw-avatar"><Bot size={18} color="#fff" /></div>
              <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
                <div className="cw-title">AI Помощник</div>
                <div className="cw-sub">
                  <span className="cw-dot" />
                  <span>Narxoz University</span>
                </div>
              </div>
              <button
                className="cw-close"
                onClick={handleClose}
                onPointerDown={e => e.stopPropagation()}
                aria-label="Закрыть"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="cw-body">
            {messages.map((msg, i) => (
              <div key={i} className={`cw-row ${msg.isUser ? 'user' : 'bot'}`}>
                {!msg.isUser && (
                  <div className="cw-bot-av"><Sparkles size={12} color="#fff" /></div>
                )}
                <div className={`cw-bubble ${msg.isUser ? 'user' : 'bot'}`}>
                  <span style={{ whiteSpace: 'pre-line' }}>{msg.text}</span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="cw-row bot">
                <div className="cw-bot-av"><Sparkles size={12} color="#fff" /></div>
                <div className="cw-bubble bot cw-typing">
                  <span className="cw-dot-t" /><span className="cw-dot-t" /><span className="cw-dot-t" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="cw-footer">
            <input
              ref={inputRef}
              type="text"
              className="cw-input"
              placeholder="Введите сообщение..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              disabled={loading}
            />
            <button
              className="cw-send"
              onClick={handleSend}
              disabled={loading || !input.trim()}
              aria-label="Отправить"
            >
              <Send size={16} />
            </button>
          </div>
          <div className="cw-hint">Enter — отправить</div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
