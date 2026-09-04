import React, { useState } from 'react';
import { useStore } from '../services/store';
import { QRCodeSVG } from 'qrcode.react';
import { truncateHash } from '../services/crypto';
import {
  User,
  Award,
  QrCode,
  Download,
  Send,
  Eye,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  Share2,
} from 'lucide-react';
import { ProofChainModal } from '../components/ProofChainModal';

export const UserDashboard: React.FC = () => {
  const { assets, identities, activeAccount, transferAsset, verifyAssetProof } = useStore();

  const currentIdentity = identities.find(i => i.controller.toLowerCase() === activeAccount.toLowerCase()) || identities[2];
  const userAssets = assets.filter(
    a => a.ownerDID.toLowerCase() === currentIdentity?.did.toLowerCase() ||
         a.ownerAddress.toLowerCase() === activeAccount.toLowerCase()
  );

  const [selectedAssetForQR, setSelectedAssetForQR] = useState<any>(userAssets[0] || null);
  const [inspectResult, setInspectResult] = useState<any>(null);
  const [showProofModal, setShowProofModal] = useState<boolean>(false);

  // Transfer modal
  const [transferTokenId, setTransferTokenId] = useState<number | null>(null);
  const [destAddress, setDestAddress] = useState<string>('');
  const [destDID, setDestDID] = useState<string>('');
  const [transferStatus, setTransferStatus] = useState<string | null>(null);

  const handleInspect = (tokenId: number) => {
    const result = verifyAssetProof(tokenId);
    setInspectResult(result);
    setShowProofModal(true);
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferTokenId) return;
    const res = transferAsset(transferTokenId, destAddress, destDID);
    if (res.success) {
      setTransferStatus('Asset transferred successfully on-chain!');
      setTimeout(() => {
        setTransferTokenId(null);
        setTransferStatus(null);
      }, 1500);
    } else {
      setTransferStatus(`Transfer Error: ${res.error}`);
    }
  };

  const handleDownloadProof = (asset: any) => {
    const proofDoc = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiableCredential", asset.assetType],
      issuer: asset.issuerDID,
      issuanceDate: asset.issuedAt,
      credentialSubject: asset.credentialData,
      proof: {
        type: "Secp256k1Signature2026",
        created: asset.issuedAt,
        proofPurpose: "assertionMethod",
        verificationMethod: `${asset.issuerDID}#key-1`,
        jws: asset.signature,
        onChainAnchor: {
          tokenId: asset.tokenId,
          credentialHash: asset.credentialHash,
          txHash: asset.txHash,
          blockNumber: asset.blockNumber,
        }
      }
    };

    const blob = new Blob([JSON.stringify(proofDoc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TrustChain-Proof-Token-${asset.tokenId}.json`;
    a.click();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner & Profile Overview */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-[#0d1322] border border-cyan-500/20 shadow-xl flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-[1px]">
            <div className="w-full h-full bg-[#0d1322] rounded-[15px] flex items-center justify-center">
              <User className="w-7 h-7 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-white font-['Outfit']">
                User Digital Identity & Vault
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                ACTIVE
              </span>
            </div>
            <div className="text-xs font-mono text-cyan-300 mt-1 flex items-center gap-2">
              <span>DID: {currentIdentity?.did}</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Controller: {activeAccount} {currentIdentity?.isSmartAccount ? '(ERC-4337 Smart Account)' : '(EOA)'}
            </div>
          </div>
        </div>

        <div className="flex gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-center min-w-[100px]">
            <div className="text-cyan-400 text-lg font-bold">{userAssets.length}</div>
            <div className="text-[10px] text-slate-400 uppercase font-sans">Owned Assets</div>
          </div>
          <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-center min-w-[100px]">
            <div className="text-purple-400 text-lg font-bold">
              {userAssets.filter(a => a.status === 'ACTIVE').length}
            </div>
            <div className="text-[10px] text-slate-400 uppercase font-sans">Valid Badges</div>
          </div>
        </div>
      </div>

      {/* Assets Grid & Shareable QR Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: My Credentials / NFTs */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-cyan-400" />
            My Verifiable Credentials & Digital Assets ({userAssets.length})
          </h3>

          {userAssets.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-2xl border border-white/10 space-y-3">
              <Award className="w-12 h-12 text-slate-600 mx-auto" />
              <div className="text-slate-300 font-semibold text-sm">No credentials issued to this DID yet</div>
              <p className="text-xs text-slate-500">
                Switch to Manager role to issue academic certificates, software licenses, or land titles to your DID.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userAssets.map(asset => {
                const isSelected = selectedAssetForQR?.tokenId === asset.tokenId;
                return (
                  <div
                    key={asset.tokenId}
                    onClick={() => setSelectedAssetForQR(asset)}
                    className={`glass-panel p-5 rounded-2xl border cursor-pointer transition-all space-y-4 ${
                      isSelected
                        ? 'border-cyan-400 shadow-lg shadow-cyan-500/10 bg-cyan-950/10'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-cyan-400">Token #{asset.tokenId}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 border border-white/10 text-slate-300">
                            {asset.assetType}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white mt-1">
                          {asset.credentialData.courseTitle ||
                           asset.credentialData.productName ||
                           asset.credentialData.propertyAddress ||
                           asset.schemaId}
                        </h4>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          asset.status === 'ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {asset.status}
                      </span>
                    </div>

                    {/* Key Attributes */}
                    <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5 text-xs">
                      {asset.credentialData.recipientName && (
                        <div className="flex justify-between text-slate-400">
                          <span>Recipient:</span>
                          <span className="text-white font-medium">{asset.credentialData.recipientName}</span>
                        </div>
                      )}
                      {asset.credentialData.grade && (
                        <div className="flex justify-between text-slate-400">
                          <span>Distinction:</span>
                          <span className="text-amber-400 font-medium">{asset.credentialData.grade}</span>
                        </div>
                      )}
                      {asset.credentialData.tier && (
                        <div className="flex justify-between text-slate-400">
                          <span>License Tier:</span>
                          <span className="text-cyan-400 font-medium">{asset.credentialData.tier}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-400 pt-1 border-t border-white/5 font-mono text-[11px]">
                        <span>Policy:</span>
                        {asset.isTransferable ? (
                          <span className="text-cyan-400">Transferable</span>
                        ) : (
                          <span className="text-amber-400">Soulbound (Non-Transferable)</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInspect(asset.tokenId);
                        }}
                        className="flex-1 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Verify Proof
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadProof(asset);
                        }}
                        title="Export W3C JSON Proof"
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      {asset.isTransferable && asset.status === 'ACTIVE' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setTransferTokenId(asset.tokenId);
                          }}
                          title="Transfer Asset NFT"
                          className="p-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 transition-all"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Instant Verifiable QR Card */}
        <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-6 h-fit">
          <div className="flex items-center gap-2 pb-2 border-b border-white/10">
            <QrCode className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Public Verification QR Code</h3>
          </div>

          {selectedAssetForQR ? (
            <div className="space-y-4 text-center">
              <div className="p-4 bg-white rounded-2xl inline-block shadow-2xl shadow-cyan-500/20 mx-auto">
                <QRCodeSVG
                  value={JSON.stringify({
                    protocol: "TRUSTCHAIN-SIH26125",
                    tokenId: selectedAssetForQR.tokenId,
                    hash: selectedAssetForQR.credentialHash,
                    ownerDID: selectedAssetForQR.ownerDID,
                    issuerDID: selectedAssetForQR.issuerDID,
                  })}
                  size={190}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div>
                <div className="text-xs font-mono font-bold text-cyan-300">
                  Token #{selectedAssetForQR.tokenId} ({selectedAssetForQR.assetType})
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Scan this QR code with the Public Verifier tab or any standard scanner for instant zero-knowledge cryptographic proof.
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-left text-xs font-mono space-y-1">
                <div className="text-slate-500 text-[10px]">ON-CHAIN HASH:</div>
                <div className="text-cyan-400 text-[11px] break-all">{selectedAssetForQR.credentialHash}</div>
              </div>

              <button
                onClick={() => handleDownloadProof(selectedAssetForQR)}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Export Verifiable Credential (.json)</span>
              </button>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              Select an asset on the left to generate its verifiable QR code.
            </div>
          )}
        </div>
      </div>

      {/* Transfer Asset Modal */}
      {transferTokenId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0f1422] border border-cyan-500/30 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-cyan-400">
              <Send className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Transfer Digital Asset Token #{transferTokenId}</h3>
            </div>

            {transferStatus && (
              <div className="p-3 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs">
                {transferStatus}
              </div>
            )}

            <form onSubmit={handleTransferSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Destination Controller Address:</label>
                <input
                  type="text"
                  value={destAddress}
                  onChange={e => {
                    setDestAddress(e.target.value);
                    setDestDID(`did:trustchain:${e.target.value.toLowerCase()}`);
                  }}
                  placeholder="0x4567... (42 chars)"
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Recipient DID:</label>
                <input
                  type="text"
                  value={destDID}
                  onChange={e => setDestDID(e.target.value)}
                  placeholder="did:trustchain:0x..."
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold text-xs transition-all shadow-lg shadow-cyan-500/20"
                >
                  Execute ERC-721 Transfer
                </button>
                <button
                  type="button"
                  onClick={() => setTransferTokenId(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 font-semibold text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Proof Modal */}
      <ProofChainModal
        result={inspectResult}
        isOpen={showProofModal}
        onClose={() => setShowProofModal(false)}
      />
    </div>
  );
};
