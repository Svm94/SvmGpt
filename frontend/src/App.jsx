import React, { useState, useEffect, useRef } from 'react';
import './index.css';
import RoutineScreen from './RoutineScreen';
import PaywallScreen from './PaywallScreen';
import { useSubscription } from './useSubscription';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Views: 'chat' | 'paywall' | 'routine'
function App() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Namaste. I am your spiritual companion. How may I guide you today?' }
  ]);
  const [input, setInput] = useState('');
  const [routine, setRoutine] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPremiumPaywall, setShowPremiumPaywall] = useState(false); // chat limit paywall
  const [isPremium, setIsPremium] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [bgIndex, setBgIndex] = useState(0);
  const [activeView, setActiveView] = useState('chat');
  const [successToast, setSuccessToast] = useState('');
  const backgroundImages = ['/bg.png', '/bg_1.png', '/bg_2.png', '/bg_3.png'];
  const messagesEndRef = useRef(null);

  // ── Subscription state (RoutineState manager) ────────────────────────────
  const subscription = useSubscription();

  useEffect(() => {
    fetchRoutine();
    const interval = setInterval(fetchRoutine, 10000);
    return () => clearInterval(interval);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const fetchRoutine = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/routines?_t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        setRoutine(data);
        const min = new Date().getMinutes();
        const ni = min % backgroundImages.length;
        if (ni !== bgIndex) setBgIndex(ni);
      }
    } catch (error) {
      console.error('Error fetching routine:', error);
    }
  };

  // ── Show toast for 4 seconds ─────────────────────────────────────────────
  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 4000);
  };

  // ── Navigate to Full Routine (gated) ─────────────────────────────────────
  const handleViewRoutine = () => {
    if (subscription.isSubscribed || subscription.inGrace) {
      setActiveView('routine');
    } else {
      setActiveView('paywall');
    }
  };

  // ── Subscribe via Play Billing / stub ────────────────────────────────────
  const handleSubscribe = async () => {
    const result = await subscription.subscribe();
    if (result?.success) {
      showToast('🎉 Welcome to Full Daily Routine — your personalized day plan is unlocked!');
      setTimeout(() => setActiveView('routine'), 600);
    }
    return result;
  };

  // ── Return to Chat (no lock-in) ──────────────────────────────────────────
  const handleReturnToChat = () => {
    setActiveView('chat');
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    if (!isPremium && messageCount >= 3) { setShowPremiumPaywall(true); return; }

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
        if (!isPremium) setMessageCount(prev => prev + 1);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Service is currently unavailable. Please check backend.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLockedFeatureClick = () => {
    if (!isPremium) setShowPremiumPaywall(true);
    else alert('This premium feature is coming soon!');
  };

  return (
    <div
      className="app-container dashboard-layout"
      style={{ backgroundImage: `url(${backgroundImages[bgIndex]})`, transition: 'background-image 2s ease-in-out' }}
    >
      {/* ── Success Toast ── */}
      {successToast && (
        <div className="success-toast fade-in">
          {successToast}
        </div>
      )}

      {/* ── LEFT NAV ── */}
      <nav className="left-sidebar">
        <div className="sidebar-logo">
          <h2>SvmGpt</h2>
          <span className={`premium-badge ${isPremium ? 'active' : 'free'}`}>
            {isPremium ? 'Premium' : 'Free Tier'}
          </span>
        </div>

        <ul className="nav-menu">
          <li className={`nav-item ${activeView === 'chat' ? 'active' : ''}`} onClick={handleReturnToChat}>
            <span className="icon">💬</span>
            <span className="label">Spiritual Chat</span>
          </li>
          <li
            className={`nav-item ${activeView === 'routine' || activeView === 'paywall' ? 'active' : ''}`}
            onClick={handleViewRoutine}
          >
            <span className="icon">📅</span>
            <span className="label">Daily Routine</span>
            {!subscription.isSubscribed && !subscription.inGrace && (
              <span className="lock-icon">🔒</span>
            )}
          </li>
          <li className="nav-item locked" onClick={handleLockedFeatureClick}>
            <span className="icon">✨</span><span className="label">Kundli &amp; Astrology</span>
            {!isPremium && <span className="lock-icon">🔒</span>}
          </li>
          <li className="nav-item locked" onClick={handleLockedFeatureClick}>
            <span className="icon">🎧</span><span className="label">Guided Meditations</span>
            {!isPremium && <span className="lock-icon">🔒</span>}
          </li>
          <li className="nav-item locked" onClick={handleLockedFeatureClick}>
            <span className="icon">🛍️</span><span className="label">Spiritual Shop</span>
            {!isPremium && <span className="lock-icon">🔒</span>}
          </li>
        </ul>

        <div className="sidebar-footer">
          <button className="settings-btn">⚙️ Settings</button>
        </div>
      </nav>

      {/* ── MAIN CONTENT AREA ── */}

      {/* PAYWALL SCREEN */}
      {activeView === 'paywall' && (
        <div className="main-content paywall-view-wrapper">
          <PaywallScreen
            onSubscribe={handleSubscribe}
            onReturnToChat={handleReturnToChat}
            subscriptionLoading={subscription.loading}
            graceExpired={subscription.inGrace === false && !!subscription.expiryAt}
          />
        </div>
      )}

      {/* ROUTINE SCREEN (gated — only reached if subscribed or inGrace) */}
      {activeView === 'routine' && (
        <div className="main-content routine-view-wrapper">
          {/* Grace banner */}
          {subscription.inGrace && (
            <div className="grace-banner">
              ⚠️ Subscription expired — <button className="grace-renew-btn" onClick={() => setActiveView('paywall')}>renew now</button> to keep uninterrupted access.
            </div>
          )}
          {/* Offline badge */}
          {subscription.isOffline && (
            <div className="offline-badge">
              📶 Offline mode — read-only routines available until you reconnect.
            </div>
          )}
          <RoutineScreen routine={routine} />
        </div>
      )}

      {/* CHAT SCREEN (free, always accessible) */}
      {activeView === 'chat' && (
        <div className="main-content chat-layout">

          {/* ① TODAY'S FOCUS header */}
          <section className="todays-focus-header">
            {routine ? (
              <>
                <div className="focus-top-row">
                  <span className="focus-title">Today's Focus</span>
                  <span className="focus-day-badge">{routine.day} • {routine.time}</span>
                </div>
                <div className="focus-grid">
                  <div className="focus-item">
                    <span className="focus-label">🕉️ Deity</span>
                    <span className="focus-value">{routine.god}</span>
                  </div>
                  <div className="focus-item">
                    <span className="focus-label">📿 Prayer</span>
                    <span className="focus-value focus-prayer">{routine.prayer}</span>
                  </div>
                  <div className="focus-item focus-item-wide">
                    <span className="focus-label">💡 Current Wisdom</span>
                    <span className="focus-value focus-quote">"{routine.quote}"</span>
                  </div>
                  <div className="focus-item focus-item-wide">
                    <span className="focus-label">⚡ Routine &amp; Exercise</span>
                    <span className="focus-value">{routine.routine}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="focus-loading">Loading today's blessings...</div>
            )}
          </section>

          {/* ② CHAT section */}
          <section className="chat-section">
            <div className="messages-area">
              {messages.map((msg, idx) => (
                <div key={idx} className={`message-wrapper ${msg.role}`}>
                  <div className={`message-bubble ${msg.role}`}>{msg.content}</div>
                </div>
              ))}
              {isLoading && (
                <div className="message-wrapper assistant">
                  <div className="message-bubble assistant loading">
                    <span className="dot" /><span className="dot" /><span className="dot" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="input-area" onSubmit={handleSendMessage}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask for guidance or a verse..."
                disabled={isLoading}
              />
              <button type="submit" disabled={isLoading || !input.trim()}>Send</button>
            </form>
          </section>

          {/* ③ VIEW FULL ROUTINE CTA */}
          <section className="routine-cta-bar">
            <button className="view-full-routine-btn" onClick={handleViewRoutine}>
              <span className="routine-cta-icon">📅</span>
              <span className="routine-cta-text">
                <strong>View Full Daily Routine</strong>
                <small>
                  {subscription.isSubscribed
                    ? 'Open your personalized day plan'
                    : '₹500/month · Deity focus, exercises & prayers'}
                </small>
              </span>
              <span className="routine-cta-arrow">
                {subscription.isSubscribed ? '→' : '🔒'}
              </span>
            </button>
          </section>

        </div>
      )}

      {/* ── CHAT LIMIT PAYWALL MODAL ── */}
      {showPremiumPaywall && (
        <div className="paywall-overlay fade-in">
          <div className="paywall-modal">
            <h2>Unlock SvmGpt Premium</h2>
            <p className="paywall-desc">
              You've reached your limit of 3 free messages. Upgrade to continue your journey.
            </p>
            <ul className="premium-features">
              <li>✨ Unlimited Daily Messages</li>
              <li>🧘‍♂️ Personalized Spiritual Coaching</li>
              <li>🕉️ Direct Astrological Insights</li>
              <li>🎧 Exclusive Audio Meditations</li>
            </ul>
            <div className="pricing">
              <span className="price">Free</span><span className="period"> Forever</span>
            </div>
            <button className="upgrade-btn glowing" onClick={() => { setIsPremium(true); setShowPremiumPaywall(false); }}>
              Unlock Premium for Free
            </button>
            <button className="close-paywall-btn" onClick={() => setShowPremiumPaywall(false)}>
              Maybe Later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
