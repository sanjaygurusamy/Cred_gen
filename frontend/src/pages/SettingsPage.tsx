import React from 'react';
import { Settings, Server, Database, Shield, Terminal, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { useSystemStatus } from '../context/SystemStatusContext';
import { apiClient } from '../api/client';

export const SettingsPage: React.FC = () => {
  const { health, readiness, systemInfo, isRefreshing, refetch } = useSystemStatus();

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex items-start space-x-4 shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
          <Settings className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <h2 className="text-2xl font-bold text-white tracking-tight">System Settings & Architecture</h2>
            <Badge variant="info">Configuration Diagnostics</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Inspect active runtime parameters, configured database connectivity, and backend API endpoints.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* API Transport Diagnostics */}
        <Card
          title="Backend Transport Endpoint"
          subtitle="Client-to-server connection"
          icon={<Server className="w-5 h-5 text-emerald-400" />}
        >
          <div className="space-y-3.5 mt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Target Base URL:</span>
              <span className="font-mono text-emerald-400 font-semibold">{apiClient.getBaseUrl()}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">API Health Probe:</span>
              <span className="font-mono text-slate-300">GET /api/health</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Readiness Probe:</span>
              <span className="font-mono text-slate-300">GET /api/ready</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Application Name:</span>
              <span className="text-slate-200">{health?.app || 'CampusCarbon AI'}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Engine Version:</span>
              <span className="font-mono text-slate-200">{health?.version || '2.0.0'}</span>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => refetch()}
                disabled={isRefreshing}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
                <span>Re-probe API</span>
              </button>
            </div>
          </div>
        </Card>

        {/* Database Configuration */}
        <Card
          title="Database Infrastructure"
          subtitle="PostgreSQL 16 connection state"
          icon={<Database className="w-5 h-5 text-emerald-400" />}
        >
          <div className="space-y-3.5 mt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Database Engine:</span>
              <span className="font-mono text-slate-200">
                {readiness?.database.engine || systemInfo?.database_engine || 'postgresql'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Connectivity State:</span>
              <Badge variant={readiness?.database.connected ? 'success' : 'warning'}>
                {readiness?.database.connected ? 'Ready & Connected' : 'Service Unavailable'}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Migration Tool:</span>
              <span className="text-slate-200">Alembic (declarative migrations)</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5 text-xs">
              <span className="text-[11px] font-semibold text-slate-400 block flex items-center space-x-1.5">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>Startup Command (Docker Compose):</span>
              </span>
              <code className="block bg-slate-900 p-2 rounded-lg text-emerald-300 font-mono text-[11px] select-all">
                docker compose up -d postgres
              </code>
            </div>
          </div>
        </Card>
      </div>

      {/* Feature Matrix */}
      <Card
        title="Phase 1 Application Foundation Feature Matrix"
        subtitle="Verification checklist"
        icon={<Shield className="w-5 h-5 text-emerald-400" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Active & Verified Capabilities</h4>
            <ul className="space-y-1.5">
              {(systemInfo?.features_active || [
                'System Health Probes (/api/health)',
                'Authenticated Readiness Check (/api/ready)',
                'Typed REST Contracts (Pydantic v2 & TypeScript)',
                'Centralized Error & Network Handling',
                'Responsive Sidebar Shell with Navigation',
                'Phase 1 Foundation Dashboard with Honest States'
              ]).map((feat, idx) => (
                <li key={idx} className="flex items-center space-x-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Upcoming Phase Deliverables</h4>
            <ul className="space-y-1.5">
              {(systemInfo?.features_planned || [
                'Phase 2: Campus Hierarchy & Block Inventory',
                'Phase 3: Activity Definitions & Daily Records',
                'Phase 4: Electricity Estimation & Comparison',
                'Phase 5: Deterministic Carbon Calculation Engine',
                'Phase 6: Multi-Campus Dashboard & SDG Analytics',
                'Phase 7: Evidence Management & Digital MRV'
              ]).slice(0, 6).map((feat, idx) => (
                <li key={idx} className="flex items-center space-x-2 text-xs text-slate-400">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500/70 shrink-0" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};
