/* ═══════════════════════════════════════════════════════════════════════════
   Header — BEL-style organization header
   Logo + Name + Tagline + Blockchain emblem
   ═══════════════════════════════════════════════════════════════════════════ */

import './Header.css';

export default function Header() {
  return (
    <header className="header">
      <div className="header-inner container-wide">
        {/* Left: Logo + Name */}
        <div className="header-left">
          <div className="header-logo">
            <div className="header-logo-icon">
              {/* TrustChain Shield Logo */}
              <svg width="56" height="60" viewBox="0 0 56 60" fill="none">
                <path
                  d="M28 2L4 14V30C4 44.36 14.12 57.48 28 60C41.88 57.48 52 44.36 52 30V14L28 2Z"
                  fill="url(#shield-gradient)"
                  stroke="var(--primary-700)"
                  strokeWidth="2"
                />
                <path
                  d="M28 10L12 18V30C12 40.72 19.24 50.52 28 52.8C36.76 50.52 44 40.72 44 30V18L28 10Z"
                  fill="var(--primary-600)"
                  opacity="0.3"
                />
                {/* Chain links inside shield */}
                <circle cx="22" cy="28" r="4" stroke="white" strokeWidth="2" fill="none" />
                <circle cx="34" cy="28" r="4" stroke="white" strokeWidth="2" fill="none" />
                <line x1="26" y1="28" x2="30" y2="28" stroke="white" strokeWidth="2" />
                <circle cx="28" cy="38" r="3" stroke="white" strokeWidth="1.5" fill="none" />
                <line x1="28" y1="32" x2="28" y2="35" stroke="white" strokeWidth="1.5" />
                <defs>
                  <linearGradient id="shield-gradient" x1="4" y1="2" x2="52" y2="60">
                    <stop offset="0%" stopColor="var(--primary-400)" />
                    <stop offset="100%" stopColor="var(--primary-700)" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="header-logo-text">
              <span className="header-brand-name">TrustChain</span>
              <span className="header-tagline-small">
                QUALITY. SECURITY. INNOVATION
              </span>
            </div>
          </div>
        </div>

        {/* Center: Title + Subtitle */}
        <div className="header-center">
          <h1 className="header-title">TrustChain Platform</h1>
          <p className="header-subtitle">
            Decentralized Identity, RBAC & Digital Asset Trust Platform
          </p>
          <p className="header-cin">
            Smart India Hackathon 2026 — SIH26125
          </p>
        </div>

        {/* Right: Blockchain/Ethereum emblem */}
        <div className="header-right">
          <div className="header-emblem">
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
              {/* Ethereum diamond shape */}
              <path d="M26 4L8 26L26 34L44 26L26 4Z" fill="var(--primary-600)" opacity="0.7"/>
              <path d="M26 4L8 26L26 22V4Z" fill="var(--primary-500)"/>
              <path d="M26 4L44 26L26 22V4Z" fill="var(--primary-700)"/>
              <path d="M8 28L26 48L26 36L8 28Z" fill="var(--primary-500)"/>
              <path d="M44 28L26 48L26 36L44 28Z" fill="var(--primary-700)"/>
            </svg>
          </div>
          <span className="header-emblem-text">Ethereum<br />Sepolia</span>
        </div>
      </div>
    </header>
  );
}
