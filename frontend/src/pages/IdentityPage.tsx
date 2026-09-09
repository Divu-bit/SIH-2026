/* ═══════════════════════════════════════════════════════════════════════════
   IdentityPage — DID Lookup
   ═══════════════════════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { Search, User, CheckCircle, XCircle } from 'lucide-react';
import { getIdentity, resolveController } from '../services/api';
import type { IdentityRecord } from '../types';
import './FormPage.css';

export default function IdentityPage() {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'did' | 'address'>('did');
  const [result, setResult] = useState<IdentityRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const identity =
        searchType === 'did'
          ? await getIdentity(query.trim())
          : await resolveController(query.trim());
      setResult(identity);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Identity not found');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 800 }}>
        <h2 className="section-title">Identity Lookup</h2>
        <p style={{ textAlign: 'center', color: 'var(--gray-600)', marginBottom: 'var(--space-8)' }}>
          Resolve a Decentralized Identifier (DID) or look up identity by controller address.
        </p>

        <form onSubmit={handleSearch} className="card" style={{ padding: 'var(--space-8)' }}>
          <div className="form-group">
            <label className="form-label">Search Type</label>
            <select
              className="form-select"
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as 'did' | 'address')}
            >
              <option value="did">Search by DID</option>
              <option value="address">Search by Controller Address</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              {searchType === 'did' ? 'DID String' : 'Ethereum Address'}
            </label>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <input
                type="text"
                className="form-input"
                placeholder={
                  searchType === 'did'
                    ? 'did:trustchain:0x...'
                    : '0x...'
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" disabled={loading}>
                <Search size={16} />
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="form-error" style={{ marginTop: 'var(--space-6)' }}>
            <XCircle size={18} /> {error}
          </div>
        )}

        {result && (
          <div className="card" style={{ marginTop: 'var(--space-6)', padding: 'var(--space-8)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
              <User size={24} color="var(--primary-600)" />
              <h3 style={{ margin: 0 }}>Identity Record</h3>
              {result.is_active ? (
                <span className="badge badge-active"><CheckCircle size={12} /> Active</span>
              ) : (
                <span className="badge badge-revoked"><XCircle size={12} /> Inactive</span>
              )}
            </div>

            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">DID</span>
                <span className="detail-value mono">{result.did}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Controller</span>
                <span className="detail-value mono">{result.controller}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Status</span>
                <span className="detail-value">{result.status}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Public Key</span>
                <span className="detail-value mono" style={{ fontSize: 'var(--text-xs)', wordBreak: 'break-all' }}>
                  {result.public_key || '—'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Metadata URI</span>
                <span className="detail-value mono">{result.metadata_uri || '—'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
