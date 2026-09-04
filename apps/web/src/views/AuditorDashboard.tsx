import React, { useState } from 'react';
import { useStore } from '../services/store';
import { truncateHash } from '../services/crypto';
import {
  ShieldCheck,
  Activity,
  Search,
  Filter,
  Layers,
  Database,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Code,
} from 'lucide-react';
import { TamperSimulator } from '../components/TamperSimulator';

export const AuditorDashboard: React.FC = () => {
  const { auditLogs, assets, identities, schemas } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch =
      log.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.eventType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.targetDID && log.targetDID.toLowerCase().includes(searchTerm.toLowerCase())) ||
      log.txHash.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = eventTypeFilter === 'ALL' || log.eventType === eventTypeFilter;
    return matchesSearch && matchesType;
  });

  const uniqueEventTypes = ['ALL', ...Array.from(new Set(auditLogs.map(l => l.eventType)))];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-[#0d1322] border border-purple-500/20 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-white font-['Outfit']">
              Immutable On-Chain Audit & Compliance Inspector
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Real-time authoritative index of every smart contract state change, role delegation, credential anchoring, and asset transfer logged on Ethereum Virtual Machine.
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-slate-300">
            <span className="text-slate-500">Total Logs:</span> <span className="text-purple-400 font-bold">{auditLogs.length}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-slate-300">
            <span className="text-slate-500">Contract Integrity:</span> <span className="text-emerald-400 font-bold">100% OK</span>
          </div>
        </div>
      </div>

      {/* Security Simulator Section */}
      <TamperSimulator />

      {/* Audit Log Stream */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-bold text-white">Chronological Blockchain Event Stream</h3>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search actor, DID, tx hash..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-[#0b0f19] border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 w-56 font-mono"
              />
            </div>

            <select
              value={eventTypeFilter}
              onChange={e => setEventTypeFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[#0b0f19] border border-white/10 text-xs text-purple-300 focus:outline-none focus:border-purple-500 font-mono"
            >
              {uniqueEventTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Event Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 font-sans uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">Event ID</th>
                <th className="py-3 px-3">Action Type</th>
                <th className="py-3 px-3">Actor & Role</th>
                <th className="py-3 px-3">Target DID / Token</th>
                <th className="py-3 px-3">Block / Tx</th>
                <th className="py-3 px-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-3 text-purple-400 font-bold">{log.id}</td>
                  <td className="py-3 px-3 font-semibold text-white">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                        log.eventType === 'AssetMinted'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : log.eventType === 'AssetRevoked'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : log.eventType === 'RoleGranted'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      }`}
                    >
                      {log.eventType}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="text-slate-300">{truncateHash(log.actor, 8, 4)}</div>
                    <div className="text-[10px] text-slate-500 font-sans">{log.actorRole}</div>
                  </td>
                  <td className="py-3 px-3 text-slate-400">
                    {log.targetDID ? (
                      <div className="text-cyan-300">{truncateHash(log.targetDID, 14, 4)}</div>
                    ) : log.tokenId ? (
                      <div className="text-amber-300">#Token {log.tokenId}</div>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <div className="text-slate-300">Block #{log.blockNumber}</div>
                    <div className="text-[10px] text-slate-500">{truncateHash(log.txHash, 8, 4)}</div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-[10px] font-sans transition-all"
                    >
                      Inspect Data
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#0f1422] border border-purple-500/30 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">
                  Audit Event Payload: {selectedLog.id}
                </h3>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Action:</span>
                <span className="text-purple-300 font-bold">{selectedLog.eventType}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Transaction Hash:</span>
                <span className="text-cyan-400 break-all">{selectedLog.txHash}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Block Number:</span>
                <span className="text-slate-200">{selectedLog.blockNumber}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Timestamp:</span>
                <span className="text-slate-200">{selectedLog.timestamp}</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] text-slate-400 font-semibold font-sans">Decoded Contract Event Arguments:</div>
              <pre className="p-3 rounded-xl bg-black/60 border border-white/5 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-48">
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>

            <button
              onClick={() => setSelectedLog(null)}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 font-semibold text-xs"
            >
              Close Inspector
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
