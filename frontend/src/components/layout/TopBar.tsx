/* ═══════════════════════════════════════════════════════════════════════════
   TopBar — Accessibility bar (BEL-style top utility strip)
   Skip to content, search, accessibility icon
   ═══════════════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { Search } from 'lucide-react';
import './TopBar.css';

export default function TopBar() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="topbar" role="banner">
      <div className="topbar-inner container-wide">
        <div className="topbar-left">
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <span className="topbar-link">Access Screen Reader</span>
        </div>

        <div className="topbar-center">
          <div className="topbar-search">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="topbar-search-input"
              aria-label="Search TrustChain"
            />
            <button className="topbar-search-btn" aria-label="Search">
              <Search size={14} />
            </button>
          </div>
        </div>

        <div className="topbar-right">
          <button className="topbar-lang-btn">हिन्दी</button>
          <button className="topbar-accessibility-btn" aria-label="Accessibility options">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C13.1 2 14 2.9 14 4S13.1 6 12 6 10 5.1 10 4 10.9 2 12 2M21 9H15V22H13V16H11V22H9V9H3V7H21V9Z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
