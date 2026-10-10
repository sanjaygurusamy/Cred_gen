import React from 'react';
import { Leaf, ShieldCheck } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Leaf className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
              <span>CampusCarbon AI</span>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                Phase 0
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Institutional Decarbonization & Deterministic MRV Engine
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5 text-xs text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Architecture Baseline Initialized</span>
          </div>
        </div>
      </div>
    </header>
  );
};
