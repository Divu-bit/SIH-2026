import React, { useState } from 'react';
import { useStore } from '../services/store';
import { truncateHash, computeCredentialHash } from '../services/crypto';
import {
  Briefcase,
  PlusCircle,
  FileCheck2,
  ShieldAlert,
  Zap,
  CheckCircle2,
  XCircle,
  Layers,
  Sparkles,
} from 'lucide-react';
import { ProofChainModal } from '../components/ProofChainModal';
import { AATransactionModal } from '../components/AATransactionModal';

export const ManagerDashboard: React.FC = () => {
  const {
    schemas,
    assets,
    identities,
    issueAsset,
    revokeAsset,
    verifyAssetProof,
    isAccountAbstraction,
    activeAccount,
  } = useStore();

  const [selectedSchemaId, setSelectedSchemaId] = useState<string>('CERTIFICATE_V1');
  const [recipientDID, setRecipientDID] = useState<string>(
    identities.find(i => i.role === 'USER')?.did || 'did:trustchain:0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc'
  );
  const [isTransferable, setIsTransferable] = useState<boolean>(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal states
  const [inspectResult, setInspectResult] = useState<any>(null);
  const [showProofModal, setShowProofModal] = useState<boolean>(false);
  const [showAAModal, setShowAAModal] = useState<boolean>(false);
  const [pendingIssueParams, setPendingIssueParams] = useState<any>(null);

  // Revocation state
  const [revokeTokenId, setRevokeTokenId] = useState<number | null>(null);
  const [revokeReason, setRevokeReason] = useState<string>('Administrative recall / Credential invalidated');

  const selectedSchema = schemas.find(s => s.schemaId === selectedSchemaId) || schemas[0];

  // Populate sensible defaults when schema changes
  React.useEffect(() => {
    if (selectedSchema) {
      if (selectedSchema.schemaId === 'CERTIFICATE_V1') {
        setFormData({
          certificateId: `CERT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          recipientName: 'Rahul Kumar',
          recipientDID: recipientDID,
          courseTitle: 'Full-Stack Decentralized Application Architecture',
          issuerName: 'National Blockchain Institute',
          grade: 'Grade A+ (Distinction)',
          issueDate: new Date().toISOString(),
          criteria: 'Verified proficiency in Solidity smart contracts, W3C DIDs, and zero-knowledge proofs.',
        });
        setIsTransferable(false); // soulbound
      } else if (selectedSchema.schemaId === 'SOFTWARE_LICENSE_V1') {
        setFormData({
          licenseKey: `LIC-ENT-${Math.floor(1000 + Math.random() * 9000)}-Z8`,
          productName: 'TrustMesh Cloud Node v3.0',
          licenseeOrganization: 'Global Tech Enterprises',
          licenseeDID: recipientDID,
          seatLimit: 250,
          tier: 'Enterprise',
          issuedAt: new Date().toISOString(),
          expiresAt: '2028-09-01T00:00:00Z',
        });
        setIsTransferable(true);
      } else if (selectedSchema.schemaId === 'LAND_TITLE_V1') {
        setFormData({
          deedNumber: `DL-DEED-${Math.floor(100000 + Math.random() * 900000)}`,
          parcelId: 'SECTOR-12-DELHI-PLOT-88',
          propertyAddress: 'Plot 88, Central Commercial Complex, New Delhi 110001',
          ownerName: 'Priya Verma',
          ownerDID: recipientDID,
          areaSqMeters: 620.0,
          geoCoordinates: '28.6139 N, 77.2090 E',
          registeredAt: new Date().toISOString(),
        });
        setIsTransferable(true);
      }
    }
  }, [selectedSchemaId, recipientDID]);

  const handleFieldChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const recipientIdentity = identities.find(i => i.did.toLowerCase() === recipientDID.toLowerCase());
    const recipientAddr = recipientIdentity ? recipientIdentity.controller : '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';

    const params = {
      recipientAddress: recipientAddr,
      recipientDID,
      assetType: selectedSchema.schemaId.replace('_V1', ''),
      schemaId: selectedSchema.schemaId,
      credentialData: formData,
      isTransferable,
    };

    if (isAccountAbstraction) {
      setPendingIssueParams(params);
      setShowAAModal(true);
    } else {
      executeMint(params);
    }
  };

  const executeMint = async (params: any) => {
    const created = await issueAsset(params);
    setFeedback({
      type: 'success',
      text: `Successfully minted ${created.assetType} NFT #Token ${created.tokenId} bound to ${recipientDID}`,
    });
  };

  const handleRevoke = (tokenId: number) => {
    const success = revokeAsset(tokenId, revokeReason);
    if (success) {
      setFeedback({ type: 'success', text: `Token #${tokenId} has been permanently revoked on-chain.` });
      setRevokeTokenId(null);
    }
  };

  const handleInspect = (tokenId: number) => {
    const result = verifyAssetProof(tokenId);
    setInspectResult(result);
    setShowProofModal(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-950/40 via-indigo-950/30 to-[#0d1322] border border-amber-500/20 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Briefcase className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-white font-['Outfit']">
              Asset Manager & Credential Issuance Engine
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Issue cryptographically anchored ERC-721 digital asset NFTs bound to recipient DIDs with schema-compliant payloads and on-chain lifecycle governance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAccountAbstraction && (
            <span className="px-3 py-1.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-mono flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              Paymaster Gasless Mode Active
            </span>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-500 hover:text-white">✕</button>
        </div>
      )}

      {/* Issuance Form */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Mint & Issue Verifiable Digital Asset</h3>
          </div>

          {/* Schema Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-mono text-slate-400">Schema Template:</label>
            <select
              value={selectedSchemaId}
              onChange={e => setSelectedSchemaId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[#0b0f19] border border-white/10 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500"
            >
              {schemas.map(s => (
                <option key={s.schemaId} value={s.schemaId}>
                  {s.name} ({s.schemaId})
                </option>
              ))}
            </select>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          {/* Target Recipient & Transferability Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-black/30 border border-white/5">
            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold">Recipient Decentralized Identifier (DID):</label>
              <select
                value={recipientDID}
                onChange={e => setRecipientDID(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0d1322] border border-white/10 text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
              >
                {identities.map(i => (
                  <option key={i.did} value={i.did}>
                    {i.did} ({i.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-semibold">Transferability Policy:</label>
              <div className="flex items-center h-10 px-3 rounded-xl bg-[#0d1322] border border-white/10 gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="radio"
                    name="transferable"
                    checked={!isTransferable}
                    onChange={() => setIsTransferable(false)}
                    className="text-amber-500 focus:ring-amber-500"
                  />
                  <span>Soulbound (Non-Transferable)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="radio"
                    name="transferable"
                    checked={isTransferable}
                    onChange={() => setIsTransferable(true)}
                    className="text-cyan-500 focus:ring-cyan-500"
                  />
                  <span>Transferable Asset</span>
                </label>
              </div>
            </div>
          </div>

          {/* Dynamic Schema Fields */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs font-bold text-slate-300 uppercase tracking-wider">
              <span>Schema Fields ({selectedSchema.name}):</span>
              <span className="text-[11px] text-slate-500 font-mono">Schema URI: {selectedSchema.schemaUri}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedSchema.fields.map(field => (
                <div key={field.name} className="space-y-1.5">
                  <label className="text-slate-300 font-semibold flex items-center justify-between">
                    <span>{field.description || field.name}:</span>
                    {field.required && <span className="text-[10px] text-rose-400 font-mono">REQUIRED</span>}
                  </label>
                  {field.enum ? (
                    <select
                      value={formData[field.name] || field.enum[0]}
                      onChange={e => handleFieldChange(field.name, e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0b0f19] border border-white/10 text-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      {field.enum.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type === 'number' || field.type === 'integer' ? 'number' : 'text'}
                      value={formData[field.name] ?? ''}
                      onChange={e => handleFieldChange(field.name, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0b0f19] border border-white/10 text-slate-200 focus:outline-none focus:border-amber-500 font-mono text-xs"
                      required={field.required}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Canonical Hash Preview */}
          <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 font-sans">Deterministic Keccak-256 Hash to Anchor:</span>
            <span className="text-amber-400 font-bold">{computeCredentialHash(formData)}</span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:opacity-90 text-slate-900 font-bold text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-slate-900" />
            <span>Mint ERC-721 Asset NFT & Anchor Hash on Blockchain</span>
          </button>
        </form>
      </div>

      {/* Issued Assets Table & Revocation Management */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Issued Digital Assets & Credential NFTs</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">{assets.length} Total Assets Minted</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 font-sans uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">Token ID</th>
                <th className="py-3 px-3">Type / Schema</th>
                <th className="py-3 px-3">Recipient DID</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Transferable</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {assets.map(asset => (
                <tr key={asset.tokenId} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-3 text-cyan-300 font-bold">#{asset.tokenId}</td>
                  <td className="py-3 px-3 text-slate-200">
                    <div>{asset.assetType}</div>
                    <div className="text-[10px] text-slate-500">{asset.schemaId}</div>
                  </td>
                  <td className="py-3 px-3 text-slate-400">{truncateHash(asset.ownerDID, 16, 6)}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        asset.status === 'ACTIVE'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {asset.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-400 font-sans text-[11px]">
                    {asset.isTransferable ? (
                      <span className="text-cyan-400">Yes (Liquid)</span>
                    ) : (
                      <span className="text-amber-400 font-mono text-[10px]">Soulbound</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right space-x-2">
                    <button
                      onClick={() => handleInspect(asset.tokenId)}
                      className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 text-[10px] font-sans font-semibold transition-all"
                    >
                      Inspect Proof
                    </button>
                    {asset.status === 'ACTIVE' && (
                      <button
                        onClick={() => setRevokeTokenId(asset.tokenId)}
                        className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-400 text-[10px] font-sans font-semibold transition-all"
                      >
                        Revoke Asset
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revocation Prompt Modal */}
      {revokeTokenId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0f1422] border border-rose-500/40 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Revoke Digital Asset Token #{revokeTokenId}</h3>
            </div>
            <p className="text-xs text-slate-300">
              Revoking this asset will permanently flag its status as <span className="text-rose-400 font-bold">REVOKED</span> in the Solidity <code className="font-mono text-cyan-300">AssetRegistry.sol</code> smart contract.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-semibold">Reason for Revocation:</label>
              <input
                type="text"
                value={revokeReason}
                onChange={e => setRevokeReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => handleRevoke(revokeTokenId)}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all"
              >
                Confirm On-Chain Revocation
              </button>
              <button
                onClick={() => setRevokeTokenId(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 font-semibold text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AA Modal */}
      <AATransactionModal
        isOpen={showAAModal}
        onClose={() => setShowAAModal(false)}
        actionTitle={`Mint ${pendingIssueParams?.assetType} NFT`}
        targetContract="AssetRegistry.sol (0xCf7Ed3...)"
        did={activeAccount}
        onExecute={() => {
          if (pendingIssueParams) executeMint(pendingIssueParams);
        }}
      />

      {/* Proof Modal */}
      <ProofChainModal
        result={inspectResult}
        isOpen={showProofModal}
        onClose={() => setShowProofModal(false)}
      />
    </div>
  );
};
