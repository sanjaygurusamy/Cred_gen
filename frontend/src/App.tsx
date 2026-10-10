import React from 'react';
import { Navbar } from './components/layout/Navbar';
import { Card } from './components/common/Card';
import { Layers, Database, Cpu, CheckCircle2, Terminal } from 'lucide-react';

export const App: React.FC = () => {
  const phases = [
    { num: '0', title: 'Clean Architecture & Project Reset', status: 'Completed', current: true },
    { num: '1', title: 'Application Foundation & PostgreSQL Setup', status: 'Next Phase' },
    { num: '2', title: 'Campus Hierarchy & Block Inventory', status: 'Planned' },
    { num: '3', title: 'Activity Definitions & Daily Logs', status: 'Planned' },
    { num: '4', title: 'Electricity Estimation & Comparison', status: 'Planned' },
    { num: '5', title: 'Deterministic Carbon Calculations & Factors', status: 'Planned' },
    { num: '6', title: 'Dashboard & Reporting Engine', status: 'Planned' },
    { num: '7', title: 'Evidence Management & Digital MRV', status: 'Planned' },
    { num: '8', title: 'AI/ML Recommendations & Simulator', status: 'Planned' },
    { num: '9', title: 'Hyperledger Fabric Integration', status: 'Planned' },
    { num: '10', title: 'Testing, Security & Production Deployment', status: 'Planned' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <section className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-900/40 rounded-3xl p-8 shadow-2xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Phase 0 Architecture Complete</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Clean Modular Monolith Restart
          </h2>
          <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
            CampusCarbon AI has been cleanly reset. Legacy implementations have been safely isolated into dedicated reference archives without data loss. The target stack (React + TypeScript + Vite + Tailwind CSS + FastAPI + PostgreSQL + Alembic) is primed for Phase 1.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card
            title="Clean Layered Architecture"
            subtitle="Separation of concerns"
            icon={<Layers className="w-5 h-5 text-emerald-400" />}
          >
            <p className="text-xs text-slate-300 leading-relaxed">
              Presentation, API transport, business services, and data access layers are explicitly decoupled. Monolithic files and untyped JavaScript have been eliminated.
            </p>
          </Card>

          <Card
            title="Deterministic Source of Truth"
            subtitle="GHG Protocol standard"
            icon={<Cpu className="w-5 h-5 text-emerald-400" />}
          >
            <p className="text-xs text-slate-300 leading-relaxed">
              Mathematical carbon formulas and audited emission factors govern all calculations. AI/LLM modules serve solely as qualitative advisory layers.
            </p>
          </Card>

          <Card
            title="PostgreSQL & Alembic"
            subtitle="Production data integrity"
            icon={<Database className="w-5 h-5 text-emerald-400" />}
          >
            <p className="text-xs text-slate-300 leading-relaxed">
              Target database upgraded from transient SQLite to PostgreSQL 16 with version-controlled Alembic migrations and Docker Compose orchestration.
            </p>
          </Card>
        </div>

        <section className="space-y-4">
          <div className="flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-white tracking-tight">
              Phased Implementation Roadmap
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {phases.map((p) => (
              <div
                key={p.num}
                className={`p-4 rounded-xl border transition-all ${
                  p.current
                    ? 'bg-emerald-950/20 border-emerald-500/50 shadow-lg'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    Phase {p.num}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                      p.current
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : p.status === 'Next Phase'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-white tracking-tight">{p.title}</h4>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800 bg-slate-900/60 py-6 text-center text-xs text-slate-500">
        <p>CampusCarbon AI — Phase 0 Architecture Clean Baseline</p>
      </footer>
    </div>
  );
};
