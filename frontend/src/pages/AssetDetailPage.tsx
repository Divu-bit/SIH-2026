/* ═══════════════════════════════════════════════════════════════════════════
   AssetDetailPage — Full asset record view with actions
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileCheck, ExternalLink, ArrowLeftRight, XCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAsset, transferAsset, revokeAsset, syncNFTOwner } from '../services/api';
import type { AssetRecord, TxResponse } from '../types';
import './FormPage.css';

export default function AssetDetailPage() {
  const { tokenId } = useParams<{ tokenId: string }>();
  const { isAdmin, isManager } = useAuth();
  const [asset, setAsset] = useState<AssetRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<TxResponse | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [transferDid, setTransferDid] = useState('');
  const [revokeReason, setRevokeReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!tokenId) return;
    setLoading(true);
    getAsset(parseInt(tokenId))
      .then(setAsset)
      .catch((err) => setError(err instanceof Error ? err.message : 'Asset not found'))
      .finally(() => setLoading(false));
  }, [tokenId]);

  const handleAction = async (action: 'transfer' | 'revoke' | 'sync') => {
    if (!tokenId) return;
    setActionLoading(true);
    setActionResult(null);
    setActionError(null);
    try {
      let res: TxResponse;
      if (action === 'transfer') res = await transferAsset(parseInt(tokenId), transferDid);
      else if (action === 'revoke') res = await revokeAsset(parseInt(tokenId), revokeReason);
      else res = await syncNFTOwner(parseInt(tokenId));
      setActionResult(res);
      // Refresh asset
      getAsset(parseInt(tokenId)).then(setAsset).catch(() => {});
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="section"><div className="loading-overlay"><div className="spinner" /></div></div>;
  if (error) return <div className="section"><div className="container" style={{ textAlign: 'center', padding: 'var(--space-16) 0' }}><h3>Error</h3><p style={{ color: 'var(--gray-600)' }}>{error}</p><Link to="/assets" className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }}>Back to Assets</Link></div></div>;
  if (!asset) return null;

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 800 }}>
        <h2 className="section-title">Asset #{asset.token_id}</h2>

        <div className="card" style={{ padding: 'var(--space-8)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
            <FileCheck size={28} color="var(--primary-600)" />
            <h3 style={{ margin: 0 }}>{asset.asset_type}</h3>
            <span className={`badge ${asset.status?.toLowerCase() === 'active' || asset.status === '0' ? 'badge-active' : asset.status?.toLowerCase() === 'revoked' ? 'badge-revoked' : 'badge-expired'}`}>
              {asset.status}
            </span>
            {asset.is_transferable && <span className="badge" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>Transferable</span>}
          </div>

          <div className="detail-grid">
            <div className="detail-item"><span className="detail-label">Token ID</span><span className="detail-value">#{asset.token_id}</span></div>
            <div className="detail-item"><span className="detail-label">Owner DID</span><span className="detail-value mono">{asset.owner_did}</span></div>
            <div className="detail-item"><span className="detail-label">Issuer DID</span><span className="detail-value mono">{asset.issuer_did}</span></div>
            <div className="detail-item"><span className="detail-label">Schema ID</span><span className="detail-value"><code>{asset.schema_id}</code></span></div>
            <div className="detail-item"><span className="detail-label">Credential Hash</span><span className="detail-value mono" style={{ fontSize: 'var(--text-xs)', wordBreak: 'break-all' }}>{asset.credential_hash}</span></div>
            <div className="detail-item"><span className="detail-label">NFT Owner</span><span className="detail-value mono">{asset.nft_owner}</span></div>
            <div className="detail-item"><span className="detail-label">Metadata URI</span><span className="detail-value mono">{asset.metadata_uri || '—'}</span></div>
            <div className="detail-item"><span className="detail-label">Issued At</span><span className="detail-value">{asset.issued_at ? new Date(asset.issued_at * 1000).toLocaleString() : '—'}</span></div>
            <div className="detail-item"><span className="detail-label">Expires At</span><span className="detail-value">{asset.expires_at && asset.expires_at > 0 ? new Date(asset.expires_at * 1000).toLocaleString() : 'Never'}</span></div>
          </div>

          <div style={{ marginTop: 'var(--space-6)' }}>
            <Link to={`/verify`} className="btn btn-secondary btn-sm"><ExternalLink size={14} /> Verify This Asset</Link>
          </div>
        </div>

        {/* ── Actions (Admin/Manager only) ──────────────────────────── */}
        {(isAdmin || isManager) && (
          <div className="card" style={{ padding: 'var(--space-6)', marginTop: 'var(--space-6)' }}>
            <h4 style={{ marginBottom: 'var(--space-4)' }}>Actions</h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Transfer */}
              <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Transfer to DID</label>
                  <input type="text" className="form-input" placeholder="did:trustchain:..." value={transferDid} onChange={(e) => setTransferDid(e.target.value)} />
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => handleAction('transfer')} disabled={actionLoading || !transferDid}>
                  <ArrowLeftRight size={14} /> Transfer
                </button>
              </div>

              {/* Revoke */}
              <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Revocation Reason</label>
                  <input type="text" className="form-input" placeholder="Reason for revocation" value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} />
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => handleAction('revoke')} disabled={actionLoading || !revokeReason}>
                  <XCircle size={14} /> Revoke
                </button>
              </div>

              {/* Sync */}
              <button className="btn btn-secondary btn-sm" onClick={() => handleAction('sync')} disabled={actionLoading} style={{ alignSelf: 'flex-start' }}>
                <RefreshCw size={14} /> Sync NFT Owner
              </button>
            </div>

            {actionResult && <div className="form-success" style={{ marginTop: 'var(--space-4)' }}>{actionResult.message}</div>}
            {actionError && <div className="form-error" style={{ marginTop: 'var(--space-4)' }}>{actionError}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
