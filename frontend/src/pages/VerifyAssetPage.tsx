/* ═══════════════════════════════════════════════════════════════════════════
   VerifyAssetPage — Dual mode: legacy hash verify + VP token verify
   ═══════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShieldCheck, CheckCircle, XCircle, Search, Share2, AlertTriangle } from 'lucide-react';
import { verifyAsset, verifyVp } from '../services/api';
import type { VerifyAssetResult, VerifyVpResult } from '../types';
import './FormPage.css';
import './ShareCredentialPage.css';

type Mode = 'vp' | 'hash';

export default function VerifyAssetPage() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>('vp');

  // VP mode state
  const [vpToken, setVpToken] = useState('');
  const [vpResult, setVpResult] = useState<VerifyVpResult | null>(null);

  // Legacy mode state
  const [tokenId, setTokenId] = useState('');
  const [credHash, setCredHash] = useState('');
  const [hashResult, setHashResult] = useState<VerifyAssetResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-populate VP token from URL param
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setVpToken(token);
      setMode('vp');
    }
  }, [searchParams]);

  // Auto-verify if token came from URL
  useEffect(() => {
    const token = searchParams.get('token');
    if (token && vpToken === token) {
      handleVpVerify(token);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vpToken]);

  const handleVpVerify = async (tokenOverride?: string) => {
    const token = tokenOverride ?? vpToken;
    if (!token.trim()) return;
    setLoading(true);
    setError(null);
    setVpResult(null);
    try {
      const res = await verifyVp({ vp_token: token.trim() });
      setVpResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'VP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleHashVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenId || !credHash) return;
    setLoading(true);
    setError(null);
    setHashResult(null);
    try {
      const res = await verifyAsset({ token_id: parseInt(tokenId), credential_hash: credHash.trim() });
      setHashResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 720 }}>
        <h2 className="section-title">Verify Credential</h2>

        {/* Mode tabs */}
        <div className="vp-mode-tabs">
          <button
            className={`vp-mode-tab ${mode === 'vp' ? 'active' : ''}`}
            onClick={() => { setMode('vp'); setError(null); setVpResult(null); }}
          >
            <ShieldCheck size={16} />
            Verify Presentation (Recommended)
          </button>
          <button
            className={`vp-mode-tab ${mode === 'hash' ? 'active' : ''}`}
            onClick={() => { setMode('hash'); setError(null); setHashResult(null); }}
          >
            <Search size={16} />
            Hash Verify (Legacy)
          </button>
        </div>

        {/* ── VP Mode ─────────────────────────────────────────────────────── */}
        {mode === 'vp' && (
          <div className="card" style={{ padding: 'var(--space-8)' }}>
            <div className="vp-how-it-works" style={{ marginBottom: 'var(--space-6)' }}>
              <Share2 size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <span>
                The credential holder creates a signed presentation and shares a link.
                Paste the VP token below — <strong>no holder presence required.</strong>
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">VP Token *</label>
              <textarea
                className="form-input"
                placeholder="Paste the VP token (JWT) here..."
                value={vpToken}
                onChange={e => setVpToken(e.target.value)}
                rows={4}
                style={{ fontFamily: 'monospace', fontSize: '0.8rem', resize: 'vertical' }}
              />
            </div>

            {error && <div className="form-error">{error}</div>}

            <button
              className="btn btn-primary btn-lg"
              onClick={() => handleVpVerify()}
              disabled={loading || !vpToken.trim()}
              style={{ width: '100%' }}
            >
              <ShieldCheck size={18} />
              {loading ? 'Verifying...' : 'Verify Presentation'}
            </button>

            {vpResult && <VpResultView result={vpResult} />}
          </div>
        )}

        {/* ── Legacy Hash Mode ─────────────────────────────────────────────── */}
        {mode === 'hash' && (
          <div className="card" style={{ padding: 'var(--space-8)' }}>
            <div className="vp-how-it-works" style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
              <AlertTriangle size={16} style={{ color: '#d97706', flexShrink: 0 }} />
              <span style={{ color: '#92400e' }}>
                <strong>Security note:</strong> Hash verification does not prove the presenter
                owns this credential. Use <em>Verify Presentation</em> when the holder has
                provided a VP token.
              </span>
            </div>

            <form onSubmit={handleHashVerify} style={{ marginTop: 'var(--space-6)' }}>
              <div className="form-group">
                <label className="form-label">Token ID *</label>
                <input type="number" className="form-input" placeholder="e.g. 1"
                  value={tokenId} onChange={e => setTokenId(e.target.value)} required min="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Credential Hash (0x...) *</label>
                <input type="text" className="form-input" placeholder="0x..."
                  value={credHash} onChange={e => setCredHash(e.target.value)} required />
              </div>
              {error && <div className="form-error">{error}</div>}
              <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%' }}>
                <Search size={18} />
                {loading ? 'Verifying on Blockchain...' : 'Verify Credential'}
              </button>
            </form>

            {hashResult && <HashResultView result={hashResult} />}
          </div>
        )}
      </div>
    </div>
  );
}

// ── VP Result Component ──────────────────────────────────────────────────────

function VpResultView({ result }: { result: VerifyVpResult }) {
  const { checks, credential, failure_reason } = result;

  const checkItems: [boolean, string][] = [
    [checks.token_integrity, 'Token Integrity'],
    [checks.holder_signature_valid, 'Holder Signature'],
    [checks.controller_match, 'DID Controller Match'],
    [checks.not_expired, 'Not Expired'],
    [checks.credential_active, 'Credential Active On-Chain'],
    [checks.not_revoked, 'Not Revoked by Holder'],
  ];

  return (
    <div style={{ marginTop: 'var(--space-6)' }}>
      {/* Overall status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
        {result.is_valid
          ? <CheckCircle size={32} color="var(--success)" />
          : <XCircle size={32} color="var(--danger)" />
        }
        <div>
          <h3 style={{ margin: 0, color: result.is_valid ? 'var(--success)' : 'var(--danger)' }}>
            {result.is_valid ? '✓ PRESENTATION VALID' : '✗ PRESENTATION INVALID'}
          </h3>
          {failure_reason && (
            <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--danger)' }}>{failure_reason}</p>
          )}
        </div>
      </div>

      {/* Checks grid */}
      <div className="vp-checks-grid">
        {checkItems.map(([passed, label]) => (
          <div key={label} className={`vp-check-item ${passed ? 'pass' : 'fail'}`}>
            {passed ? <CheckCircle size={16} /> : <XCircle size={16} />}
            {label}
          </div>
        ))}
      </div>

      {/* Credential details */}
      {credential && (
        <div className="detail-grid" style={{ marginTop: 'var(--space-6)' }}>
          <div className="detail-item"><span className="detail-label">Holder DID</span><span className="detail-value mono">{credential.holder_did}</span></div>
          <div className="detail-item"><span className="detail-label">Owner DID</span><span className="detail-value mono">{credential.owner_did}</span></div>
          <div className="detail-item"><span className="detail-label">Issuer DID</span><span className="detail-value mono">{credential.issuer_did}</span></div>
          <div className="detail-item"><span className="detail-label">Asset Type</span><span className="detail-value">{credential.asset_type}</span></div>
          <div className="detail-item"><span className="detail-label">Schema</span><span className="detail-value mono">{credential.schema_id}</span></div>
          <div className="detail-item"><span className="detail-label">Purpose</span><span className="detail-value">{credential.purpose}</span></div>
          <div className="detail-item"><span className="detail-label">Status</span><span className="detail-value">{credential.status}</span></div>
          <div className="detail-item"><span className="detail-label">VP Expires</span><span className="detail-value">{new Date(credential.vp_expires_at * 1000).toLocaleString()}</span></div>
        </div>
      )}
    </div>
  );
}

// ── Legacy Hash Result Component ─────────────────────────────────────────────

function HashResultView({ result }: { result: VerifyAssetResult }) {
  return (
    <div style={{ marginTop: 'var(--space-6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
        <ShieldCheck size={32} color={result.is_valid ? 'var(--success)' : 'var(--danger)'} />
        <h3 style={{ margin: 0, color: result.is_valid ? 'var(--success)' : 'var(--danger)' }}>
          {result.is_valid ? 'CREDENTIAL VALID ✓' : 'CREDENTIAL INVALID ✗'}
        </h3>
      </div>
      <div className="verification-grid">
        {[
          [result.is_hash_match, 'Hash Match'],
          [result.is_status_active, 'Status Active'],
          [result.is_not_expired, 'Not Expired'],
          [result.is_owner_verified, 'Owner Verified'],
        ].map(([passed, label]) => (
          <div key={String(label)} className={`verification-item ${passed ? 'pass' : 'fail'}`}>
            {passed ? <CheckCircle size={20} color="var(--success)" /> : <XCircle size={20} color="var(--danger)" />}
            <span className="verification-item-text">{String(label)}</span>
          </div>
        ))}
      </div>
      <div className="detail-grid" style={{ marginTop: 'var(--space-6)' }}>
        <div className="detail-item"><span className="detail-label">Owner DID</span><span className="detail-value mono">{result.owner_did}</span></div>
        <div className="detail-item"><span className="detail-label">Issuer DID</span><span className="detail-value mono">{result.issuer_did}</span></div>
        <div className="detail-item"><span className="detail-label">Status</span><span className="detail-value">{result.status}</span></div>
      </div>
    </div>
  );
}
