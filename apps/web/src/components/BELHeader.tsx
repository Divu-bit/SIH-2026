import React, { useState } from 'react';
import { Search, Globe, Eye, Volume2, Shield } from 'lucide-react';

export const BELHeader: React.FC = () => {
  const [lang, setLang] = useState<'EN' | 'HI'>('EN');

  return (
    <div className="w-full bg-white text-slate-800 border-b border-slate-200">
      {/* Top Gov Bar */}
      <div className="bg-[#002244] text-slate-200 text-[11px] font-sans px-4 py-1.5 flex flex-wrap items-center justify-between border-b border-blue-900/50">
        <div className="flex items-center gap-4">
          <a href="#main-content" className="hover:text-cyan-300 transition-colors">
            {lang === 'HI' ? 'मुख्य सामग्री पर जाएं' : 'Skip to main content'}
          </a>
          <span className="text-slate-500">|</span>
          <span className="flex items-center gap-1 text-slate-300">
            <Volume2 className="w-3 h-3 text-cyan-400" />
            {lang === 'HI' ? 'स्क्रीन रीडर एक्सेस' : 'Access Screen Reader'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder={lang === 'HI' ? 'खोजें...' : 'Search Defense Registry...'}
              className="bg-white/10 hover:bg-white/15 focus:bg-white text-slate-100 focus:text-slate-900 text-xs px-2.5 py-0.5 pr-6 rounded border border-white/20 focus:outline-none transition-all placeholder-slate-400 w-36 sm:w-48"
            />
            <Search className="w-3 h-3 text-slate-400 absolute right-2 pointer-events-none" />
          </div>

          {/* Language Switcher */}
          <button
            onClick={() => setLang(lang === 'EN' ? 'HI' : 'EN')}
            className="px-2 py-0.5 bg-blue-700 hover:bg-blue-600 rounded text-xs font-semibold text-white transition-all flex items-center gap-1"
          >
            <Globe className="w-3 h-3" />
            <span>{lang === 'EN' ? 'हिंदी' : 'English'}</span>
          </button>

          {/* Accessibility Icon */}
          <div className="p-1 rounded bg-blue-800 text-white cursor-pointer" title="Accessibility Options">
            <Eye className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Main BEL Branding Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Left: BEL Logo & Emblem */}
        <div className="flex items-center gap-3">
          {/* BEL Blue Wings Icon */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5">
              <div className="w-10 h-7 flex flex-col justify-between">
                <div className="h-1.5 bg-[#0072CE] rounded-r-full w-full"></div>
                <div className="h-1.5 bg-[#0072CE] rounded-r-full w-3/4"></div>
                <div className="h-1.5 bg-[#0072CE] rounded-r-full w-full"></div>
              </div>
              <div className="text-left leading-none">
                <div className="text-[#0072CE] font-bold text-sm tracking-wide">भारत इलेक्ट्रॉनिक्स</div>
                <div className="text-[#002244] font-black text-xs tracking-wider">BHARAT ELECTRONICS</div>
              </div>
            </div>
            <div className="text-[8px] font-semibold tracking-widest text-slate-500 italic mt-0.5">
              QUALITY, TECHNOLOGY, INNOVATION
            </div>
          </div>
        </div>

        {/* Center: Official Title */}
        <div className="text-center md:text-left flex-1 md:pl-6 border-l-0 md:border-l border-slate-200">
          <h1 className="text-lg sm:text-2xl font-black text-[#002244] tracking-tight font-['Outfit'] uppercase">
            Bharat Electronics Limited
          </h1>
          <div className="text-xs font-bold text-slate-700">
            Government of India, Ministry of Defence, A Navratna Company
          </div>
          <div className="text-[10px] font-mono text-slate-500">
            CIN: L32309KA1954GOI000787 • SIH 2026 Decentralized Defense Trust Platform
          </div>
        </div>

        {/* Right: National Emblem of India */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="text-right">
            <div className="text-[11px] font-bold text-[#002244]">रक्षा मंत्रालय</div>
            <div className="text-[10px] text-slate-600 font-semibold uppercase">Ministry of Defence</div>
          </div>
          <div className="w-12 h-14 flex items-center justify-center p-1 bg-amber-50 rounded border border-amber-200">
            {/* Ashoka Emblem representation */}
            <svg viewBox="0 0 100 120" className="w-10 h-12 text-[#996515] fill-current">
              <path d="M50 5 C40 5 35 15 35 25 C35 35 45 45 50 45 C55 45 65 35 65 25 C65 15 60 5 50 5 Z" />
              <path d="M30 48 L70 48 L65 75 L35 75 Z" />
              <circle cx="50" cy="85" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
              <rect x="25" y="98" width="50" height="6" rx="2" />
              <text x="50" y="115" fontSize="9" textAnchor="middle" fontWeight="bold">सत्यमेव जयते</text>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
