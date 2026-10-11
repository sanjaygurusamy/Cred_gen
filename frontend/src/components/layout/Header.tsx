import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, RefreshCw, Server, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useSystemStatus } from '../../context/SystemStatusContext';

interface HeaderProps {
  onOpenSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSidebar }) => {
  const location = useLocation();
  const { connectionState, isRefreshing, refetch, health, readiness } = useSystemStatus();

  // Route title mapping
  const routeMeta: Record<string, { title: string; subtitle: string }> = {
    '/': {
      title: 'Institutional Sustainability Dashboard',
      subtitle: 'System readiness telemetry and campus decarbonization status',
    },
    '/dashboard': {
      title: 'Institutional Sustainability Dashboard',
      subtitle: 'System readiness telemetry and campus decarbonization status',
    },
    '/campus': {
      title: 'Campus & Blocks Management',
      subtitle: 'Facility hierarchy, floor area inventory, and zone allocation',
    },
    '/activity': {
      title: 'Daily Activity Telemetry',
      subtitle: 'Operational energy, water, waste, and transport logs',
    },
    '/electricity': {
      title: 'Electricity Baselines & MRV Telemetry',
      subtitle: 'Database-backed baseline profiles, daily estimation, and variance tracking',
    },
    '/calculator': {
      title: 'GHG Protocol Carbon Calculator',
      subtitle: 'Deterministic emission calculations with approved factors',
    },
    '/mrv': {
      title: 'Digital MRV Reduction Projects',
      subtitle: 'Intervention pipelines and outcome verification records',
    },
    '/evidence': {
      title: 'Evidence & Audit Documents',
      subtitle: 'Supporting meter readings, utility receipts, and certificates',
    },
    '/verification': {
      title: 'Audit & Independent Verification',
      subtitle: 'Third-party certification and tamper-evident milestones',
    },
    '/reports': {
      title: 'Sustainability & SDG Reports',
      subtitle: 'Institutional greenhouse gas inventory and compliance metrics',
    },
    '/settings': {
      title: 'System Settings & Architecture',
      subtitle: 'Environment parameters, database drivers, and service diagnostics',
    },
  };

  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
  const currentMeta = routeMeta[normalizedPath] || routeMeta[location.pathname] || {
    title: 'Page Not Found',
    subtitle: 'The requested route does not exist in this application',
  };

  return (
    <header className="h-20 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
      {/* Mobile Menu & Page Title */}
      <div className="flex items-center space-x-3.5">
        <button
          onClick={onOpenSidebar}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
            {currentMeta.title}
          </h1>
          <p className="text-xs text-slate-400 hidden sm:block">
            {currentMeta.subtitle}
          </p>
        </div>
      </div>

      {/* Header Status & Action Area */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Genuine Connection Status Indicator */}
        <div
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
            connectionState === 'connected'
              ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-300'
              : connectionState === 'degraded'
              ? 'bg-amber-950/50 border-amber-500/30 text-amber-300'
              : connectionState === 'loading'
              ? 'bg-sky-950/50 border-sky-500/30 text-sky-300'
              : 'bg-rose-950/50 border-rose-500/30 text-rose-300'
          }`}
          title={
            connectionState === 'connected'
              ? `Backend (${health?.version}) & Database connected`
              : connectionState === 'degraded'
              ? `Backend connected, but ${readiness?.database.message || 'Database unavailable'}`
              : 'Backend API is currently offline'
          }
        >
          {connectionState === 'connected' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : connectionState === 'degraded' ? (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          ) : connectionState === 'loading' ? (
            <Server className="w-4 h-4 text-sky-400 animate-pulse shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}

          <div className="flex flex-col text-left">
            <span className="leading-none text-[11px]">
              {connectionState === 'connected'
                ? 'API & DB Ready'
                : connectionState === 'degraded'
                ? 'API Up • DB Offline'
                : connectionState === 'loading'
                ? 'Probing API...'
                : 'API Offline'}
            </span>
          </div>
        </div>

        {/* Manual Refresh / Retry Button */}
        <button
          onClick={() => refetch()}
          disabled={isRefreshing}
          className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700 flex items-center space-x-1.5 transition-colors disabled:opacity-50"
          title="Manually ping backend /api/health and /api/ready endpoints"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          <span className="hidden sm:inline">Probe Status</span>
        </button>

        {/* Current Environment Badge */}
        <div className="hidden md:flex items-center px-2.5 py-1 rounded-lg bg-slate-800 text-[11px] font-mono text-slate-400 border border-slate-700/60">
          <span>{health?.environment || 'development'}</span>
        </div>
      </div>
    </header>
  );
};
