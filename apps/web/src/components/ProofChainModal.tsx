import React from 'react';
import { VerificationResult } from '../types';
import { truncateHash } from '../services/crypto';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCheck2,
  KeyRound,
  Fingerprint,
  Link,
  Clock,
  X,
  Copy,
  ExternalLink,
} from 'lucide-react';

interface ProofChainModalProps {
  result: VerificationResult | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ProofChainModal: React.FC<ProofChainModalProps> = ({
  result,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !result) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const getStatusBadge = () => {
    switch (result.overallStatus) {
      case 'VALID':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>CRYPTOGRAPHICALLY VALID</span>
          </div>
        );
      case 'REVOKED':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm font-semibold">
            <XCircle className="w-4 h-4" />
            <span>REVOKED ON-CHAIN</span>
          </div>
        );
      case 'EXPIRED':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-semibold">
            <Clock className="w-4 h-4" />
            <span>VALIDITY PERIOD EXPIRED</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm font-semibold">
            <AlertTriangle className="w-4 h-4" />
            <span>INTEGRITY CHECK FAILED</span>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-[#0f1422] border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-500/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-[#131b2e]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <FileCheck2 className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Decentralized Trust Proof Chain
                {result.tokenId && <span className="text-xs font-mono text-cyan-400">#Token {result.tokenId}</span>}
              </h3>
              <p className="text-xs text-slate-400">Deterministic on-chain cryptographic audit</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {getStatusBadge()}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Hash Comparison Card */}
          <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center text-slate-400 font-sans text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <Fingerprint className="w-4 h-4 text-cyan-400" />
                Cryptographic Anchor Hash Verification
              </span>
              <span className="text-[11px] text-slate-500">Algorithm: Keccak-256 (Canonical JSON)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-[#0d1322] border border-white/5 space-y-1">
                <div className="text-[10px] text-slate-400 font-sans uppercase tracking-wider">
                  Recalculated Payload Hash:
                </div>
                <div className="flex items-center justify-between text-cyan-300 break-all font-mono">
                  <span>{result.computedHash || 'N/A'}</span>
                  <button
                    onClick={() => copyToClipboard(result.computedHash)}
                    className="p-1 text-slate-500 hover:text-cyan-400"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#0d1322] border border-white/5 space-y-1">
                <div className="text-[10px] text-slate-400 font-sans uppercase tracking-wider">
                  Authoritative On-Chain Anchor:
                </div>
                <div className="flex items-center justify-between text-indigo-300 break-all font-mono">
                  <span>{result.onChainHash || 'N/A'}</span>
                  <button
                    onClick={() => copyToClipboard(result.onChainHash || '')}
                    className="p-1 text-slate-500 hover:text-indigo-400"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 6-Step Proof Steps Tree */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Link className="w-3.5 h-3.5 text-cyan-400" />
              Detailed Multi-Layer Proof Checks
            </h4>

            <div className="space-y-2.5">
              {result.checks.map((step, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border transition-all flex items-start gap-3.5 ${
                    step.passed
                      ? 'bg-emerald-500/[0.04] border-emerald-500/20'
                      : 'bg-rose-500/[0.06] border-rose-500/30'
                  }`}
                >
                  <div className="mt-0.5">
                    {step.passed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white font-mono">{step.name}</span>
                      <span
                        className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded ${
                          step.passed
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400 font-bold'
                        }`}
                      >
                        {step.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{step.message}</p>
                    {step.details && (
                      <div className="mt-2 p-2 rounded bg-black/40 text-[11px] font-mono text-slate-400 overflow-x-auto">
                        <pre>{JSON.stringify(step.details, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DIDs Involved */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-mono">
            {result.issuerDID && (
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-slate-400 font-sans block text-[10px]">ISSUER DID:</span>
                <span className="text-amber-400">{result.issuerDID}</span>
              </div>
            )}
            {result.ownerDID && (
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-slate-400 font-sans block text-[10px]">OWNER DID:</span>
                <span className="text-cyan-400">{result.ownerDID}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#131b2e] flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">Verified at: {result.timestamp}</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold text-xs transition-all shadow-lg shadow-cyan-500/20"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
