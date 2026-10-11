import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Activity,
  Calculator,
  Target,
  FileText,
  ShieldCheck,
  BarChart3,
  Settings,
  Leaf,
  X,
  Zap,
  Trees,
  Globe2,
} from 'lucide-react';
import { useSystemStatus } from '../../context/SystemStatusContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { connectionState } = useSystemStatus();

  const navigationItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Campus & Blocks', path: '/campus', icon: Building2, phaseTag: 'P2' },
    { label: 'Activity Data', path: '/activity', icon: Activity, phaseTag: 'P3' },
    { label: 'Electricity & Baselines', path: '/electricity', icon: Zap, phaseTag: 'P4' },
    { label: 'Carbon Calculator', path: '/calculator', icon: Calculator, phaseTag: 'P5' },
    { label: 'Trees & Plantation', path: '/trees', icon: Trees, phaseTag: 'Eco' },
    { label: 'Sustainability & SDGs', path: '/sustainability', icon: Globe2, phaseTag: 'SDG' },
    { label: 'Reports', path: '/reports', icon: BarChart3, phaseTag: 'P6' },
    { label: 'MRV Projects', path: '/mrv', icon: Target, phaseTag: 'P7' },
    { label: 'Evidence & Documents', path: '/evidence', icon: FileText, phaseTag: 'P7' },
    { label: 'Verification', path: '/verification', icon: ShieldCheck, phaseTag: 'P7' },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Leaf className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-white tracking-tight block">
                CampusCarbon AI
              </span>
              <span className="text-[10px] text-emerald-400/90 font-medium tracking-wide uppercase">
                Digital MRV Platform
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Main Navigation">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={() => onClose()}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center space-x-3">
                      <Icon
                        className={`w-4 h-4 ${
                          isActive ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.phaseTag && !isActive && (
                      <span className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700/50">
                        {item.phaseTag}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom System Status Badge */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    connectionState === 'connected'
                      ? 'bg-emerald-400'
                      : connectionState === 'degraded'
                      ? 'bg-amber-400'
                      : connectionState === 'loading'
                      ? 'bg-sky-400'
                      : 'bg-rose-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    connectionState === 'connected'
                      ? 'bg-emerald-500'
                      : connectionState === 'degraded'
                      ? 'bg-amber-500'
                      : connectionState === 'loading'
                      ? 'bg-sky-500'
                      : 'bg-rose-500'
                  }`}
                />
              </span>
              <div className="text-[11px] leading-tight">
                <p className="font-semibold text-slate-200">
                  {connectionState === 'connected'
                    ? 'Engine Connected'
                    : connectionState === 'degraded'
                    ? 'DB Offline'
                    : connectionState === 'loading'
                    ? 'Connecting...'
                    : 'API Disconnected'}
                </p>
                <p className="text-[10px] text-slate-400">Phase 1 Foundation</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
