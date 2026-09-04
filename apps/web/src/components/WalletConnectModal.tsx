import React, { useState } from 'react';
import { useStore } from '../services/store';
import { Web3Service, SUPPORTED_NETWORKS } from '../services/web3Service';
import { generateNewBurnerWallet, rotateBurnerWallet } from '../services/walletGenerator';
import { truncateHash } from '../services/crypto';
import {
  Wallet,
  Zap,
  KeyRound,
  CheckCircle2,
  RefreshCw,
  Copy,
  ExternalLink,
  X,
  ShieldCheck,
  Globe,
  AlertCircle,
} from 'lucide-react';

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletConnectModal: React.FC<WalletConnectModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    activeAccount,
    setActiveAccount,
    currentNetwork,
    setCurrentNetwork,
    walletType,
    setWalletType,
    burnerWallet,
    setBurnerWallet,
    walletBalance,
  } = useStore();

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleConnectMetaMask = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const result = await Web3Service.connectMetaMask();
      setActiveAccount(result.address);
      setWalletType('METAMASK');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to connect MetaMask wallet.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewBurner = () => {
    const newWallet = rotateBurnerWallet();
    setBurnerWallet(newWallet);
    setActiveAccount(newWallet.address);
    setWalletType('BURNER');
  };

  const handleSwitchNetwork = async (key: 'anvil' | 'sepolia' | 'amoy') => {
    setCurrentNetwork(key);
    if (walletType === 'METAMASK') {
      try {
        await Web3Service.switchNetwork(key);
      } catch (e: any) {
        console.error('Failed to switch network in MetaMask:', e);
      }
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg bg-[#0f172a] border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-500/20 overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#002244]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-['Outfit']">
                Connect Web3 Wallet & Network
              </h3>
              <p className="text-xs text-slate-300">
                MetaMask EIP-1193 or Built-in Cryptographic Test Wallet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Network Selection */}
          <div className="space-y-2">
            <label className="text-slate-300 font-semibold uppercase tracking-wider text-[10px]">
              Active Blockchain Network:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(SUPPORTED_NETWORKS).map(([key, net]) => {
                const isActive = currentNetwork === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleSwitchNetwork(key as any)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isActive
                        ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300 shadow-md'
                        : 'bg-black/30 border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <div className="font-bold text-white text-xs">{net.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Chain ID: {net.id}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Connection Methods */}
          <div className="space-y-4 pt-2">
            <label className="text-slate-300 font-semibold uppercase tracking-wider text-[10px]">
              Choose Connection Method:
            </label>

            {/* Option 1: MetaMask */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center font-bold text-orange-400 text-sm">
                    🦊
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs">Browser Wallet (MetaMask / Injected)</div>
                    <div className="text-[10px] text-slate-400">Standard Web3 EIP-1193 Provider</div>
                  </div>
                </div>

                {walletType === 'METAMASK' ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold text-[10px]">
                    CONNECTED
                  </span>
                ) : (
                  <button
                    onClick={handleConnectMetaMask}
                    disabled={loading}
                    className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-900 font-bold text-xs shadow-md transition-all"
                  >
                    {loading ? 'Connecting...' : 'Connect'}
                  </button>
                )}
              </div>
            </div>

            {/* Option 2: In-Browser Burner Key Generator */}
            <div className="p-4 rounded-xl bg-black/40 border border-cyan-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs">In-Browser Cryptographic Test Wallet</div>
                    <div className="text-[10px] text-slate-400">Zero-extension secp256k1 keypair for SIH demo</div>
                  </div>
                </div>

                <button
                  onClick={handleCreateNewBurner}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-semibold text-xs flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Generate New
                </button>
              </div>

              {/* Active Keypair Details */}
              {burnerWallet && (
                <div className="p-3 rounded-lg bg-[#0b1320] border border-white/5 space-y-2 font-mono text-[11px]">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="font-sans text-[10px]">Address:</span>
                    <div className="flex items-center gap-1.5 text-cyan-300">
                      <span>{truncateHash(burnerWallet.address, 10, 6)}</span>
                      <button
                        onClick={() => handleCopy(burnerWallet.address)}
                        className="text-slate-500 hover:text-cyan-400"
                        title="Copy Address"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-slate-400">
                    <span className="font-sans text-[10px]">Private Key (secp256k1):</span>
                    <div className="flex items-center gap-1.5 text-purple-300">
                      <span>{truncateHash(burnerWallet.privateKey, 8, 6)}</span>
                      <button
                        onClick={() => handleCopy(burnerWallet.privateKey)}
                        className="text-slate-500 hover:text-purple-400"
                        title="Copy Private Key"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-white/5">
                    <span className="font-sans text-[10px]">Test Balance:</span>
                    <span className="text-emerald-400 font-bold">{walletBalance} ETH</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {copiedKey && (
            <div className="text-center text-emerald-400 font-mono text-[11px] animate-pulse">
              ✓ Copied to clipboard!
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#002244] flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">
            Active: {truncateHash(activeAccount, 6, 4)}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold text-xs transition-all shadow-lg shadow-cyan-500/20"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
