/* ═══════════════════════════════════════════════════════════════════════════
   Footer — BEL-style dark navy footer
   Multi-column links, contract addresses bar, copyright
   ═══════════════════════════════════════════════════════════════════════════ */

import { Link } from 'react-router-dom';
import { ArrowUpCircle } from 'lucide-react';
import './Footer.css';

const discoverLinks = [
  { label: 'About TrustChain', path: '/#about' },
  { label: 'Features', path: '/#features' },
  { label: 'How It Works', path: '/#about' },
  { label: 'Security', path: '/verify' },
  { label: 'Audit Dashboard', path: '/audit' },
  { label: 'Dashboard', path: '/dashboard' },
];

const whatWeDoLinks = [
  { label: 'DID Registry', path: '/identity' },
  { label: 'Role-Based Access Control', path: '/dashboard' },
  { label: 'Asset NFTs', path: '/assets' },
  { label: 'Schema Verification', path: '/schemas' },
  { label: 'Account Abstraction', path: '/dashboard' },
];

const quickLinks = [
  { label: 'Register Identity', path: '/identity/register' },
  { label: 'Issue Asset', path: '/assets/issue' },
  { label: 'Verify Credential', path: '/verify' },
  { label: 'Browse Schemas', path: '/schemas' },
  { label: 'View Events', path: '/audit' },
];

const otherLinks = [
  { label: 'Sepolia Etherscan', href: 'https://sepolia.etherscan.io' },
  { label: 'MetaMask', href: 'https://metamask.io' },
  { label: 'W3C DID Standard', href: 'https://www.w3.org/TR/did-core/' },
  { label: 'ERC-721', href: 'https://eips.ethereum.org/EIPS/eip-721' },
  { label: 'ERC-4337', href: 'https://eips.ethereum.org/EIPS/eip-4337' },
  { label: 'FAQ', path: '/' },
];

const contractAddresses = [
  { name: 'RoleManager', addr: '0xE1042c9B...F78D' },
  { name: 'IdentityRegistry', addr: '0x1f7521c7...b75D' },
  { name: 'SchemaRegistry', addr: '0xE31Afcd7...46dF' },
  { name: 'AssetNFT', addr: '0x260B356F...521E' },
  { name: 'AssetRegistry', addr: '0x6B1DA772...713A' },
  { name: 'Paymaster', addr: '0xc5e88B42...8800' },
];

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="footer">
      {/* ── Links Section ──────────────────────────────────────────────── */}
      <div className="footer-links-section">
        <div className="container-wide">
          <div className="footer-columns">
            <div className="footer-column">
              <h3 className="footer-column-title">Discover TrustChain</h3>
              <ul className="footer-list">
                {discoverLinks.map((link) => (
                  <li key={link.label}>
                    <Link to={link.path} className="footer-link">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="footer-column">
              <h3 className="footer-column-title">What We Do</h3>
              <ul className="footer-list">
                {whatWeDoLinks.map((link) => (
                  <li key={link.label}>
                    <Link to={link.path} className="footer-link">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="footer-column">
              <h3 className="footer-column-title">Quick Links</h3>
              <ul className="footer-list">
                {quickLinks.map((link) => (
                  <li key={link.label}>
                    <Link to={link.path} className="footer-link">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="footer-column">
              <h3 className="footer-column-title">Resources</h3>
              <ul className="footer-list">
                {otherLinks.map((link) =>
                  'href' in link ? (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-link"
                      >
                        {link.label}
                      </a>
                    </li>
                  ) : (
                    <li key={link.label}>
                      <Link to={link.path!} className="footer-link">
                        {link.label}
                      </Link>
                    </li>
                  )
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ── Contract Addresses Bar ─────────────────────────────────────── */}
      <div className="footer-contracts-bar">
        <div className="container-wide">
          <div className="footer-contracts-inner">
            <span className="footer-contracts-label">
              Deployed Contracts (Sepolia) :
            </span>
            <div className="footer-contracts-list">
              {contractAddresses.map((c) => (
                <span key={c.name} className="footer-contract-badge">
                  <span className="footer-contract-name">{c.name}</span>
                  <span className="footer-contract-addr">{c.addr}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Copyright ──────────────────────────────────────────────────── */}
      <div className="footer-copyright">
        <div className="container-wide">
          <div className="footer-copyright-inner">
            <div className="footer-copyright-left">
              <Link to="/" className="footer-legal-link">Terms & Conditions</Link>
              <Link to="/" className="footer-legal-link">Privacy Policy</Link>
            </div>
            <div className="footer-copyright-center">
              <p>Copyright © 2026 TrustChain — SIH26125</p>
              <p className="footer-disclaimer">
                This is a Smart India Hackathon 2026 project demonstrating
                decentralized identity and digital asset management on Ethereum Sepolia.
              </p>
            </div>
            <div className="footer-copyright-right">
              <Link to="/" className="footer-legal-link">Site Map</Link>
              <Link to="/" className="footer-legal-link">Disclaimer</Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Scroll to Top ──────────────────────────────────────────────── */}
      <button
        className="footer-scroll-top"
        onClick={scrollToTop}
        aria-label="Scroll to top"
        title="Scroll to top"
      >
        <ArrowUpCircle size={24} />
      </button>
    </footer>
  );
}
