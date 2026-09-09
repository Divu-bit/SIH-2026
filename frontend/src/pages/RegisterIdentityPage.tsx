/* ═══════════════════════════════════════════════════════════════════════════
   RegisterIdentityPage — Admin-only DID registration
   ═══════════════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { ShieldAlert, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { registerIdentity } from '../services/api';
import type { TxResponse } from '../types';
import './FormPage.css';

export default function RegisterIdentityPage() {
  const { isAuthenticated, isAdmin } = useAuth();
  const [did, setDid] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [metadataUri, setMetadataUri] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TxResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated) {
    return (
      <div className="section"><div className="container" style={{ maxWidth: 600, textAlign: 'center', padding: 'var(--space-16) 0' }}>
        <ShieldAlert size={48} color="var(--warning)" />
        <h3 style={{ marginTop: 'var(--space-4)' }}>Authentication Required</h3>
        <p style={{ color: 'var(--gray-600)' }}>Please connect your wallet to register identities.</p>
      </div></div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="section"><div className="container" style={{ maxWidth: 600, textAlign: 'center', padding: 'var(--space-16) 0' }}>
        <ShieldAlert size={48} color="var(--danger)" />
        <h3 style={{ marginTop: 'var(--space-4)' }}>Admin Access Required</h3>
        <p style={{ color: 'var(--gray-600)' }}>Only Admin role can register new identities on the blockchain.</p>
      </div></div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await registerIdentity({
        did: did.trim(),
        public_key: publicKey.trim() || undefined,
        metadata_uri: metadataUri.trim() || undefined,
      });
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 700 }}>
        <h2 className="section-title">Register Identity</h2>
        <p style={{ textAlign: 'center', color: 'var(--gray-600)', marginBottom: 'var(--space-8)' }}>
          Register a new W3C Decentralized Identifier (DID) on the IdentityRegistry smart contract.
        </p>

        <form onSubmit={handleSubmit} className="card" style={{ padding: 'var(--space-8)' }}>
          <div className="form-group">
            <label className="form-label">DID String *</label>
            <input type="text" className="form-input" placeholder="did:trustchain:0x..." value={did} onChange={(e) => setDid(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Public Key (hex, optional)</label>
            <input type="text" className="form-input" placeholder="0x04..." value={publicKey} onChange={(e) => setPublicKey(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Metadata URI (optional)</label>
            <input type="text" className="form-input" placeholder="ipfs://..." value={metadataUri} onChange={(e) => setMetadataUri(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Submitting Transaction...' : 'Register Identity'}
          </button>
        </form>

        {error && <div className="form-error" style={{ marginTop: 'var(--space-4)' }}>{error}</div>}
        {result && (
          <div className="form-success" style={{ marginTop: 'var(--space-4)' }}>
            <CheckCircle size={18} /> {result.message} — <a href={`https://sepolia.etherscan.io/tx/${result.tx_hash}`} target="_blank" rel="noopener noreferrer">View on Etherscan</a>
          </div>
        )}
      </div>
    </div>
  );
}
