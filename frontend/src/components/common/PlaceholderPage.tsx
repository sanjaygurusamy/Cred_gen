import React from 'react';
import { Card } from './Card';
import { Badge } from './Badge';
import { Calendar, CheckCircle2, Shield, AlertCircle } from 'lucide-react';

interface PlannedFeature {
  title: string;
  description: string;
}

interface PlaceholderPageProps {
  title: string;
  description: string;
  phaseNumber: number;
  phaseName: string;
  icon: React.ReactNode;
  features: PlannedFeature[];
  sampleActionName?: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  description,
  phaseNumber,
  phaseName,
  icon,
  features,
  sampleActionName = 'Add Entry',
}) => {
  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            {icon}
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
              <Badge variant="planned">
                Planned: Phase {phaseNumber}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center space-x-3 w-full sm:w-auto justify-end">
          <button
            disabled
            title={`Disabled: This action will be operational in Phase ${phaseNumber} (${phaseName})`}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed flex items-center space-x-2"
          >
            <span>{sampleActionName}</span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400">
              Phase {phaseNumber}
            </span>
          </button>
        </div>
      </div>

      {/* Scope and Roadmap Architecture */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card
          title="Planned Scope"
          subtitle={`Deliverables for Phase ${phaseNumber}`}
          className="md:col-span-2"
        >
          <div className="space-y-3.5 mt-2">
            {features.map((f, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start space-x-3"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-200">{f.title}</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Implementation Safeguard" subtitle="Phase boundary policy">
          <div className="space-y-4 mt-2">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                CampusCarbon AI strictly enforces a phased development process. No dummy mockups or fabricated data are generated in advance of backend model authorization.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Target Phase:</span>
                </span>
                <span className="font-semibold text-slate-200">Phase {phaseNumber}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center space-x-1.5">
                  <Shield className="w-3.5 h-3.5 text-slate-500" />
                  <span>Prerequisite:</span>
                </span>
                <span className="font-semibold text-emerald-400">Phase {phaseNumber - 1} Approved</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
