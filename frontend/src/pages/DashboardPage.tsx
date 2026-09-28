/* ═══════════════════════════════════════════════════════════════════════════
   DashboardPage — Authenticated user dashboard
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  FileCheck,
  Blocks,
  Search,
  PlusCircle,
  CheckCircle,
  BarChart3,
  Wallet,
  Share2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getMyIdentity } from '../services/api';
import type { MyIdentityResponse } from '../types';
import './DashboardPage.css';

export default function DashboardPage() {
  const { isAuthenticated, address, did, isAdmin, isManager, isAuditor, login, loading } = useAuth();
  const [identity, setIdentity] = useState<MyIdentityResponse | null>(null);

  useEffect(() => {
    if (address) {
      getMyIdentity(address).then(setIdentity).catch(console.error);
    }
  }, [address]);

  if (!isAuthenticated) {
    return (
      <div className="section">
        <div className="container">
          <div className="dashboard-connect">
            <Wallet size={64} color="var(--primary-500)" />
            <h2>Connect Your Wallet</h2>
            <p>Connect your wallet (MetaMask, Rainbow, or any Web3 wallet) to access your TrustChain dashboard, manage identities, and interact with the platform.</p>
            <button className="btn btn-primary btn-lg" onClick={login} disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Wallet size={18} />
              {loading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const quickActions = [
    { icon: Share2, label: 'Share Credential (VP)', path: '/share', color: 'var(--primary-600)' },
    { icon: Search, label: 'Lookup DID', path: '/identity', color: 'var(--primary-600)' },
    { icon: PlusCircle, label: 'Register Identity', path: '/identity/register', color: 'var(--success)', adminOnly: true },
    { icon: FileCheck, label: 'Issue Asset', path: '/assets/issue', color: 'var(--info)', managerOnly: true },
    { icon: CheckCircle, label: 'Verify Asset', path: '/verify', color: 'var(--warning)' },
    { icon: Blocks, label: 'Browse Schemas', path: '/schemas', color: 'var(--primary-600)' },
    { icon: BarChart3, label: 'Audit Dashboard', path: '/audit', color: 'var(--danger)' },
  ];

  return (
    <div className="section">
      <div className="container">
        <h2 className="section-title">Dashboard</h2>

        {/* ── Identity Card ──────────────────────────────────────────── */}
        <div className="dashboard-identity-card card">
          <div className="dashboard-identity-header">
            <Shield size={40} color="var(--primary-600)" />
            <div>
              <h3>Welcome to TrustChain</h3>
              <p className="address mono">{address}</p>
            </div>
          </div>

          <div className="dashboard-identity-details">
            <div className="dashboard-detail">
              <span className="dashboard-detail-label">DID</span>
              <span className="dashboard-detail-value mono">{did || 'Not registered'}</span>
            </div>
            <div className="dashboard-detail">
              <span className="dashboard-detail-label">Roles</span>
              <div className="dashboard-roles">
                {isAdmin && <span className="badge badge-admin">Admin</span>}
                {isManager && <span className="badge badge-manager">Manager</span>}
                {isAuditor && <span className="badge badge-auditor">Auditor</span>}
                {!isAdmin && !isManager && !isAuditor && (
                  <span className="badge" style={{ background: 'var(--gray-100)', color: 'var(--gray-600)' }}>User</span>
                )}
              </div>
            </div>
            {identity?.identity && (
              <>
                <div className="dashboard-detail">
                  <span className="dashboard-detail-label">Controller</span>
                  <span className="dashboard-detail-value mono">{identity.identity.controller}</span>
                </div>
                <div className="dashboard-detail">
                  <span className="dashboard-detail-label">Status</span>
                  <span className={`badge ${identity.identity.is_active ? 'badge-active' : 'badge-revoked'}`}>
                    {identity.identity.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Quick Actions ──────────────────────────────────────────── */}
        <h3 style={{ marginTop: 'var(--space-10)', marginBottom: 'var(--space-6)', color: 'var(--gray-800)' }}>
          Quick Actions
        </h3>
        <div className="dashboard-actions-grid">
          {quickActions
            .filter((a) => {
              if (a.adminOnly && !isAdmin) return false;
              if (a.managerOnly && !isManager && !isAdmin) return false;
              return true;
            })
            .map((action) => {
              const IconComp = action.icon;
              return (
                <Link key={action.label} to={action.path} className="dashboard-action-card card">
                  <IconComp size={32} color={action.color} />
                  <span className="dashboard-action-label">{action.label}</span>
                </Link>
              );
            })}
        </div>
      </div>
    </div>
  );
}
