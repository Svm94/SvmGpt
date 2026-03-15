import React, { useState } from 'react';

// Deity-specific data: themes and symbols
const DEITY_DATA = {
  'Shiva': {
    symbol: '🕉️',
    subtitle: 'Lord of Transformation',
    gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)',
    accentColor: '#4fc3f7',
  },
  'Hanuman': {
    symbol: '🐒',
    subtitle: 'Devotion & Strength',
    gradient: 'linear-gradient(135deg, #4a1942 0%, #c94b4b 100%)',
    accentColor: '#ff7043',
  },
  'Ganesha': {
    symbol: '🐘',
    subtitle: 'Remover of Obstacles',
    gradient: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
    accentColor: '#a5d6a7',
  },
  'Vishnu / Sai Baba': {
    symbol: '🌺',
    subtitle: 'Divine Preserver',
    gradient: 'linear-gradient(135deg, #1a237e 0%, #283593 50%, #3949ab 100%)',
    accentColor: '#90caf9',
  },
  'Durga / Lakshmi': {
    symbol: '✨',
    subtitle: 'Divine Abundance & Power',
    gradient: 'linear-gradient(135deg, #4a0080 0%, #880e4f 50%, #c62828 100%)',
    accentColor: '#ffd700',
  },
  'Lakshmi': {
    symbol: '🪷',
    subtitle: 'Divine Abundance',
    gradient: 'linear-gradient(135deg, #4a0080 0%, #880e4f 50%, #c62828 100%)',
    accentColor: '#ffd700',
  },
  'Shani': {
    symbol: '⚖️',
    subtitle: 'Karma & Justice',
    gradient: 'linear-gradient(135deg, #212121 0%, #424242 100%)',
    accentColor: '#ce93d8',
  },
  'Surya': {
    symbol: '☀️',
    subtitle: 'Cosmic Radiance',
    gradient: 'linear-gradient(135deg, #e65100 0%, #ff8f00 50%, #ffd600 100%)',
    accentColor: '#fff176',
  },
};

const DEFAULT_DEITY = {
  symbol: '🕉️',
  subtitle: 'Divine Presence',
  gradient: 'linear-gradient(135deg, #1a1a2e 0%, #4a0072 100%)',
  accentColor: '#ffd700',
};

function RoutineScreen({ routine }) {
  const [reminderSet, setReminderSet] = useState(false);
  const [reminderStatus, setReminderStatus] = useState('');

  const deityInfo = DEITY_DATA[routine?.god] || DEFAULT_DEITY;

  const handleSetReminder = async () => {
    if (!('Notification' in window)) {
      setReminderStatus('❌ Notifications are not supported in this browser.');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setReminderSet(true);
      setReminderStatus("✅ Reminder set! We'll remind you for your daily spiritual practice.");
      // Show an immediate confirmation notification
      new Notification('🕉️ SvmGpt Reminder Set', {
        body: `Your daily routine with ${routine?.god} is scheduled. Stay spiritually aligned!`,
        icon: '/favicon.ico',
      });
    } else {
      setReminderStatus('⚠️ Please allow notifications in your browser to set reminders.');
    }
  };

  if (!routine) {
    return (
      <div className="routine-screen">
        <div className="routine-screen-loading">
          <div className="loading-mandala">🕉️</div>
          <p>Loading your daily blessings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="routine-screen">
      {/* Header */}
      <div className="routine-screen-header">
        <h1 className="routine-screen-title">Daily Routine</h1>
        <div className="routine-day-badge">{routine.day} • {routine.time}</div>
      </div>

      {/* Scrollable content */}
      <div className="routine-screen-content">

        {/* Daily Deity Card */}
        <div
          className="deity-banner"
          style={{ background: deityInfo.gradient }}
        >
          <div className="deity-symbol">{deityInfo.symbol}</div>
          <div className="deity-text">
            <div className="deity-label">DAILY DEITY</div>
            <div className="deity-name">{routine.god}</div>
            <div className="deity-subtitle">{deityInfo.subtitle}</div>
          </div>
          <div className="deity-glow" style={{ background: deityInfo.accentColor }} />
        </div>

        {/* Spiritual Quote */}
        <div className="routine-full-card" style={{ '--card-accent': deityInfo.accentColor }}>
          <div className="routine-full-card-label">SPIRITUAL QUOTE</div>
          <blockquote className="routine-full-quote">
            "{routine.quote}"
          </blockquote>
          <div className="routine-full-card-source">— SvmGpt AI</div>
        </div>

        {/* Routine & Exercise */}
        <div className="routine-full-card" style={{ '--card-accent': deityInfo.accentColor }}>
          <div className="routine-full-card-label">⚡ ROUTINE & EXERCISE</div>
          <p className="routine-full-text">{routine.routine}</p>
        </div>

        {/* Prayer */}
        <div className="routine-full-card prayer-card" style={{ '--card-accent': deityInfo.accentColor }}>
          <div className="routine-full-card-label">🙏 PRAYER</div>
          <p className="routine-full-prayer">{routine.prayer}</p>
        </div>

        {/* Set Reminder Button */}
        <div className="set-reminder-section">
          {reminderStatus && (
            <p className="reminder-status">{reminderStatus}</p>
          )}
          <button
            className={`set-reminder-btn ${reminderSet ? 'reminder-btn-active' : ''}`}
            onClick={handleSetReminder}
            style={{
              background: reminderSet
                ? 'rgba(76, 175, 80, 0.3)'
                : `linear-gradient(135deg, rgba(80,50,120,0.8), ${deityInfo.accentColor}44)`,
              borderColor: reminderSet ? '#4caf50' : deityInfo.accentColor,
              boxShadow: reminderSet
                ? '0 0 20px rgba(76,175,80,0.3)'
                : `0 0 20px ${deityInfo.accentColor}33`,
            }}
          >
            {reminderSet ? '✅ Reminder Set!' : '🔔 Set Reminder'}
          </button>
        </div>

      </div>
    </div>
  );
}

export default RoutineScreen;
