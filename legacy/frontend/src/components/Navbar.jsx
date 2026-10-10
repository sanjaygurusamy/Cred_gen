import React from 'react';
import { Leaf, Shield, Cpu, RefreshCw, University, UserCheck, Calculator, Building2 } from 'lucide-react';

export default function Navbar({
  campuses,
  selectedCampus,
  onSelectCampus,
  role,
  onRoleChange,
  health,
  onRefresh,
  activeTab,
  onTabChange
}) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand & Title */}
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-950/40">
            <Leaf className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                CampusCarbon
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                AI Engine
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Deterministic Decarbonization & SDG Intelligence</p>
          </div>
        </div>

        {/* Component Switcher Tabs */}
        <div className="hidden md:flex items-center p-1 bg-slate-800/90 border border-slate-700/80 rounded-xl space-x-1">
          <button
            onClick={() => onTabChange('calculator')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition ${
              activeTab === 'calculator'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>General Calculator</span>
            <span className="px-1 py-0.2 text-[9px] font-black uppercase rounded bg-white/20">C1</span>
          </button>

          <button
            onClick={() => onTabChange('campus')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition ${
              activeTab === 'campus'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Campus-Wide System</span>
            <span className="px-1 py-0.2 text-[9px] font-black uppercase rounded bg-white/20">C2</span>
          </button>
        </div>

        {/* Controls: Campus, Role, System Status */}
        <div className="flex items-center space-x-3">
          
          {/* Campus Selector (Active in Campus-wide mode) */}
          <div className="flex items-center space-x-1.5 bg-slate-800/80 border border-slate-700/70 rounded-lg px-2.5 py-1.5 text-xs">
            <University className="w-3.5 h-3.5 text-emerald-400" />

            <select
              value={selectedCampus}
              onChange={(e) => onSelectCampus(e.target.value)}
              className="bg-transparent text-slate-200 text-xs font-medium focus:outline-none cursor-pointer"
            >
              {campuses.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-800 text-slate-200">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Role Switcher (RBAC Simulation) */}
          <div className="flex items-center space-x-1.5 bg-slate-800/80 border border-slate-700/70 rounded-lg px-2.5 py-1.5 text-xs">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400 hidden sm:inline">Role:</span>
            <select
              value={role}
              onChange={(e) => onRoleChange(e.target.value)}
              className="bg-transparent text-slate-200 text-xs font-medium focus:outline-none cursor-pointer capitalize"
            >
              <option value="admin" className="bg-slate-800 text-slate-200">Admin (Full Control)</option>
              <option value="facility_manager" className="bg-slate-800 text-slate-200">Facility Manager</option>
              <option value="viewer" className="bg-slate-800 text-slate-200">Viewer (Read-Only)</option>
            </select>
          </div>

          {/* Engine Status Badge */}
          <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs bg-slate-800/50 border-slate-700/50 text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-teal-400" />
            <span>Mode:</span>
            <span className={`font-semibold ${health?.llm_configured ? 'text-emerald-400' : 'text-blue-400'}`}>
              {health?.llm_configured ? 'Hybrid LLM + Rules' : 'Deterministic Rules'}
            </span>
          </div>

          {/* Refresh Action */}
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Refresh recommendations & telemetry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
}
