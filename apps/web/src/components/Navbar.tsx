import React, { useState } from 'react';
import { useStore } from '../services/store';
import { UserRole } from '../types';
import { truncateHash } from '../services/crypto';
import { SUPPORTED_NETWORKS } from '../services/web3Service';
import {
  Home,
  Shield,
  ShieldCheck,
  Briefcase,
  User,
  Search,
  Zap,
  RotateCcw,
  Sparkles,
  Wallet,
  Globe,
  ChevronDown,
} from 'lucide-react';
import { WalletConnectModal } from './WalletConnectModal';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const {
    currentRole,
    setCurrentRole,
    activeAccount,
    walletType,
    currentNetwork,
    walletBalance,
    isAccountAbstraction,
    setIsAccountAbstraction,
    resetToGenesis,
  } = useStore();

  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  const roles: { role: UserRole; label: string; icon: any; color: string }[] = [
    { role: 'ADMIN', label: 'Admin', icon: Shield, color: 'text-rose-300 bg-rose-500/20 border-rose-500/40' },
    { role: 'MANAGER', label: 'Minter', icon: Briefcase, color: 'text-amber-300 bg-amber-500/20 border-amber-500/40' },
    { role: 'USER', label: 'Officer', icon: User, color: 'text-cyan-300 bg-cyan-500/20 border-cyan-500/40' },
    { role: 'AUDITOR', label: 'Auditor', icon: ShieldCheck, color: 'text-purple-300 bg-purple-500/20 border-purple-500/40' },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-blue-900/60 bg-[#002244] text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-3">
            {/* Left Nav: Home & Portal links */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab('home')}
                className={`p-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'home'
                    ? 'bg-blue-700 text-white shadow-md'
                    : 'text-slate-200 hover:text-white hover:bg-white/10'
                }`}
                title="BEL Portal Home"
              >
                <Home className="w-4 h-4 text-cyan-300" />
                <span className="hidden md:inline">Home</span>
              </button>

              <button
                onClick={() => setActiveTab('judge')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'judge'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-900 font-bold shadow-md'
                    : 'text-slate-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>SIH Demo Script</span>
              </button>

              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-700 text-white shadow-md'
                    : 'text-slate-200 hover:text-white hover:bg-white/10'
                }`}
              >
                Role Portal
              </button>

              <button
                onClick={() => setActiveTab('verifier')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'verifier'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <Search className="w-3.5 h-3.5 text-emerald-300" />
                <span>Public Verifier</span>
              </button>
            </div>

            {/* Right Nav: Role Switcher & Real Web3 Wallet Button */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Role Switcher */}
              <div className="hidden lg:flex items-center bg-[#001833] p-0.5 rounded-lg border border-blue-800">
                <span className="text-[10px] text-slate-400 px-2 font-mono">ROLE:</span>
                <div className="flex gap-0.5">
                  {roles.map(r => {
                    const Icon = r.icon;
                    const isActive = currentRole === r.role;
                    return (
                      <button
                        key={r.role}
                        onClick={() => {
                          setCurrentRole(r.role);
                          setActiveTab('dashboard');
                        }}
                        className={`px-2 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${
                          isActive
                            ? `${r.color} border font-bold shadow-sm`
                            : 'text-slate-300 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        <span>{r.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Network Pill & Connect Wallet Button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsWalletModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 border border-cyan-400/40 text-white font-mono text-xs font-bold transition-all shadow-lg flex items-center gap-2"
                >
                  <Wallet className="w-3.5 h-3.5 text-cyan-200" />
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="hidden sm:inline">
                      {truncateHash(activeAccount, 6, 4)}
                    </span>
                    <span className="text-[10px] font-sans px-1.5 py-0.2 rounded bg-black/30 text-cyan-200 border border-white/10 uppercase">
                      {currentNetwork}
                    </span>
                  </div>
                </button>

                {/* Reset Genesis Button */}
                <button
                  onClick={() => {
                    if (confirm('Reset state to clean BEL defense genesis seed?')) {
                      resetToGenesis();
                    }
                  }}
                  title="Reset Demo State"
                  className="p-2 rounded-xl bg-white/10 hover:bg-rose-600 border border-white/10 text-slate-300 hover:text-white transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Wallet Connection Modal */}
      <WalletConnectModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
      />
    </>
  );
};
