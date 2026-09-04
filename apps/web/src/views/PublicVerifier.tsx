import React, { useState } from 'react';
import { useStore } from '../services/store';
import { VerificationResult } from '../types';
import {
  Search,
  Upload,
  FileCheck2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  QrCode,
  Sparkles,
  Fingerprint,
  Link,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const PublicVerifier: React.FC = () => {
  const { verifyAssetProof, assets } = useStore();

  const [verifyMode, setVerifyMode] = useState<'token' | 'json' | 'qr'>('token');
  const [tokenIdInput, setTokenIdInput] = useState<string>('1');
  const [jsonInput, setJsonInput] = useState<string>('');
  const [qrInput, setQrInput] = useState<string>('');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  const handleVerify = () => {
    setHasSearched(true);
    if (verifyMode === 'token') {
      const res = verifyAssetProof(Number(tokenIdInput));
      setResult(res);
    } else if (verifyMode === 'json') {
      try {
        const parsed = JSON.parse(jsonInput);
        const res = verifyAssetProof(undefined, parsed);
        setResult(res);
      } catch (e: any) {
        alert('Invalid JSON input. Please check syntax.');
      }
    } else if (verifyMode === 'qr') {
      try {
        const parsed = JSON.parse(qrInput);
        const res = verifyAssetProof(parsed.tokenId);
        setResult(res);
      } catch (e) {
        alert('Invalid QR payload format.');
      }
    }
  };

  const loadSample = (type: 'valid_cert' | 'valid_license' | 'tampered' | 'revoked') => {
    if (type === 'valid_cert') {
      setVerifyMode('token');
      setTokenIdInput('1');
      const res = verifyAssetProof(1);
      setResult(res);
      setHasSearched(true);
    } else if (type === 'valid_license') {
      setVerifyMode('token');
      setTokenIdInput('2');
      const res = verifyAssetProof(2);
      setResult(res);
      setHasSearched(true);
    } else if (type === 'tampered') {
      setVerifyMode('json');
      const asset = assets[0];
      const tampered = {
        ...asset?.credentialData,
        recipientName: 'Fraudulent Hacker',
        grade: 'Grade S+++ (Forged Distinction)',
      };
      setJsonInput(JSON.stringify(tampered, null, 2));
      const res = verifyAssetProof(asset?.tokenId, tampered);
      setResult(res);
      setHasSearched(true);
    } else if (type === 'revoked') {
      setVerifyMode('token');
      // Create revoked simulation if needed or find revoked
      const revoked = assets.find(a => a.status === 'REVOKED');
      if (revoked) {
        setTokenIdInput(String(revoked.tokenId));
        const res = verifyAssetProof(revoked.tokenId);
        setResult(res);
      } else {
        alert('Revoke an asset first using the Manager Dashboard or SIH Demo Script to test this scenario.');
      }
      setHasSearched(true);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="text-center space-y-3 py-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
          <ShieldCheck className="w-4 h-4" />
          Zero-Authentication Public Trust Verifier
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-['Outfit'] tracking-tight">
          Verify Authenticity & Cryptographic Provenance
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl mx-auto">
          Independent, tamper-proof verification pipeline. Validates off-chain JSON credentials against immutable on-chain smart contract anchors, W3C schemas, and issuer ECDSA signatures.
        </p>
      </div>

      {/* Quick Test Vectors / Judge Demo Shortcuts */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="text-slate-400 font-semibold font-mono flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          SIH Test Scenarios:
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => loadSample('valid_cert')}
            className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-medium transition-all"
          >
            ✓ Academic Certificate (Token #1)
          </button>
          <button
            onClick={() => loadSample('valid_license')}
            className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-medium transition-all"
          >
            ✓ Enterprise License (Token #2)
          </button>
          <button
            onClick={() => loadSample('tampered')}
            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-medium transition-all"
          >
            ⚠ Tampered Credential (Fails Hash)
          </button>
        </div>
      </div>

      {/* Input Selector & Form */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/10 space-y-6 shadow-2xl">
        {/* Mode Tabs */}
        <div className="grid grid-cols-3 gap-2 bg-[#0b0f19] p-1.5 rounded-xl border border-white/10 text-xs font-semibold">
          <button
            onClick={() => setVerifyMode('token')}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${
              verifyMode === 'token'
                ? 'bg-cyan-500 text-slate-900 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Search className="w-4 h-4" />
            Asset Token ID
          </button>
          <button
            onClick={() => setVerifyMode('json')}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${
              verifyMode === 'json'
                ? 'bg-cyan-500 text-slate-900 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4" />
            Paste Credential JSON
          </button>
          <button
            onClick={() => setVerifyMode('qr')}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${
              verifyMode === 'qr'
                ? 'bg-cyan-500 text-slate-900 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4" />
            Scan / Paste QR Data
          </button>
        </div>

        {/* Dynamic Input Based on Mode */}
        {verifyMode === 'token' && (
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300">Enter Asset Token ID (from ERC-721 NFT):</label>
            <div className="flex gap-3">
              <input
                type="number"
                min="1"
                value={tokenIdInput}
                onChange={e => setTokenIdInput(e.target.value)}
                placeholder="e.g. 1"
                className="flex-1 px-4 py-3 rounded-xl bg-[#0b0f19] border border-white/10 text-cyan-300 font-mono text-sm focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleVerify}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-90 text-slate-900 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
              >
                Verify on Blockchain
              </button>
            </div>
          </div>
        )}

        {verifyMode === 'json' && (
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300">Paste Verifiable Credential JSON Payload:</label>
            <textarea
              rows={6}
              value={jsonInput}
              onChange={e => setJsonInput(e.target.value)}
              placeholder="Paste JSON object here..."
              className="w-full p-4 rounded-xl bg-[#0b0f19] border border-white/10 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={handleVerify}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-90 text-slate-900 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
            >
              Recalculate Canonical Hash & Verify Proof Chain
            </button>
          </div>
        )}

        {verifyMode === 'qr' && (
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300">Paste QR Payload JSON:</label>
            <input
              type="text"
              value={qrInput}
              onChange={e => setQrInput(e.target.value)}
              placeholder='{"protocol":"TRUSTCHAIN-SIH26125","tokenId":1,...}'
              className="w-full px-4 py-3 rounded-xl bg-[#0b0f19] border border-white/10 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={handleVerify}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-90 text-slate-900 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
            >
              Parse QR & Run Cryptographic Check
            </button>
          </div>
        )}
      </div>

      {/* Verification Results Panel */}
      {hasSearched && result && (
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/10 space-y-6 shadow-2xl animate-in fade-in">
          {/* Header with Overall Status Banner */}
          <div
            className={`p-5 rounded-2xl border flex flex-wrap items-center justify-between gap-4 ${
              result.overallStatus === 'VALID'
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : result.overallStatus === 'REVOKED'
                ? 'bg-rose-500/10 border-rose-500/30'
                : 'bg-rose-500/10 border-rose-500/30'
            }`}
          >
            <div className="flex items-center gap-3">
              {result.overallStatus === 'VALID' ? (
                <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400">
                  <XCircle className="w-8 h-8" />
                </div>
              )}
              <div>
                <h3 className="text-xl font-extrabold text-white font-['Outfit']">
                  {result.overallStatus === 'VALID'
                    ? '100% Cryptographically Authentic & Valid'
                    : result.overallStatus === 'REVOKED'
                    ? 'Asset Revoked On-Chain by Issuer'
                    : result.overallStatus === 'NOT_FOUND'
                    ? 'Asset Not Found on Blockchain'
                    : 'Integrity Check Failed / Hash Mismatch'}
                </h3>
                <p className="text-xs text-slate-300">
                  {result.overallStatus === 'VALID'
                    ? 'All 6 cryptographic proof layers passed successfully against Solidity smart contracts.'
                    : 'The presented credential violates integrity checks, issuer authority, or has been revoked.'}
                </p>
              </div>
            </div>

            <div className="text-right font-mono text-xs">
              <span
                className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                  result.overallStatus === 'VALID'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                STATUS: {result.overallStatus}
              </span>
            </div>
          </div>

          {/* Side by Side Hash Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-1 font-mono text-xs">
              <span className="text-[10px] text-slate-400 font-sans uppercase">Computed Canonical Hash:</span>
              <div className="text-cyan-300 break-all">{result.computedHash || 'N/A'}</div>
            </div>
            <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-1 font-mono text-xs">
              <span className="text-[10px] text-slate-400 font-sans uppercase">On-Chain Anchored Hash:</span>
              <div className="text-purple-300 break-all">{result.onChainHash || 'N/A'}</div>
            </div>
          </div>

          {/* 6 Proof Checks Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Link className="w-4 h-4 text-cyan-400" />
              Cryptographic Proof Chain Breakdown (Section 10 Verification Pipeline):
            </h4>

            <div className="space-y-2.5">
              {result.checks.map((step, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border flex items-start gap-3 ${
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
                        className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase ${
                          step.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {step.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{step.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
