/* ═══════════════════════════════════════════════════════════════════════════
   AssetsPage — Browse all indexed assets
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileCheck, Search, ExternalLink } from 'lucide-react';
import { getAuditableAssets } from '../services/api';
import type { AssetRecord } from '../types';
import './AssetsPage.css';

export default function AssetsPage() {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerFilter, setOwnerFilter] = useState('');
  const [schemaFilter, setSchemaFilter] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const result = await getAuditableAssets({
        owner_did: ownerFilter || undefined,
        schema_id: schemaFilter || undefined,
        limit: pageSize,
        offset: page * pageSize,
      });
      setAssets(result);
    } catch {
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [page]);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchAssets();
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'active' || s === '0') return 'badge-active';
    if (s === 'revoked' || s === '3') return 'badge-revoked';
    if (s === 'expired' || s === '2') return 'badge-expired';
    return '';
  };

  return (
    <div className="section">
      <div className="container">
        <h2 className="section-title">Digital Assets</h2>

        {/* Filters */}
        <form onSubmit={handleFilter} className="assets-filters card">
          <div className="assets-filter-group">
            <input type="text" className="form-input" placeholder="Filter by Owner DID" value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} />
            <input type="text" className="form-input" placeholder="Filter by Schema ID" value={schemaFilter} onChange={(e) => setSchemaFilter(e.target.value)} />
            <button type="submit" className="btn btn-primary"><Search size={16} /> Filter</button>
          </div>
        </form>

        {/* Table */}
        {loading ? (
          <div className="loading-overlay"><div className="spinner" /></div>
        ) : assets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--gray-500)' }}>
            <FileCheck size={48} color="var(--gray-300)" />
            <p style={{ marginTop: 'var(--space-4)' }}>No assets found. Assets will appear here after issuance.</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Token ID</th>
                    <th>Asset Type</th>
                    <th>Schema</th>
                    <th>Owner DID</th>
                    <th>Status</th>
                    <th>Issued</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => (
                    <tr key={asset.token_id}>
                      <td><strong>#{asset.token_id}</strong></td>
                      <td>{asset.asset_type}</td>
                      <td><code>{asset.schema_id}</code></td>
                      <td className="mono" style={{ fontSize: 'var(--text-xs)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{asset.owner_did}</td>
                      <td><span className={`badge ${getStatusBadge(asset.status)}`}>{asset.status}</span></td>
                      <td style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)' }}>
                        {asset.issued_at ? new Date(asset.issued_at * 1000).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        <Link to={`/assets/${asset.token_id}`} className="btn btn-sm btn-secondary">
                          <ExternalLink size={12} /> View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="assets-pagination">
              <button className="btn btn-sm btn-secondary" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>Previous</button>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-600)' }}>Page {page + 1}</span>
              <button className="btn btn-sm btn-secondary" onClick={() => setPage(page + 1)} disabled={assets.length < pageSize}>Next</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
