import React, { useState } from 'react';
import { StoreProvider, useStore } from './services/store';
import { BELHeader } from './components/BELHeader';
import { Navbar } from './components/Navbar';
import { FlashNewsTicker } from './components/FlashNewsTicker';
import { DefenseHeroBanner } from './components/DefenseHeroBanner';
import { DefensePortalHome } from './views/DefensePortalHome';
import { AdminDashboard } from './views/AdminDashboard';
import { ManagerDashboard } from './views/ManagerDashboard';
import { UserDashboard } from './views/UserDashboard';
import { AuditorDashboard } from './views/AuditorDashboard';
import { PublicVerifier } from './views/PublicVerifier';
import { JudgeDemoSuite } from './views/JudgeDemoSuite';
import { Shield, ExternalLink, Code2, CheckCircle, Globe } from 'lucide-react';

const MainApp: React.FC = () => {
  const { currentRole, setCurrentRole } = useStore();
  const [activeTab, setActiveTab] = useState<string>('home'); // Default to BEL Home Showcase

  const handleNavigate = (tab: string, role?: string) => {
    setActiveTab(tab);
    if (role) {
      setCurrentRole(role as any);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#070b14] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 1. Official BEL Ministry of Defence Top Header */}
      <BELHeader />

      {/* 2. Official Primary Navy Navigation Bar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 3. Live Flash News Ticker */}
      <FlashNewsTicker />

      {/* 4. Defense Hero Banner (Displayed on Home & Demo Views) */}
      {(activeTab === 'home' || activeTab === 'judge') && (
        <DefenseHeroBanner />
      )}

      {/* 5. Main Content Work Area */}
      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'home' && (
          <DefensePortalHome onNavigate={handleNavigate} />
        )}

        {activeTab === 'judge' && (
          <JudgeDemoSuite onNavigateToTab={setActiveTab} />
        )}

        {activeTab === 'verifier' && (
          <PublicVerifier />
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Quick Role Gateway Bar when in Dashboard tab */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white/5 border border-white/10 rounded-2xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <span>Active Portal Role:</span>
                <span className="px-2.5 py-0.5 rounded font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  {currentRole}
                </span>
              </div>
              <div className="flex gap-1 text-xs">
                <button
                  onClick={() => setCurrentRole('ADMIN')}
                  className={`px-2.5 py-1 rounded-lg ${currentRole === 'ADMIN' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Admin Portal
                </button>
                <button
                  onClick={() => setCurrentRole('MANAGER')}
                  className={`px-2.5 py-1 rounded-lg ${currentRole === 'MANAGER' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Minter Portal
                </button>
                <button
                  onClick={() => setCurrentRole('USER')}
                  className={`px-2.5 py-1 rounded-lg ${currentRole === 'USER' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Officer Vault
                </button>
                <button
                  onClick={() => setCurrentRole('AUDITOR')}
                  className={`px-2.5 py-1 rounded-lg ${currentRole === 'AUDITOR' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Auditor Trail
                </button>
              </div>
            </div>

            {currentRole === 'ADMIN' && <AdminDashboard />}
            {currentRole === 'MANAGER' && <ManagerDashboard />}
            {currentRole === 'USER' && <UserDashboard />}
            {currentRole === 'AUDITOR' && <AuditorDashboard />}
            {currentRole === 'PUBLIC' && <PublicVerifier />}
          </div>
        )}
      </main>

      {/* Official Bharat Electronics Limited Footer */}
      <footer className="w-full border-t border-slate-800 bg-[#001833] text-slate-300 mt-16 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-xs">
            {/* Column 1 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Shield className="w-5 h-5 text-cyan-400" />
                <span>Bharat Electronics Limited</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                A Navratna PSU under the Ministry of Defence, Government of India. CIN: L32309KA1954GOI000787.
              </p>
              <div className="text-[10px] text-cyan-300 font-mono">
                Smart India Hackathon 2026 (SIH26125)
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-1.5 font-sans text-[11px]">
              <div className="text-white font-bold uppercase text-[10px] tracking-wider mb-2 text-amber-300">
                Defense Blockchain Architecture
              </div>
              <div className="text-slate-300">• W3C Decentralized Identifiers (DIDs)</div>
              <div className="text-slate-300">• RoleManager.sol On-Chain RBAC</div>
              <div className="text-slate-300">• SchemaRegistry.sol (MIL-SPEC Schemas)</div>
              <div className="text-slate-300">• AssetRegistry.sol + ERC-721 NFTs</div>
              <div className="text-slate-300">• ERC-4337 Account Abstraction</div>
            </div>

            {/* Column 3 */}
            <div className="space-y-1.5 font-sans text-[11px]">
              <div className="text-white font-bold uppercase text-[10px] tracking-wider mb-2 text-cyan-300">
                Supported Defense Testnets
              </div>
              <div>• Local Anvil EVM Node (Port 8545)</div>
              <div>• Ethereum Sepolia Testnet (ChainId 11155111)</div>
              <div>• Polygon Amoy Testnet (ChainId 80002)</div>
              <div>• In-Browser secp256k1 Burner Signer</div>
            </div>

            {/* Column 4 */}
            <div className="space-y-2">
              <div className="text-white font-bold uppercase text-[10px] tracking-wider text-emerald-300">
                Security Assurance
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1 text-[11px]">
                <div className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Zero Central Point of Failure
                </div>
                <div className="text-slate-400">
                  Mathematical proof chain verified in real time without admin credentials.
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-500 font-mono">
            <div>© 2026 Bharat Electronics Limited (BEL). All Rights Reserved.</div>
            <div>Ministry of Defence, Government of India • SIH26125 Hybrid Architecture</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <MainApp />
    </StoreProvider>
  );
}
