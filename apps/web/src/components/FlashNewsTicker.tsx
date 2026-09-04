import React from 'react';
import { Radio, ShieldCheck } from 'lucide-react';
import { useStore } from '../services/store';

export const FlashNewsTicker: React.FC = () => {
  const { auditLogs, assets } = useStore();

  const newsItems = [
    "BEL receives orders worth Rs. 847 Crore for Advanced Tactical C4I & Software Defined Radios.",
    "Decentralized Defense Asset Registry anchors 100% of Military Radar serials on-chain.",
    "Smart India Hackathon 2026: SIH26125 TrustChain deployed with ERC-4337 Account Abstraction.",
    "Ministry of Defence initiates zero-auth public QR verification for defense supplier hardware.",
    ...auditLogs.slice(0, 3).map(l => `[EVM Block #${l.blockNumber}] Action ${l.eventType} logged by ${l.actor.slice(0, 10)}... (Tx: ${l.txHash.slice(0, 14)}...)`),
  ];

  return (
    <div className="w-full bg-[#004b87] text-white flex items-center overflow-hidden border-b border-blue-900/60 shadow-inner">
      {/* Flash News Pill */}
      <div className="bg-[#0072ce] px-5 py-2 flex items-center gap-2 font-bold text-xs shrink-0 rounded-r-full shadow-md z-10 font-['Outfit'] tracking-wide">
        <Radio className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
        <span>Flash News</span>
      </div>

      {/* Scrolling Text Stream */}
      <div className="flex-1 overflow-hidden py-1.5 font-sans text-xs">
        <div className="whitespace-nowrap animate-marquee flex items-center gap-8 text-slate-100">
          {newsItems.map((item, idx) => (
            <span key={idx} className="inline-flex items-center gap-2">
              <span className="text-amber-300 font-bold">•</span>
              <span>{item}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
