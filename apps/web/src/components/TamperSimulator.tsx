import React, { useState } from 'react';
import { useStore } from '../services/store';
import { AssetRecord } from '../types';
import { computeCredentialHash } from '../services/crypto';
import {
  Flame,
  AlertOctagon,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Eye,
} from 'lucide-react';
import { ProofChainModal } from './ProofChainModal';

export const TamperSimulator: React.FC = () => {
  const { assets, verifyAssetProof } = useStore();
  const [selectedTokenId, setSelectedTokenId] = useState<number>(1);
  const [tamperedPayload, setTamperedPayload] = useState<Record<string, any>>({});
  const [selectedField, setSelectedField] = useState<string>('grade');
  const [tamperedVal, setTamperedVal] = useState<string>('Grade O (Forged Distinction)');
  const [showProofModal, setShowProofModal] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  const currentAsset = assets.find(a => a.tokenId === selectedTokenId) || assets[0];

  // Initialize tampered payload from current asset
  React.useEffect(() => {
    if (currentAsset) {
      setTamperedPayload({ ...currentAsset.credentialData });
      // Set sensible default tamper field
      if (currentAsset.credentialData.grade) {
        setSelectedField('grade');
        setTamperedVal('Grade S+ (Forged Honor)');
      } else if (currentAsset.credentialData.recipientName) {
        setSelectedField('recipientName');
        setTamperedVal('Attacker / Fraudulent Holder');
      } else if (currentAsset.credentialData.seatLimit) {
        setSelectedField('seatLimit');
        setTamperedVal('999999');
      }
    }
  }, [selectedTokenId, currentAsset]);

  const handleApplyTamper = () => {
    let parsedVal: any = tamperedVal;
    if (!isNaN(Number(tamperedVal)) && !isNaN(parseFloat(tamperedVal))) {
      parsedVal = Number(tamperedVal);
    }
    setTamperedPayload(prev => ({ ...prev, [selectedField]: parsedVal }));
  };

  const handleResetTamper = () => {
    if (currentAsset) {
      setTamperedPayload({ ...currentAsset.credentialData });
    }
  };

  const handleVerifyTampered = () => {
    const result = verifyAssetProof(selectedTokenId, tamperedPayload);
    setVerificationResult(result);
    setShowProofModal(true);
  };

  if (!currentAsset) return null;

  const originalHash = currentAsset.credentialHash;
  const currentComputedHash = computeCredentialHash(tamperedPayload);
  const isTampered = originalHash.toLowerCase() !== currentComputedHash.toLowerCase();

  return (
    <div className="glass-panel p-6 rounded-2xl border border-rose-500/20 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30">
            <Flame className="w-6 h-6 text-rose-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              SIH Security & Tamper Simulator
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Judge Demonstration
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Modify off-chain payload fields and watch cryptographic proof verification fail in real time.
            </p>
          </div>
        </div>

        {/* Asset Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 font-mono">Target Asset:</label>
          <select
            value={selectedTokenId}
            onChange={e => setSelectedTokenId(Number(e.target.value))}
            className="px-3 py-1.5 rounded-lg bg-[#0b0f19] border border-white/10 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
          >
            {assets.map(a => (
              <option key={a.tokenId} value={a.tokenId}>
                Token #{a.tokenId} ({a.assetType}) - {a.ownerDID.slice(0, 20)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Interactive Modification Sandbox */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Field Selector */}
        <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-2">
          <label className="text-xs font-semibold text-slate-300">Select Field to Forge:</label>
          <select
            value={selectedField}
            onChange={e => setSelectedField(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#0d1322] border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
          >
            {Object.keys(currentAsset.credentialData).map(key => (
              <option key={key} value={key}>
                {key} ({typeof currentAsset.credentialData[key]})
              </option>
            ))}
          </select>
          <div className="text-[11px] text-slate-500">
            Original Value: <span className="text-slate-300 font-mono">{String(currentAsset.credentialData[selectedField])}</span>
          </div>
        </div>

        {/* New Fraudulent Value */}
        <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-2">
          <label className="text-xs font-semibold text-slate-300">New Tampered Value:</label>
          <input
            type="text"
            value={tamperedVal}
            onChange={e => setTamperedVal(e.target.value)}
            placeholder="Enter fraudulent value..."
            className="w-full px-3 py-2 rounded-lg bg-[#0d1322] border border-rose-500/40 text-xs text-rose-300 font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleApplyTamper}
              className="flex-1 px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-semibold transition-all"
            >
              Apply Tamper
            </button>
            <button
              onClick={handleResetTamper}
              className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 text-xs flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>
        </div>

        {/* Live Hash Status */}
        <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Integrity State:</span>
            {isTampered ? (
              <span className="flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/30">
                <XCircle className="w-3.5 h-3.5" /> TAMPERED
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" /> GENUINE
              </span>
            )}
          </div>

          <div className="text-[10px] space-y-1 font-mono">
            <div className="text-slate-500 truncate">Anchored: {originalHash.slice(0, 18)}...</div>
            <div className={`truncate ${isTampered ? 'text-rose-400' : 'text-emerald-400'}`}>
              Computed: {currentComputedHash.slice(0, 18)}...
            </div>
          </div>

          <button
            onClick={handleVerifyTampered}
            className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg ${
              isTampered
                ? 'bg-gradient-to-r from-rose-500 to-amber-600 text-white shadow-rose-500/20'
                : 'bg-gradient-to-r from-emerald-500 to-cyan-600 text-white shadow-emerald-500/20'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Run Cryptographic Verification
          </button>
        </div>
      </div>

      {/* JSON Inspection Box */}
      <div className="p-4 rounded-xl bg-[#090d16] border border-white/5 space-y-2">
        <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono">
          <span>Active Test Payload (Deterministic JSON):</span>
          <span>Status: {isTampered ? 'MODIFIED' : 'UNALTERED'}</span>
        </div>
        <pre className="text-[11px] font-mono text-cyan-300/90 overflow-x-auto max-h-36 p-2 rounded bg-black/40">
          {JSON.stringify(tamperedPayload, null, 2)}
        </pre>
      </div>

      {/* Verification Modal */}
      <ProofChainModal
        result={verificationResult}
        isOpen={showProofModal}
        onClose={() => setShowProofModal(false)}
      />
    </div>
  );
};
