/* ═══════════════════════════════════════════════════════════════════════════
   IssueAssetPage — Manager/Admin form to issue asset NFTs
   ═══════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { issueAsset, listSchemas } from '../services/api';
import type { SchemaRecord, TxResponse } from '../types';
import './FormPage.css';

export default function IssueAssetPage() {
  const { isAuthenticated, isAdmin, isManager } = useAuth();
  const [schemas, setSchemas] = useState<SchemaRecord[]>([]);
  const [ownerDid, setOwnerDid] = useState('');
  const [schemaId, setSchemaId] = useState('');
  const [assetType, setAssetType] = useState('');
  const [credHash, setCredHash] = useState('');
  const [metadataUri, setMetadataUri] = useState('');
  const [isTransferable, setIsTransferable] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TxResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listSchemas().then(setSchemas).catch(() => {});
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="section"><div className="container" style={{ maxWidth: 600, textAlign: 'center', padding: 'var(--space-16) 0' }}>
        <ShieldAlert size={48} color="var(--warning)" /><h3 style={{ marginTop: 'var(--space-4)' }}>Authentication Required</h3>
        <p style={{ color: 'var(--gray-600)' }}>Connect your wallet to issue assets.</p>
      </div></div>
    );
  }

  if (!isAdmin && !isManager) {
    return (
      <div className="section"><div className="container" style={{ maxWidth: 600, textAlign: 'center', padding: 'var(--space-16) 0' }}>
        <ShieldAlert size={48} color="var(--danger)" /><h3 style={{ marginTop: 'var(--space-4)' }}>Manager or Admin Required</h3>
        <p style={{ color: 'var(--gray-600)' }}>Only Manager/Admin roles can issue asset NFTs.</p>
      </div></div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const expiry = expiresAt ? Math.floor(new Date(expiresAt).getTime() / 1000) : 0;
      const res = await issueAsset({
        owner_did: ownerDid.trim(),
        schema_id: schemaId.trim(),
        asset_type: assetType.trim(),
        credential_hash: credHash.trim(),
        metadata_uri: metadataUri.trim(),
        is_transferable: isTransferable,
        expires_at: expiry,
      });
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Issuance failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 700 }}>
        <h2 className="section-title">Issue Asset</h2>
        <p style={{ textAlign: 'center', color: 'var(--gray-600)', marginBottom: 'var(--space-8)' }}>
          Mint a new ERC-721 digital asset NFT with anchored credential hash.
        </p>

        <form onSubmit={handleSubmit} className="card" style={{ padding: 'var(--space-8)' }}>
          <div className="form-group">
            <label className="form-label">Owner DID *</label>
            <input type="text" className="form-input" placeholder="did:trustchain:..." value={ownerDid} onChange={(e) => setOwnerDid(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Schema ID *</label>
            <select className="form-select" value={schemaId} onChange={(e) => setSchemaId(e.target.value)} required>
              <option value="">Select a schema...</option>
              {schemas.map((s) => <option key={s.schema_id} value={s.schema_id}>{s.schema_id} — {s.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Asset Type *</label>
            <input type="text" className="form-input" placeholder="e.g. SECURITY_TRAINING_CERTIFICATE" value={assetType} onChange={(e) => setAssetType(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Credential Hash (0x...) *</label>
            <input type="text" className="form-input" placeholder="0x..." value={credHash} onChange={(e) => setCredHash(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Metadata URI</label>
            <input type="text" className="form-input" placeholder="ipfs://..." value={metadataUri} onChange={(e) => setMetadataUri(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Expires At (optional)</label>
              <input type="datetime-local" className="form-input" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Transferable?</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)', cursor: 'pointer' }}>
                <input type="checkbox" checked={isTransferable} onChange={(e) => setIsTransferable(e.target.checked)} />
                <span style={{ fontSize: 'var(--text-sm)' }}>Allow transfer</span>
              </label>
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Submitting Transaction...' : 'Issue Asset NFT'}
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
