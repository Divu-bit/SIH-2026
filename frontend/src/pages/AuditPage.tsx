/* ═══════════════════════════════════════════════════════════════════════════
   AuditPage — Audit dashboard with system stats & event logs
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from 'react';
import {
  BarChart3,
  FileCheck,
  Blocks,
  ArrowRight,
  XCircle,
  Activity,
} from 'lucide-react';
import {
  getAuditSummary,
  getIssuances,
  getTransfers,
  getRevocations,
  getEvents,
} from '../services/api';
import type { AuditSummary, AuditEvent } from '../types';
import './AuditPage.css';

type Tab = 'issuances' | 'transfers' | 'revocations' | 'all';

export default function AuditPage() {
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('issuances');
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);

  useEffect(() => {
    getAuditSummary()
      .then(setSummary)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setEventsLoading(true);
    const fetcher =
      activeTab === 'issuances' ? getIssuances :
      activeTab === 'transfers' ? getTransfers :
      activeTab === 'revocations' ? getRevocations :
      () => getEvents(undefined, 50);

    fetcher(50)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setEventsLoading(false));
  }, [activeTab]);

  if (loading) return <div className="section"><div className="loading-overlay"><div className="spinner" /></div></div>;

  const tabs: { key: Tab; label: string; icon: typeof BarChart3 }[] = [
    { key: 'issuances', label: 'Issuances', icon: FileCheck },
    { key: 'transfers', label: 'Transfers', icon: ArrowRight },
    { key: 'revocations', label: 'Revocations', icon: XCircle },
    { key: 'all', label: 'All Events', icon: Activity },
  ];

  return (
    <div className="section">
      <div className="container">
        <h2 className="section-title">Audit Dashboard</h2>

        {/* ── Summary Cards ────────────────────────────────────────── */}
        {summary && (
          <div className="audit-summary-grid">
            <div className="audit-summary-card">
              <FileCheck size={24} color="var(--primary-600)" />
              <div className="audit-summary-number">{summary.total_assets}</div>
              <div className="audit-summary-label">Total Assets</div>
            </div>
            <div className="audit-summary-card">
              <Blocks size={24} color="var(--info)" />
              <div className="audit-summary-number">{summary.total_schemas}</div>
              <div className="audit-summary-label">Schemas</div>
            </div>
            <div className="audit-summary-card">
              <BarChart3 size={24} color="var(--success)" />
              <div className="audit-summary-number">{summary.total_issuances}</div>
              <div className="audit-summary-label">Issuances</div>
            </div>
            <div className="audit-summary-card">
              <ArrowRight size={24} color="var(--warning)" />
              <div className="audit-summary-number">{summary.total_transfers}</div>
              <div className="audit-summary-label">Transfers</div>
            </div>
            <div className="audit-summary-card">
              <XCircle size={24} color="var(--danger)" />
              <div className="audit-summary-number">{summary.total_revocations}</div>
              <div className="audit-summary-label">Revocations</div>
            </div>
          </div>
        )}

        {/* ── Contract Addresses ───────────────────────────────────── */}
        {summary && (
          <div className="card" style={{ padding: 'var(--space-6)', marginTop: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
            <h4 style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Activity size={18} /> Deployed Contract Addresses
              <span className="badge" style={{ background: 'var(--primary-50)', color: 'var(--primary-700)' }}>Sepolia Chain ID: {summary.chain_id}</span>
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-3)' }}>
              {[
                { name: 'RoleManager', addr: summary.role_manager },
                { name: 'IdentityRegistry', addr: summary.identity_registry },
                { name: 'SchemaRegistry', addr: summary.schema_registry },
                { name: 'AssetNFT', addr: summary.asset_nft },
                { name: 'AssetRegistry', addr: summary.asset_registry },
                { name: 'Paymaster', addr: summary.paymaster },
              ].map((c) => (
                <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-2) var(--space-3)', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)', color: 'var(--gray-700)' }}>{c.name}</span>
                  <a href={`https://sepolia.etherscan.io/address/${c.addr}`} target="_blank" rel="noopener noreferrer" className="mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--primary-600)' }}>
                    {c.addr}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Event Tabs ───────────────────────────────────────────── */}
        <div className="audit-tabs">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.key}
                className={`audit-tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <TabIcon size={16} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Event Table ──────────────────────────────────────────── */}
        {eventsLoading ? (
          <div className="loading-overlay"><div className="spinner" /></div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--gray-500)' }}>
            <p>No events found for this category.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Block</th>
                  <th>Transaction Hash</th>
                  <th>Timestamp</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {events.map((evt, idx) => (
                  <tr key={idx}>
                    <td><strong>{evt.blockNumber}</strong></td>
                    <td>
                      <a
                        href={`https://sepolia.etherscan.io/tx/${evt.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mono"
                        style={{ fontSize: 'var(--text-xs)', color: 'var(--primary-600)' }}
                      >
                        {evt.transactionHash?.slice(0, 20)}...
                      </a>
                    </td>
                    <td style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)' }}>
                      {evt.timestamp ? new Date(evt.timestamp).toLocaleString() : '—'}
                    </td>
                    <td style={{ fontSize: 'var(--text-xs)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {evt.data ? JSON.stringify(evt.data).slice(0, 80) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
