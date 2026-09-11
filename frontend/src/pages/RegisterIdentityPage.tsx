/* ═══════════════════════════════════════════════════════════════════════════
   RegisterIdentityPage — Admin-only DID registration
   ═══════════════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { ShieldAlert, CheckCircle, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { registerIdentity } from '../services/api';
import type { TxResponse } from '../types';
import './FormPage.css';

export default function RegisterIdentityPage() {
  const { isAuthenticated, isAdmin, address } = useAuth();
  const [did, setDid] = useState('');
  const [controller, setController] = useState('');
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

    const trimmedDid = did.trim();
    const trimmedController = controller.trim();

    if (!trimmedDid.startsWith('did:trustchain:') || trimmedDid.length < 20) {
      setError('DID must start with "did:trustchain:" and be at least 20 characters long.');
      setLoading(false);
      return;
    }

    if (!trimmedController.startsWith('0x') || trimmedController.length !== 42) {
      setError('Controller must be a valid Ethereum address (42 characters starting with 0x).');
      setLoading(false);
      return;
    }

    try {
      const res = await registerIdentity({
        did: trimmedDid,
        controller: trimmedController,
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
            <input
              type="text"
              className="form-input"
              placeholder="did:trustchain:employee-003"
              value={did}
              onChange={(e) => setDid(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Controller Address *</label>
              {address && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    fontSize: 'var(--text-xs)',
                    cursor: 'pointer',
                  }}
                  onClick={() => setController(address)}
                  title="Auto-fill your connected wallet address"
                >
                  <UserCheck size={14} /> Self ({address.slice(0, 6)}...{address.slice(-4)})
                </button>
              )}
            </div>
            <input
              type="text"
              className="form-input"
              placeholder="0x..."
              value={controller}
              onChange={(e) => setController(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Public Key (hex, optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="0xabcdef..."
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Metadata URI (optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="ipfs://QmTestEmployee001"
              value={metadataUri}
              onChange={(e) => setMetadataUri(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%', marginTop: 'var(--space-4)' }}>
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
