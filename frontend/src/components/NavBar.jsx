import React from 'react';
import { MessageSquare, Phone, Camera, Brain, Settings, Users } from 'lucide-react';

export default function NavBar({ activeTab, setActiveTab, setActiveChat }) {
  const go = (tab) => {
    setActiveTab(tab);
    setActiveChat(null);
  };

  return (
    <div className="bottom-nav">
      <button className={`nav-btn ${activeTab === 'chats' ? 'active' : ''}`} onClick={() => go('chats')}>
        <MessageSquare size={20} />
        <span>Chats</span>
      </button>
      <button className={`nav-btn ${activeTab === 'status' ? 'active' : ''}`} onClick={() => go('status')}>
        <Camera size={20} />
        <span>Status</span>
      </button>
      <button className={`nav-btn ${activeTab === 'together' ? 'active' : ''}`} onClick={() => go('together')}>
        <Users size={20} />
        <span>Together</span>
      </button>
      <button className={`nav-btn ${activeTab === 'calls' ? 'active' : ''}`} onClick={() => go('calls')}>
        <Phone size={20} />
        <span>Calls</span>
      </button>
      <button className={`nav-btn ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => go('ai')}>
        <Brain size={20} />
        <span>AI Hub</span>
      </button>
      <button className={`nav-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => go('settings')}>
        <Settings size={20} />
        <span>Settings</span>
      </button>
    </div>
  );
}
