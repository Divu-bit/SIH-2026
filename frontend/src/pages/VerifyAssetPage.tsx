/* ═══════════════════════════════════════════════════════════════════════════
   VerifyAssetPage — Public credential verification (no auth required)
   ═══════════════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { ShieldCheck, CheckCircle, XCircle, Search } from 'lucide-react';
import { verifyAsset } from '../services/api';
import type { VerifyAssetResult } from '../types';
import './FormPage.css';

export default function VerifyAssetPage() {
  const [tokenId, setTokenId] = useState('');
  const [credHash, setCredHash] = useState('');
  const [result, setResult] = useState<VerifyAssetResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenId || !credHash) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await verifyAsset({
        token_id: parseInt(tokenId),
        credential_hash: credHash.trim(),
      });
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 700 }}>
        <h2 className="section-title">Verify Credential</h2>
        <p style={{ textAlign: 'center', color: 'var(--gray-600)', marginBottom: 'var(--space-8)' }}>
          Verify the authenticity and integrity of any digital asset credential.
          No authentication required — public verification for anyone.
        </p>

        <form onSubmit={handleVerify} className="card" style={{ padding: 'var(--space-8)' }}>
          <div className="form-group">
            <label className="form-label">Token ID *</label>
            <input type="number" className="form-input" placeholder="e.g. 1" value={tokenId} onChange={(e) => setTokenId(e.target.value)} required min="0" />
          </div>
          <div className="form-group">
            <label className="form-label">Credential Hash (0x...) *</label>
            <input type="text" className="form-input" placeholder="0x..." value={credHash} onChange={(e) => setCredHash(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%' }}>
            <Search size={18} />
            {loading ? 'Verifying on Blockchain...' : 'Verify Credential'}
          </button>
        </form>

        {error && <div className="form-error" style={{ marginTop: 'var(--space-6)' }}>{error}</div>}

        {result && (
          <div className="card" style={{ marginTop: 'var(--space-6)', padding: 'var(--space-8)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
              <ShieldCheck size={32} color={result.is_valid ? 'var(--success)' : 'var(--danger)'} />
              <h3 style={{ margin: 0, color: result.is_valid ? 'var(--success)' : 'var(--danger)' }}>
                {result.is_valid ? 'CREDENTIAL VALID ✓' : 'CREDENTIAL INVALID ✗'}
              </h3>
            </div>

            <div className="verification-grid">
              <div className={`verification-item ${result.is_hash_match ? 'pass' : 'fail'}`}>
                {result.is_hash_match ? <CheckCircle size={20} color="var(--success)" /> : <XCircle size={20} color="var(--danger)" />}
                <span className="verification-item-text">Hash Match</span>
              </div>
              <div className={`verification-item ${result.is_status_active ? 'pass' : 'fail'}`}>
                {result.is_status_active ? <CheckCircle size={20} color="var(--success)" /> : <XCircle size={20} color="var(--danger)" />}
                <span className="verification-item-text">Status Active</span>
              </div>
              <div className={`verification-item ${result.is_not_expired ? 'pass' : 'fail'}`}>
                {result.is_not_expired ? <CheckCircle size={20} color="var(--success)" /> : <XCircle size={20} color="var(--danger)" />}
                <span className="verification-item-text">Not Expired</span>
              </div>
              <div className={`verification-item ${result.is_owner_verified ? 'pass' : 'fail'}`}>
                {result.is_owner_verified ? <CheckCircle size={20} color="var(--success)" /> : <XCircle size={20} color="var(--danger)" />}
                <span className="verification-item-text">Owner Verified</span>
              </div>
            </div>

            <div className="detail-grid" style={{ marginTop: 'var(--space-6)' }}>
              <div className="detail-item"><span className="detail-label">Owner DID</span><span className="detail-value mono">{result.owner_did}</span></div>
              <div className="detail-item"><span className="detail-label">Issuer DID</span><span className="detail-value mono">{result.issuer_did}</span></div>
              <div className="detail-item"><span className="detail-label">Status</span><span className="detail-value">{result.status}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
