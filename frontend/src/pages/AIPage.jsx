import React, { useState, useEffect } from 'react';
import { Brain, Send } from 'lucide-react';
import { API_BASE } from '../utils/config.js';

export function AISidebar() {
  const [aiAssistantLogs, setAiAssistantLogs] = useState([
    { role: 'assistant', content: 'Hello! I am your FamilySphere AI helper. Ask me about chores division, meal planning, or upcoming schedules! 🤖' }
  ]);
  const [aiAssistantInput, setAiAssistantInput] = useState('');
  
  const [autoModerateActive, setAutoModerateActive] = useState(() => {
    const saved = localStorage.getItem('autoModerateActive');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [translateTarget, setTranslateTarget] = useState(() => {
    return localStorage.getItem('translateTarget') || 'Spanish';
  });

  useEffect(() => {
    localStorage.setItem('autoModerateActive', JSON.stringify(autoModerateActive));
  }, [autoModerateActive]);

  useEffect(() => {
    localStorage.setItem('translateTarget', translateTarget);
  }, [translateTarget]);

  const handleSendAiPrompt = async (e) => {
    e.preventDefault();
    if (!aiAssistantInput.trim()) return;

    const userMsg = aiAssistantInput;
    setAiAssistantLogs(prev => [...prev, { role: 'user', content: userMsg }]);
    setAiAssistantInput('');

    // Simulated typing response
    setAiAssistantLogs(prev => [...prev, { role: 'assistant', content: 'Typing...', isTyping: true }]);

    try {
      const res = await fetch(`${API_BASE}/ai/assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: userMsg })
      });

      if (res.ok) {
        const data = await res.json();
        setAiAssistantLogs(prev => 
          prev.filter(l => !l.isTyping).concat({ role: 'assistant', content: data.response })
        );
      }
    } catch (err) {
      setAiAssistantLogs(prev => 
        prev.filter(l => !l.isTyping).concat({ role: 'assistant', content: 'Sorry, I failed to process that query. Check server connections.' })
      );
    }
  };

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, boxSizing: 'border-box' }}>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '18px', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Brain size={22} style={{ color: 'var(--color-primary)' }} />
          AI Settings & Hub
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Manage the integrated FamilySphere safety and translator AI configurations.</p>
      </div>

      {/* Settings Panels */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'var(--bg-tertiary)', borderRadius: '12px' }}>
          <div>
            <div style={{ fontWeight: '600', fontSize: '13px' }}>AI Content Auto-Moderation</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Filters toxic remarks or profanity automatically</div>
          </div>
          <input 
            type="checkbox" 
            checked={autoModerateActive} 
            onChange={() => setAutoModerateActive(!autoModerateActive)} 
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'var(--bg-tertiary)', borderRadius: '12px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '600', fontSize: '13px' }}>Active System Translator Target</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Select default target for chat translations</div>
          </div>
          <select 
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px' }}
            value={translateTarget}
            onChange={(e) => setTranslateTarget(e.target.value)}
          >
            <option value="Spanish">Spanish</option>
            <option value="French">French</option>
          </select>
        </div>
      </div>

      {/* Quick AI console panel */}
      <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Interactive AI Console</h4>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid var(--border-glass)', borderRadius: '16px', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
        <div style={{ flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {aiAssistantLogs.map((log, index) => (
            <div key={index} style={{
              alignSelf: log.role === 'user' ? 'flex-end' : 'flex-start',
              background: log.role === 'user' ? 'var(--color-primary)' : 'var(--bg-tertiary)',
              color: log.role === 'user' ? '#fff' : 'var(--text-primary)',
              padding: '10px 14px',
              borderRadius: '12px',
              maxWidth: '85%',
              fontSize: '13px'
            }}>
              {log.content}
            </div>
          ))}
        </div>

        <form onSubmit={handleSendAiPrompt} style={{ display: 'flex', padding: '8px', borderTop: '1px solid var(--border-glass)' }}>
          <input 
            type="text" 
            placeholder="Ask FamilySphere AI helper..." 
            className="input-field" 
            style={{ padding: '8px 12px', fontSize: '13px', borderRadius: '10px' }}
            value={aiAssistantInput}
            onChange={(e) => setAiAssistantInput(e.target.value)}
          />
          <button type="submit" className="btn-primary" style={{ padding: '8px 12px', marginLeft: '6px', borderRadius: '10px' }}>
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
