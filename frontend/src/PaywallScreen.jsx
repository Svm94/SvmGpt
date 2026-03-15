import React, { useState } from 'react';

const BENEFITS = [
  { icon: '🕉️', title: 'Daily Deity Focus',        desc: 'Morning mantra, wake-up time & deity guidance' },
  { icon: '🧘‍♂️', title: 'Full Routine Checklist',    desc: 'Exercise, food guidance, and mindful tasks' },
  { icon: '🌙', title: 'Night Reflection',           desc: 'Evening prayer and guided wind-down audio' },
  { icon: '📿', title: 'Sacred Prayers & Mantras',  desc: 'Curated day-wise prayers for every deity' },
  { icon: '🔄', title: 'Cross-Device Sync',          desc: 'Your routine synced via Firebase across devices' },
];

function PaywallScreen({ onSubscribe, onReturnToChat, subscriptionLoading, graceExpired }) {
  const [purchasing, setPurchasing] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubscribe = async () => {
    setPurchasing(true);
    setMessage('');
    const result = await onSubscribe();
    if (result?.success) {
      setMessage('✅ Welcome to Full Daily Routine! Your personalized day plan is now unlocked.');
    } else {
      setMessage('❌ Purchase could not be completed. Please try again.');
      setPurchasing(false);
    }
  };

  return (
    <div className="paywall-screen">
      {/* Header */}
      <div className="paywall-screen-header">
        <div className="paywall-lock-icon">🔒</div>
        <h1 className="paywall-title">Unlock Your Full<br />Spiritual Routine</h1>
        <p className="paywall-subtitle">
          A guided day plan tailored to the Hindu calendar —<br />
          deity focus, exercises, prayers &amp; evening reflection.
        </p>
      </div>

      {/* Teaser for expired-no-grace */}
      {graceExpired && (
        <div className="paywall-teaser-card">
          <span className="paywall-teaser-icon">✨</span>
          <div>
            <strong>Your routine is paused</strong>
            <p>Deity focus, exercises &amp; prayers — subscribe to restore full access.</p>
          </div>
        </div>
      )}

      {/* Benefits list */}
      <ul className="paywall-benefits">
        {BENEFITS.map((b) => (
          <li key={b.title} className="paywall-benefit-item">
            <span className="benefit-icon">{b.icon}</span>
            <div className="benefit-text">
              <strong>{b.title}</strong>
              <small>{b.desc}</small>
            </div>
            <span className="benefit-check">✓</span>
          </li>
        ))}
      </ul>

      {/* Price card */}
      <div className="paywall-price-card">
        <div className="paywall-price-main">
          <span className="paywall-currency">₹</span>
          <span className="paywall-amount">500</span>
          <span className="paywall-period">/month</span>
        </div>
        <p className="paywall-price-note">Auto-renewing · Cancel anytime · Billed via Google Play</p>
      </div>

      {/* Feedback message */}
      {message && <p className="paywall-message">{message}</p>}

      {/* CTAs */}
      <div className="paywall-cta-group">
        <button
          className={`paywall-subscribe-btn ${purchasing ? 'btn-loading' : ''}`}
          onClick={handleSubscribe}
          disabled={purchasing || subscriptionLoading}
        >
          {purchasing ? (
            <><span className="btn-spinner" /> Connecting to Play Store…</>
          ) : (
            '🛒 Subscribe Now — ₹500/month'
          )}
        </button>

        {/* Secondary CTA — always available, no lock-in */}
        <button
          className="paywall-free-chat-btn"
          onClick={onReturnToChat}
          disabled={purchasing}
        >
          💬 Continue with Free Chat
        </button>

        <p className="paywall-legal">
          By subscribing you agree to our{' '}
          <a href="#terms" className="paywall-link">Terms of Service</a>
          {' '}and{' '}
          <a href="#privacy" className="paywall-link">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}

export default PaywallScreen;
