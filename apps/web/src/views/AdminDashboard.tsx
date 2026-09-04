import React, { useState } from 'react';
import { useStore } from '../services/store';
import { UserRole } from '../types';
import { formatDID, truncateHash } from '../services/crypto';
import {
  Shield,
  UserPlus,
  KeyRound,
  FileCode2,
  CheckCircle2,
  AlertCircle,
  Layers,
  Sparkles,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const {
    identities,
    registerIdentity,
    updateIdentityStatus,
    schemas,
    registerSchema,
    isAccountAbstraction,
  } = useStore();

  const [newController, setNewController] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('USER');
  const [isSmartAccount, setIsSmartAccount] = useState(true);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Schema form state
  const [schemaId, setSchemaId] = useState('');
  const [schemaName, setSchemaName] = useState('');
  const [schemaVersion, setSchemaVersion] = useState('1.0.0');

  const handleRegisterIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newController.startsWith('0x') || newController.length !== 42) {
      setMsg({ type: 'error', text: 'Please provide a valid 42-character EVM address.' });
      return;
    }
    const did = formatDID(newController);
    const success = registerIdentity(did, newController, newRole, isSmartAccount);
    if (success) {
      setMsg({ type: 'success', text: `Successfully registered DID: ${did} with role ${newRole}` });
      setNewController('');
    } else {
      setMsg({ type: 'error', text: `DID already exists in IdentityRegistry.` });
    }
  };

  const handleRegisterSchema = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schemaId || !schemaName) return;
    const cleanId = schemaId.toUpperCase().replace(/\s+/g, '_');
    const success = registerSchema({
      schemaId: cleanId,
      name: schemaName,
      schemaUri: `ipfs://QmSchema${cleanId}`,
      schemaHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      version: schemaVersion,
      author: '0x2cb4f72907B1EC202a2f751Da0286aa9Ee2E3b33',
      isActive: true,
      registeredAt: new Date().toISOString(),
      fields: [
        { name: 'documentId', type: 'string', description: 'Unique Document ID', required: true },
        { name: 'recipientName', type: 'string', description: 'Full Name', required: true },
        { name: 'issueDate', type: 'date-time', description: 'Issuance Date', required: true },
      ],
    });
    if (success) {
      setMsg({ type: 'success', text: `Schema ${cleanId} registered on-chain!` });
      setSchemaId('');
      setSchemaName('');
    } else {
      setMsg({ type: 'error', text: 'Schema ID already registered.' });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-rose-950/40 via-purple-950/30 to-[#0d1322] border border-rose-500/20 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Shield className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-white font-['Outfit']">
              Admin Governance & DID Control Center
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Authorize new Decentralized Identifiers (DIDs), assign On-Chain Role-Based Access Controls (RBAC), and register immutable W3C credential schemas into Solidity smart contracts.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-slate-300">
            <span className="text-slate-500">Total DIDs:</span> <span className="text-cyan-400 font-bold">{identities.length}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-slate-300">
            <span className="text-slate-500">Schemas:</span> <span className="text-purple-400 font-bold">{schemas.length}</span>
          </div>
        </div>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            msg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{msg.text}</span>
          </div>
          <button onClick={() => setMsg(null)} className="text-slate-500 hover:text-white">✕</button>
        </div>
      )}

      {/* Main Grid: Onboard DID & Register Schema */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Onboard DID Form */}
        <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-white/10">
            <UserPlus className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Register Decentralized Identity (DID)</h3>
          </div>

          <form onSubmit={handleRegisterIdentity} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold">Controller EVM Address (EOA / Smart Account):</label>
              <input
                type="text"
                value={newController}
                onChange={e => setNewController(e.target.value)}
                placeholder="0x1234...5678 (42 characters)"
                className="w-full px-3 py-2 rounded-xl bg-[#0b0f19] border border-white/10 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                required
              />
              <div className="text-[11px] text-slate-500 font-mono">
                Generated DID: {newController ? formatDID(newController) : 'did:trustchain:0x...'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Assign On-Chain Role:</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0b0f19] border border-white/10 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="USER">USER (Asset Holder)</option>
                  <option value="MANAGER">MANAGER (Asset Issuer)</option>
                  <option value="AUDITOR">AUDITOR (Inspector)</option>
                  <option value="ADMIN">ADMIN (Superuser)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Account Type:</label>
                <div className="flex items-center h-9 px-3 rounded-xl bg-[#0b0f19] border border-white/10 gap-2">
                  <input
                    type="checkbox"
                    id="aa-check"
                    checked={isSmartAccount}
                    onChange={e => setIsSmartAccount(e.target.checked)}
                    className="rounded text-cyan-500 focus:ring-cyan-500"
                  />
                  <label htmlFor="aa-check" className="text-[11px] text-slate-300 cursor-pointer">
                    ERC-4337 Smart Account
                  </label>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-900 font-bold text-xs transition-all shadow-lg shadow-cyan-500/20"
            >
              Write Identity & Grant Role (Solidity Call)
            </button>
          </form>
        </div>

        {/* Register Schema Form */}
        <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-white/10">
            <FileCode2 className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-bold text-white">Register W3C Credential Schema</h3>
          </div>

          <form onSubmit={handleRegisterSchema} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold">Schema Identifier (Unique ID):</label>
              <input
                type="text"
                value={schemaId}
                onChange={e => setSchemaId(e.target.value)}
                placeholder="e.g. UNIVERSITY_DEGREE_V1"
                className="w-full px-3 py-2 rounded-xl bg-[#0b0f19] border border-white/10 text-slate-200 font-mono focus:outline-none focus:border-purple-500 uppercase"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Display Title:</label>
                <input
                  type="text"
                  value={schemaName}
                  onChange={e => setSchemaName(e.target.value)}
                  placeholder="e.g. Bachelor of Technology Degree"
                  className="w-full px-3 py-2 rounded-xl bg-[#0b0f19] border border-white/10 text-slate-200 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Version:</label>
                <input
                  type="text"
                  value={schemaVersion}
                  onChange={e => setSchemaVersion(e.target.value)}
                  placeholder="1.0.0"
                  className="w-full px-3 py-2 rounded-xl bg-[#0b0f19] border border-white/10 text-slate-200 font-mono focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-purple-500/20"
            >
              Anchor Schema Definition in SchemaRegistry.sol
            </button>
          </form>
        </div>
      </div>

      {/* Identities Directory Table */}
      <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Registered Decentralized Identifiers (DIDs)</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">{identities.length} Identities on-chain</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 font-sans uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">DID / Identifier</th>
                <th className="py-3 px-3">Controller Address</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Account Type</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {identities.map((id, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-3 text-cyan-300 font-semibold">{truncateHash(id.did, 18, 6)}</td>
                  <td className="py-3 px-3 text-slate-400">{truncateHash(id.controller, 8, 6)}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        id.role === 'ADMIN'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : id.role === 'MANAGER'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : id.role === 'AUDITOR'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      }`}
                    >
                      {id.role}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        id.status === 'ACTIVE'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {id.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-400 font-sans text-[11px]">
                    {id.isSmartAccount ? (
                      <span className="text-purple-300 font-mono">ERC-4337 AA</span>
                    ) : (
                      <span className="text-slate-500 font-mono">EOA</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    {id.status === 'ACTIVE' ? (
                      <button
                        onClick={() => updateIdentityStatus(id.did, 'REVOKED')}
                        className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-400 text-[10px] transition-all font-sans"
                      >
                        Revoke DID
                      </button>
                    ) : (
                      <button
                        onClick={() => updateIdentityStatus(id.did, 'ACTIVE')}
                        className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 text-[10px] transition-all font-sans"
                      >
                        Reactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
