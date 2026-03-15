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
    // Refresh routine every 10 seconds to catch minute changes promptly
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
        
        // Sync background change with the minute
        const currentMinute = new Date().getMinutes();
        const newBgIndex = currentMinute % backgroundImages.length;
        if (newBgIndex !== bgIndex) {
            setBgIndex(newBgIndex);
        }
      }
    } catch (error) {
      console.error('Error fetching routine:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Check Freemium Limits
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
        if (!isPremium) {
           setMessageCount(prev => prev + 1);
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Service is currently unavailable. Please check backend.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLockedFeatureClick = (e) => {
    e.preventDefault();
    if (!isPremium) {
      setShowPaywall(true);
    } else {
      alert("This premium feature is coming soon!");
    }
  };

  return (
    <div 
      className="app-container dashboard-layout"
      style={{
        backgroundImage: `url(${backgroundImages[bgIndex]})`,
        transition: 'background-image 2s ease-in-out'
      }}
    >
      {/* LEFT NAVIGATION SIDEBAR */}
      <nav className="left-sidebar">
        <div className="sidebar-logo">
          <h2>SvmGpt</h2>
          {isPremium ? (
            <span className="premium-badge active">Premium</span>
          ) : (
            <span className="premium-badge free">Free Tier</span>
          )}
        </div>
        
        <ul className="nav-menu">
          <li
            className={`nav-item ${activeView === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveView('chat')}
          >
            <span className="icon">💬</span>
            <span className="label">Spiritual Chat</span>
          </li>
          <li
            className={`nav-item ${activeView === 'routine' ? 'active' : ''}`}
            onClick={() => setActiveView('routine')}
          >
            <span className="icon">📅</span>
            <span className="label">Daily Routine</span>
          </li>
          <li className="nav-item locked" onClick={handleLockedFeatureClick}>
            <span className="icon">✨</span>
            <span className="label">Kundli & Astrology</span>
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

      {/* MAIN CONTENT AREA — switches between Chat and Routine */}
      {activeView === 'routine' ? (
        <div className="main-content routine-view-wrapper">
          <RoutineScreen routine={routine} />
        </div>
      ) : (
        <>
          <div className="main-content">
            <header className="app-header">
              <div className="header-title-container">
                <h1>SvmGpt</h1>
              </div>
              <p className="subtitle">Wisdom from the Inner You &amp; Beyond</p>
            </header>
            
            <main className="chat-container">
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
            </main>
          </div>

          <aside className="sidebar">
            {routine ? (
              <div className="routine-card fade-in">
                <h2>Today's Focus</h2>
                <div className="time-badge">{routine.day} • {routine.time}</div>
                
                <section className="routine-section">
                  <h3>Deity</h3>
                  <p>{routine.god}</p>
                </section>

                <section className="routine-section">
                  <h3>Current Wisdom</h3>
                  <blockquote className="quote">"{routine.quote}"</blockquote>
                </section>

                <section className="routine-section">
                  <h3>Routine &amp; Exercise</h3>
                  <p>{routine.routine}</p>
                </section>

                <section className="routine-section">
                  <h3>Prayer</h3>
                  <p className="prayer">{routine.prayer}</p>
                </section>

                <button
                  className="sidebar-routine-btn"
                  onClick={() => setActiveView('routine')}
                >
                  📅 Full Daily Routine →
                </button>
              </div>
            ) : (
              <div className="routine-card loading-state">
                Loading routines...
              </div>
            )}
          </aside>
        </>
      )}

      {/* Premium Subscription Paywall Modal */}
      {showPaywall && (
        <div className="paywall-overlay fade-in">
          <div className="paywall-modal">
            <h2>Unlock SvmGpt Premium</h2>
            <p className="paywall-desc">
              You've reached your daily limit of 3 free spiritual insights. 
              Upgrade to Premium to continue your journey deeply into the self.
            </p>
            
            <ul className="premium-features">
              <li>✨ Unlimited Daily Messages</li>
              <li>🧘‍♂️ Personalized Spiritual Coaching</li>
              <li>🕉️ Direct Astrological Insights</li>
              <li>🎧 Exclusive Audio Meditations</li>
            </ul>

            <div className="pricing">
              <span className="price">Free</span>
              <span className="period">Forever</span>
            </div>

            <button 
              className="upgrade-btn glowing" 
              onClick={() => {
                setIsPremium(true);
                setShowPaywall(false);
              }}
            >
              Unlock Premium for Free
            </button>
            <button 
              className="close-paywall-btn" 
              onClick={() => setShowPaywall(false)}
            >
              Maybe Later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
