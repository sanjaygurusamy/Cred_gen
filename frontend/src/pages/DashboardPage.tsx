import {
  Building,
  Server,
  RefreshCw,
  Zap,
  Droplet,
  Trash2,
  Layers,
  Flame,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { useSystemStatus } from '../context/SystemStatusContext';
import { PlannedMetric } from '../types';

export const DashboardPage: React.FC = () => {
  const {
    loading,
    isRefreshing,
    health,
    readiness,
    systemInfo,
    error,
    lastChecked,
    refetch,
  } = useSystemStatus();

  // Explicit, honest metric definitions for planned phases
  const plannedMetrics: PlannedMetric[] = [
    {
      id: 'emissions',
      title: 'Total Campus Emissions',
      category: 'GHG Scope 1, 2 & 3',
      plannedPhase: 'Phase 5',
      unit: 'tCO2e',
      description: 'Deterministic GHG Protocol calculation engine will compute institutional emissions from activity records.',
      availability: 'not_implemented',
    },
    {
      id: 'electricity',
      title: 'Electricity Consumption',
      category: 'Energy Telemetry',
      plannedPhase: 'Phase 4',
      unit: 'kWh',
      description: 'Sub-meter interval logging, connected load estimation, and actual variance comparisons.',
      availability: 'not_implemented',
    },
    {
      id: 'water',
      title: 'Water & Wastewater',
      category: 'Utility Telemetry',
      plannedPhase: 'Phase 3',
      unit: 'm³',
      description: 'Municipal intake volume, pumping VFD telemetry, and on-site treatment logs.',
      availability: 'no_data',
    },
    {
      id: 'waste',
      title: 'Organic Waste Diverted',
      category: 'Materials & Waste',
      plannedPhase: 'Phase 3',
      unit: 'kg',
      description: 'Cafeteria plate waste, landscaping organics, and aerobic composting records.',
      availability: 'no_data',
    },
    {
      id: 'blocks',
      title: 'Blocks Under Monitoring',
      category: 'Campus Inventory',
      plannedPhase: 'Phase 2',
      unit: 'facilities',
      description: 'Hierarchical campus inventory modeling academic halls, hostels, utility plants, and workshops.',
      availability: 'not_implemented',
    },
  ];

  return (
    <div className="space-y-8">
      {/* 1. Institutional Overview Banner */}
      <section className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Phase 1 Application Foundation</span>
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2">
                <span>GreenTech University Main Campus</span>
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  GTU-MAIN
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Silicon Valley, CA • 450,000 m² Campus Area • 14,500 Students • 1,200 Faculty & Staff
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            <button
              onClick={() => refetch()}
              disabled={isRefreshing}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Test Connection</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Live System Readiness Diagnostic Panel */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
            <Server className="w-4 h-4 text-emerald-400" />
            <span>Infrastructure Connectivity Diagnostics</span>
          </h3>
          {lastChecked && (
            <span className="text-[11px] text-slate-500">
              Last probe: {lastChecked.toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* FastAPI Backend Status Card */}
          <Card
            title="FastAPI Backend Service"
            subtitle="Application transport layer"
            icon={
              health ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400" />
              )
            }
          >
            <div className="space-y-3 mt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Process State:</span>
                <Badge variant={health ? 'success' : 'error'}>
                  {loading && !health ? 'Probing...' : health ? 'Healthy & Responding' : 'Offline / Unreachable'}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Endpoint Checked:</span>
                <span className="font-mono text-slate-300">/api/health</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Application Version:</span>
                <span className="font-mono text-slate-300">{health?.version || 'Unknown'}</span>
              </div>
              {error && (
                <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/40 text-rose-300 text-[11px] leading-relaxed">
                  {error}
                </div>
              )}
            </div>
          </Card>

          {/* PostgreSQL Database Status Card */}
          <Card
            title="PostgreSQL 16 Database"
            subtitle="Persistent relational storage"
            icon={
              readiness?.database.connected ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-400" />
              )
            }
          >
            <div className="space-y-3 mt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Database Connection:</span>
                <Badge variant={readiness?.database.connected ? 'success' : 'warning'}>
                  {loading && !readiness
                    ? 'Probing...'
                    : readiness?.database.connected
                    ? 'Connected (Ping 200)'
                    : 'Unavailable (503)'}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Engine / Protocol:</span>
                <span className="font-mono text-slate-300">
                  {readiness?.database.engine || systemInfo?.database_engine || 'postgresql+psycopg'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Readiness Probe:</span>
                <span className="font-mono text-slate-300">/api/ready</span>
              </div>
              {readiness && !readiness.database.connected && (
                <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-amber-300 text-[11px] leading-relaxed">
                  <p className="font-semibold">Database ping offline:</p>
                  <p className="mt-0.5">{readiness.database.message}</p>
                  <p className="mt-1 text-[10px] text-amber-400/80 font-mono">
                    Development action: Start PostgreSQL via Docker Compose (`docker compose up -d postgres`) or configure DATABASE_URL in .env
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </section>

      {/* 3. Honest Metrics Preview Section (Clearly Labeled by Phase) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Campus Sustainability Indicators</span>
            </h3>
            <p className="text-xs text-slate-400">
              Planned telemetry parameters and emission scopes to be populated in upcoming phases.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-slate-500">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Honest accounting: No simulated figures displayed</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {plannedMetrics.map((metric) => {
            const isEmissions = metric.id === 'emissions';
            const isElectricity = metric.id === 'electricity';
            const isWater = metric.id === 'water';
            const isWaste = metric.id === 'waste';

            return (
              <div
                key={metric.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4 relative overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                      {metric.category}
                    </span>
                    <h4 className="text-sm font-bold text-white tracking-tight">
                      {metric.title}
                    </h4>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-800 text-slate-400">
                    {isEmissions ? (
                      <Flame className="w-4 h-4 text-emerald-400" />
                    ) : isElectricity ? (
                      <Zap className="w-4 h-4 text-amber-400" />
                    ) : isWater ? (
                      <Droplet className="w-4 h-4 text-sky-400" />
                    ) : isWaste ? (
                      <Trash2 className="w-4 h-4 text-teal-400" />
                    ) : (
                      <Building className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Honest Zero State Indicator */}
                <div className="py-2 px-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-bold font-mono text-slate-500">
                      —
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {metric.unit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Current Status:</span>
                    <Badge variant={metric.availability === 'no_data' ? 'neutral' : 'planned'}>
                      {metric.availability === 'no_data' ? 'No Records Logged' : 'Engine Planned'}
                    </Badge>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3 flex items-center justify-between">
                  <span>Activation: {metric.plannedPhase}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Thoughtful Empty State Banner */}
      <section>
        <EmptyState
          title="No campus activity data has been recorded yet"
          description="CampusCarbon AI adheres strictly to audit-grade accounting. No artificial telemetry is displayed prior to physical meter registration and activity logging."
          plannedPhase="Phase 2 & Phase 3"
          actionText="Review Architecture Specifications"
          onAction={() => window.open('https://github.com', '_blank')}
        />
      </section>

      {/* 5. Phased Implementation Roadmap Tracker */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-white tracking-tight">
              Phased Implementation Trajectory
            </h3>
            <p className="text-xs text-slate-400">
              Controlled roadmap ensuring end-to-end verification before advancing.
            </p>
          </div>
          <Badge variant="success">Phase 1 Active</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
          <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">Phase 0</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">Done</span>
            </div>
            <h5 className="text-xs font-bold text-white">Clean Restart</h5>
            <p className="text-[10px] text-slate-400">Modular monolith reset, legacy isolation, Git checkpoint.</p>
          </div>

          <div className="p-3.5 rounded-xl bg-sky-950/30 border border-sky-500/30 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-sky-400 font-bold uppercase">Phase 1</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-semibold">Current</span>
            </div>
            <h5 className="text-xs font-bold text-white">Application Foundation</h5>
            <p className="text-[10px] text-slate-400">FastAPI, PostgreSQL readiness, React TS, layout shell.</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-500 font-bold uppercase">Phase 2</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold">Next</span>
            </div>
            <h5 className="text-xs font-bold text-slate-300">Campus Hierarchy</h5>
            <p className="text-[10px] text-slate-500">GreenTech Univ blocks, academic halls, and element inventory.</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-500 font-bold uppercase">Phase 3-10</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold">Upcoming</span>
            </div>
            <h5 className="text-xs font-bold text-slate-300">Telemetry & MRV</h5>
            <p className="text-[10px] text-slate-500">Energy logs, DEFRA factor math, SDG indicators, Fabric ledger.</p>
          </div>
        </div>
      </section>
    </div>
  );
};
