import React from 'react';
import { useStore } from '../services/store';
import { truncateHash } from '../services/crypto';
import {
  Shield,
  Radar,
  Award,
  Search,
  KeyRound,
  FileCheck2,
  Lock,
  ArrowRight,
  Sparkles,
  Zap,
  Activity,
  CheckCircle2,
} from 'lucide-react';

export const DefensePortalHome: React.FC<{ onNavigate: (tab: string, role?: string) => void }> = ({
  onNavigate,
}) => {
  const { assets, identities, schemas, auditLogs, currentNetwork } = useStore();

  const activeClearances = assets.filter(a => a.assetType === 'SECURITY_CLEARANCE').length;
  const activeHardware = assets.filter(a => a.assetType === 'DEFENSE_EQUIPMENT').length;

  return (
    <div className="space-y-12 animate-in fade-in duration-300">
      {/* About BEL Section */}
      <div className="glass-panel p-8 rounded-2xl border border-slate-700 space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-white/10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono">
              <span>Navratna PSU • Ministry of Defence • Government of India</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white font-['Outfit']">
              About BEL Defense TrustChain
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Bharat Electronics Limited (BEL) is a Navratna PSU under the Ministry of Defence, Government of India. It manufactures state-of-the-art electronic products and systems for the Army, Navy, and Air Force.
            </p>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              The <strong>BEL Defense Trust Platform</strong> replaces vulnerable centralized asset tracking with an immutable, blockchain-backed framework that permanently links <strong>Military Hardware NFTs</strong> and <strong>Officer Security Clearances</strong> to Self-Sovereign Decentralized Identifiers (DIDs).
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3 shrink-0 font-mono text-center text-xs">
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 min-w-[120px]">
              <div className="text-cyan-400 text-xl font-bold">{assets.length}</div>
              <div className="text-[10px] text-slate-400 font-sans uppercase">On-Chain Assets</div>
            </div>
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 min-w-[120px]">
              <div className="text-purple-400 text-xl font-bold">{identities.length}</div>
              <div className="text-[10px] text-slate-400 font-sans uppercase">Armed Forces DIDs</div>
            </div>
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 min-w-[120px]">
              <div className="text-amber-400 text-xl font-bold">{activeHardware}</div>
              <div className="text-[10px] text-slate-400 font-sans uppercase">Radar / Ordnance NFTs</div>
            </div>
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 min-w-[120px]">
              <div className="text-emerald-400 text-xl font-bold">{auditLogs.length}</div>
              <div className="text-[10px] text-slate-400 font-sans uppercase">Immutable Logs</div>
            </div>
          </div>
        </div>

        {/* 4 Interactive Role Gateways */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* 1. Admin Governance */}
          <div
            onClick={() => onNavigate('dashboard', 'ADMIN')}
            className="p-5 rounded-xl bg-rose-950/20 border border-rose-500/30 hover:border-rose-400 hover:bg-rose-950/30 cursor-pointer transition-all space-y-3 group"
          >
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 w-fit">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors">
                1. Admin Governance & RBAC
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Authorize military DIDs, grant MOD roles, and register MIL-SPEC schemas in Solidity.
              </p>
            </div>
            <div className="text-[11px] font-semibold text-rose-400 flex items-center gap-1">
              <span>Open Admin Portal</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 2. Manager Issuance */}
          <div
            onClick={() => onNavigate('dashboard', 'MANAGER')}
            className="p-5 rounded-xl bg-amber-950/20 border border-amber-500/30 hover:border-amber-400 hover:bg-amber-950/30 cursor-pointer transition-all space-y-3 group"
          >
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 w-fit">
              <Radar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                2. Defense Asset Minter
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Mint ERC-721 military hardware tokens, anchor hashes, and issue officer credentials.
              </p>
            </div>
            <div className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
              <span>Open Minter Portal</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 3. Officer Vault */}
          <div
            onClick={() => onNavigate('dashboard', 'USER')}
            className="p-5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-950/30 cursor-pointer transition-all space-y-3 group"
          >
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 w-fit">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                3. Officer Security Vault
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Access sovereign credentials, export W3C JSON proofs, and share verifiable QR passes.
              </p>
            </div>
            <div className="text-[11px] font-semibold text-cyan-400 flex items-center gap-1">
              <span>Open Officer Vault</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 4. Public Verifier */}
          <div
            onClick={() => onNavigate('verifier')}
            className="p-5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-950/30 cursor-pointer transition-all space-y-3 group"
          >
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 w-fit">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                4. Public QR & Hash Verifier
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Zero-auth instant verification of military hardware authenticity and security passes.
              </p>
            </div>
            <div className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
              <span>Verify Any Asset</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* Strategic Defense Domains Grid */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white font-['Outfit'] uppercase tracking-wide flex items-center gap-2">
          <Radar className="w-5 h-5 text-cyan-400" />
          BEL Strategic Defense Domains & Blockchain Integration
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-[#0b1320] border border-white/10 space-y-2">
            <div className="font-bold text-cyan-300 text-sm">📡 Tactical Radars & Sonars</div>
            <p className="text-slate-400 leading-relaxed">
              3D Central Acquisition Radars, Weapon Locating Radars (Swathi), Battle Field Surveillance Radars anchored on-chain with lifecycle overhaul tracking.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0b1320] border border-white/10 space-y-2">
            <div className="font-bold text-purple-300 text-sm">🛡️ Electronic Warfare & Avionics</div>
            <p className="text-slate-400 leading-relaxed">
              Naval EW suites (Samyukta, Himshakti), Flight Control Computers, and Radar Warning Receivers authenticated cryptographically.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0b1320] border border-white/10 space-y-2">
            <div className="font-bold text-amber-300 text-sm">🔒 Security Clearances & C4I</div>
            <p className="text-slate-400 leading-relaxed">
              Tamper-proof clearance tokens bound to personnel DIDs, ensuring zero impersonation in sensitive strategic command headquarters.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
