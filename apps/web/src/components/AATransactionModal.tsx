import React, { useState } from 'react';
import { Zap, CheckCircle2, ShieldCheck, ArrowRight, Loader2, X } from 'lucide-react';

interface AATransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionTitle: string;
  targetContract: string;
  did: string;
  onExecute: () => void;
}

export const AATransactionModal: React.FC<AATransactionModalProps> = ({
  isOpen,
  onClose,
  actionTitle,
  targetContract,
  did,
  onExecute,
}) => {
  const [step, setStep] = useState<'review' | 'bundling' | 'settled'>('review');

  if (!isOpen) return null;

  const handleConfirm = () => {
    setStep('bundling');
    setTimeout(() => {
      onExecute();
      setStep('settled');
    }, 1200);
  };

  const handleDone = () => {
    setStep('review');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg bg-[#0f1422] border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/20 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#131b2e]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Zap className="w-5 h-5 fill-purple-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">ERC-4337 Smart Account Execution</h3>
              <p className="text-xs text-purple-300/80">Gasless meta-transaction via Paymaster</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {step === 'review' && (
            <>
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/20 space-y-3 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="font-semibold">Operation:</span>
                  <span className="font-mono text-cyan-300">{actionTitle}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="font-semibold">Target Contract:</span>
                  <span className="font-mono text-purple-300">{targetContract}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="font-semibold">User DID:</span>
                  <span className="font-mono text-amber-300">{did.slice(0, 26)}...</span>
                </div>
                <div className="pt-2 border-t border-purple-500/20 flex justify-between items-center text-emerald-400 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    Gas Fee (TrustPaymaster Sponsored):
                  </span>
                  <span className="font-mono bg-emerald-500/20 px-2 py-0.5 rounded text-xs">0.00 ETH (Free)</span>
                </div>
              </div>

              {/* Protocol Flow visualization */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  ERC-4337 Execution Pipeline:
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                  <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                    <div className="text-cyan-400 font-bold">1. UserOp</div>
                    <div className="text-slate-500">Sign ECDSA</div>
                  </div>
                  <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                    <div className="text-purple-400 font-bold">2. Paymaster</div>
                    <div className="text-slate-500">Sponsor Gas</div>
                  </div>
                  <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                    <div className="text-emerald-400 font-bold">3. Bundler</div>
                    <div className="text-slate-500">EntryPoint.sol</div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleConfirm}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:opacity-90 text-white font-bold text-xs transition-all shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2"
              >
                <span>Sign & Dispatch Gasless UserOperation</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {step === 'bundling' && (
            <div className="py-10 text-center space-y-4">
              <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto" />
              <div>
                <h4 className="text-base font-bold text-white">Bundling UserOperation...</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Validating Paymaster sponsorship and submitting to EntryPoint contract
                </p>
              </div>
            </div>
          )}

          {step === 'settled' && (
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Transaction Settled Gaslessly!</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Smart account successfully executed the contract call with zero user gas fee.
                </p>
              </div>
              <button
                onClick={handleDone}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold text-xs transition-all"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
