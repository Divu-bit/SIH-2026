import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, Shield, Award, CheckCircle, Radar } from 'lucide-react';

export const DefenseHeroBanner: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(true);

  return (
    <div className="relative w-full overflow-hidden rounded-b-none border-b border-slate-700 shadow-2xl bg-[#0b1320]">
      {/* Background Graphic: Military Camo / Soldier Silhouette & Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#090e17] via-[#111e33] to-[#070b12] opacity-95"></div>

      {/* Decorative Radar Sweep Grid in Background */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]"></div>

      {/* Content Container */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 flex flex-col md:flex-row items-center justify-between gap-8">
        {/* Left Visual: BEL Wooden Blocks Motif */}
        <div className="hidden lg:flex flex-col items-center">
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md shadow-2xl space-y-2">
            <div className="flex gap-2">
              <span className="w-12 h-12 bg-amber-100 rounded-lg text-slate-900 font-extrabold text-2xl flex items-center justify-center shadow-md border-b-4 border-amber-300">B</span>
              <span className="w-12 h-12 bg-amber-100 rounded-lg text-slate-900 font-extrabold text-2xl flex items-center justify-center shadow-md border-b-4 border-amber-300">E</span>
              <span className="w-12 h-12 bg-amber-100 rounded-lg text-slate-900 font-extrabold text-2xl flex items-center justify-center shadow-md border-b-4 border-amber-300">L</span>
            </div>
            <div className="flex gap-1.5 pt-1">
              <span className="w-8 h-8 bg-amber-50 rounded text-slate-900 font-bold text-sm flex items-center justify-center shadow">D</span>
              <span className="w-8 h-8 bg-amber-50 rounded text-slate-900 font-bold text-sm flex items-center justify-center shadow">E</span>
              <span className="w-8 h-8 bg-amber-50 rounded text-slate-900 font-bold text-sm flex items-center justify-center shadow">F</span>
              <span className="w-8 h-8 bg-amber-50 rounded text-slate-900 font-bold text-sm flex items-center justify-center shadow">E</span>
              <span className="w-8 h-8 bg-amber-50 rounded text-slate-900 font-bold text-sm flex items-center justify-center shadow">N</span>
              <span className="w-8 h-8 bg-amber-50 rounded text-slate-900 font-bold text-sm flex items-center justify-center shadow">C</span>
              <span className="w-8 h-8 bg-amber-50 rounded text-slate-900 font-bold text-sm flex items-center justify-center shadow">E</span>
            </div>
            <div className="text-[10px] text-center font-mono text-cyan-300 pt-1">
              • Blockchain Anchored •
            </div>
          </div>
        </div>

        {/* Center Main Slogan & Strategic Domains */}
        <div className="flex-1 space-y-4 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono">
            <Radar className="w-3.5 h-3.5 animate-spin" />
            <span>SIH26125 • Defense Decentralized Asset & Identity Framework</span>
          </div>

          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white uppercase tracking-tight leading-none font-['Outfit']">
            THE NATION'S SECURITY <br />
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200 bg-clip-text text-transparent">
              IS ALL THAT MATTERS IN THE END.
            </span>
          </h2>

          <p className="text-xs sm:text-sm font-semibold text-slate-300 leading-relaxed max-w-3xl">
            Military Communications • Radars • Naval Systems • C4I Systems • Missile Systems • Electronic Warfare Avionics • Opto Electronics • Tank Electronics • Weapon Systems & Gun Upgrades • Electronic Fuzes • Homeland Security & Smart Cities
          </p>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-500/30">
              <CheckCircle className="w-4 h-4" />
              <span>100% Tamper-Proof On-Chain Asset Verification</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-cyan-400 bg-cyan-950/40 px-3 py-1.5 rounded-lg border border-cyan-500/30">
              <Shield className="w-4 h-4" />
              <span>W3C Decentralized Identifiers (DIDs)</span>
            </div>
          </div>
        </div>

        {/* Right: BEL Floating Badge */}
        <div className="hidden md:flex flex-col items-center justify-center p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
          <div className="w-12 h-9 flex flex-col justify-between mb-2">
            <div className="h-2 bg-[#0072CE] rounded-r-full w-full"></div>
            <div className="h-2 bg-[#0072CE] rounded-r-full w-3/4"></div>
            <div className="h-2 bg-[#0072CE] rounded-r-full w-full"></div>
          </div>
          <div className="text-center font-bold text-xs text-white">भारत इलेक्ट्रॉनिक्स</div>
          <div className="text-[10px] text-slate-400 font-mono">BHARAT ELECTRONICS</div>
          <div className="text-[8px] text-cyan-400 uppercase tracking-widest mt-1">
            QUALITY, TECHNOLOGY, INNOVATION
          </div>
        </div>
      </div>

      {/* Carousel Navigation Bottom Controls */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 hidden md:block">
        <button className="p-2 rounded-full bg-black/40 hover:bg-black/70 text-white border border-white/10 transition-all">
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden md:block">
        <button className="p-2 rounded-full bg-black/40 hover:bg-black/70 text-white border border-white/10 transition-all">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="absolute right-6 bottom-4 flex items-center gap-2 z-10">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-1.5 rounded-lg bg-black/50 hover:bg-black/80 text-white border border-white/20 transition-all"
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};
