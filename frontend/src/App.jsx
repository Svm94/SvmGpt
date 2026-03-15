import React, { useState, useEffect, useRef } from 'react';
import './index.css';
import RoutineScreen from './RoutineScreen';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

function App() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Namaste. I am your spiritual companion. How may I guide you today?' }
  ]);
  const [input, setInput] = useState('');
  const [routine, setRoutine] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);
  const [activeView, setActiveView] = useState('chat'); // 'chat' | 'routine'
  const backgroundImages = ['/bg.png', '/bg_1.png', '/bg_2.png', '/bg_3.png'];
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchRoutine();
    const interval = setInterval(fetchRoutine, 10000);
    return () => clearInterval(interval);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchRoutine = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/routines?_t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        setRoutine(data);
        const currentMinute = new Date().getMinutes();
        const newBgIndex = currentMinute % backgroundImages.length;
        if (newBgIndex !== bgIndex) setBgIndex(newBgIndex);
      }
    } catch (error) {
      console.error('Error fetching routine:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    if (!isPremium && messageCount >= 3) {
      setShowPaywall(true);
      return;
    }

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
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Service is currently unavailable. Please check backend.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLockedFeatureClick = () => {
    if (!isPremium) setShowPaywall(true);
    else alert("This premium feature is coming soon!");
  };

  return (
    <div
      className="app-container dashboard-layout"
      style={{
        backgroundImage: `url(${backgroundImages[bgIndex]})`,
        transition: 'background-image 2s ease-in-out'
      }}
    >
      {/* ── LEFT NAV SIDEBAR ── */}
      <nav className="left-sidebar">
        <div className="sidebar-logo">
          <h2>SvmGpt</h2>
          <span className={`premium-badge ${isPremium ? 'active' : 'free'}`}>
            {isPremium ? 'Premium' : 'Free Tier'}
          </span>
        </div>

        <ul className="nav-menu">
          <li className={`nav-item ${activeView === 'chat' ? 'active' : ''}`} onClick={() => setActiveView('chat')}>
            <span className="icon">💬</span>
            <span className="label">Spiritual Chat</span>
          </li>
          <li className={`nav-item ${activeView === 'routine' ? 'active' : ''}`} onClick={() => setActiveView('routine')}>
            <span className="icon">📅</span>
            <span className="label">Daily Routine</span>
          </li>
          <li className="nav-item locked" onClick={handleLockedFeatureClick}>
            <span className="icon">✨</span>
            <span className="label">Kundli &amp; Astrology</span>
            {!isPremium && <span className="lock-icon">🔒</span>}
          </li>
          <li className="nav-item locked" onClick={handleLockedFeatureClick}>
            <span className="icon">🎧</span>
            <span className="label">Guided Meditations</span>
            {!isPremium && <span className="lock-icon">🔒</span>}
          </li>
          <li className="nav-item locked" onClick={handleLockedFeatureClick}>
            <span className="icon">🛍️</span>
            <span className="label">Spiritual Shop</span>
            {!isPremium && <span className="lock-icon">🔒</span>}
          </li>
        </ul>

        <div className="sidebar-footer">
          <button className="settings-btn">⚙️ Settings</button>
        </div>
      </nav>

      {/* ── MAIN AREA ── */}
      {activeView === 'routine' ? (

        /* —— ROUTINE SCREEN —— */
        <div className="main-content routine-view-wrapper">
          <RoutineScreen routine={routine} />
        </div>

      ) : (

        /* —— CHAT SCREEN (3 sections) —— */
        <div className="main-content chat-layout">

          {/* ① TOP: Today's Focus */}
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

          {/* ② MIDDLE: Chat (scrollable) */}
          <section className="chat-section">
            <div className="messages-area">
              {messages.map((msg, idx) => (
                <div key={idx} className={`message-wrapper ${msg.role}`}>
                  <div className={`message-bubble ${msg.role}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="message-wrapper assistant">
                  <div className="message-bubble assistant loading">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input (fixed to bottom of chat section) */}
            <form className="input-area" onSubmit={handleSendMessage}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask for guidance or a verse..."
                disabled={isLoading}
              />
              <button type="submit" disabled={isLoading || !input.trim()}>
                Send
              </button>
            </form>
          </section>

          {/* ③ BOTTOM: View Full Routine */}
          <section className="routine-cta-bar">
            <button
              className="view-full-routine-btn"
              onClick={() => setActiveView('routine')}
            >
              <span className="routine-cta-icon">📅</span>
              <span className="routine-cta-text">
                <strong>View Full Daily Routine</strong>
                <small>Deity focus, exercises &amp; prayers</small>
              </span>
              <span className="routine-cta-arrow">→</span>
            </button>
          </section>

        </div>
      )}

      {/* ── PAYWALL MODAL ── */}
      {showPaywall && (
        <div className="paywall-overlay fade-in">
          <div className="paywall-modal">
            <h2>Unlock SvmGpt Premium</h2>
            <p className="paywall-desc">
              You've reached your daily limit of 3 free spiritual insights.
              Upgrade to continue your journey.
            </p>
            <ul className="premium-features">
              <li>✨ Unlimited Daily Messages</li>
              <li>🧘‍♂️ Personalized Spiritual Coaching</li>
              <li>🕉️ Direct Astrological Insights</li>
              <li>🎧 Exclusive Audio Meditations</li>
            </ul>
            <div className="pricing">
              <span className="price">Free</span>
              <span className="period"> Forever</span>
            </div>
            <button className="upgrade-btn glowing" onClick={() => { setIsPremium(true); setShowPaywall(false); }}>
              Unlock Premium for Free
            </button>
            <button className="close-paywall-btn" onClick={() => setShowPaywall(false)}>
              Maybe Later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
