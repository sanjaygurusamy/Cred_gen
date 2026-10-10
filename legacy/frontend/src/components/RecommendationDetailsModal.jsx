import React from 'react';
import { 
  X, CheckCircle, AlertTriangle, Info, PlayCircle,
  TrendingDown, Globe, BookOpen, Layers
} from 'lucide-react';

export default function RecommendationDetailsModal({
  recommendation,
  onClose,
  onSimulate,
  onApprove,
  onReject,
  userRole
}) {
  if (!recommendation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col justify-between">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between">
          <div className="space-y-1 pr-4">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {recommendation.category}
              </span>
              <span className="text-xs text-slate-400">
                Target: <strong className="text-white">{recommendation.element_name}</strong> ({recommendation.campus_body_name})
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {recommendation.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 text-sm">
          
          {/* Problem & Proposed Action */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800/60 border border-rose-950/40 rounded-xl p-4 space-y-1">
              <div className="flex items-center space-x-1.5 text-rose-400 font-semibold text-xs uppercase tracking-wide">
                <AlertTriangle className="w-4 h-4" />
                <span>Identified Inefficiency / Opportunity</span>
              </div>
              <p className="text-slate-200 text-xs leading-relaxed">
                {recommendation.problem}
              </p>
            </div>

            <div className="bg-slate-800/60 border border-emerald-950/40 rounded-xl p-4 space-y-1">
              <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold text-xs uppercase tracking-wide">
                <CheckCircle className="w-4 h-4" />
                <span>Proposed Intervention</span>
              </div>
              <p className="text-slate-200 text-xs leading-relaxed">
                {recommendation.proposed_action}
              </p>
            </div>
          </div>

          {/* Reasoning Based on Telemetry Data */}
          <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/60 space-y-1.5">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center space-x-1.5">
              <Info className="w-3.5 h-3.5 text-teal-400" />
              <span>Scientific & Telemetry Reasoning</span>
            </h4>
            <p className="text-slate-300 text-xs leading-relaxed">
              {recommendation.reasoning}
            </p>
          </div>

          {/* Environmental & Operational Benefits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-800/40 rounded-xl p-3.5 border border-slate-700/50 space-y-1">
              <span className="text-[11px] font-bold text-emerald-400 uppercase">Environmental Impact</span>
              <p className="text-xs text-slate-300">{recommendation.expected_environmental_benefit || 'Direct reduction in operational GHG footprint.'}</p>
            </div>
            <div className="bg-slate-800/40 rounded-xl p-3.5 border border-slate-700/50 space-y-1">
              <span className="text-[11px] font-bold text-blue-400 uppercase">Operational & Financial Benefit</span>
              <p className="text-xs text-slate-300">{recommendation.potential_operational_benefit || 'Lower long-term maintenance costs and utility expenditure.'}</p>
            </div>
          </div>

          {/* Required Additional Info & Constraints */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Required Info */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-300 flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Required Additional Data</span>
              </h4>
              <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                {recommendation.required_additional_info && recommendation.required_additional_info.length > 0 ? (
                  recommendation.required_additional_info.map((info, idx) => (
                    <li key={idx}>{info}</li>
                  ))
                ) : (
                  <li>Standard sub-metering interval verification</li>
                )}
              </ul>
            </div>

            {/* Constraints */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-300 flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Implementation Constraints & Risks</span>
              </h4>
              <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                {recommendation.potential_risks_constraints && recommendation.potential_risks_constraints.length > 0 ? (
                  recommendation.potential_risks_constraints.map((c, idx) => (
                    <li key={idx}>{c}</li>
                  ))
                ) : (
                  <li>Standard scheduled facilities downtime</li>
                )}
              </ul>
            </div>
          </div>

          {/* SDG Mapping Explanation */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h4 className="font-bold text-slate-200 flex items-center space-x-2 text-xs uppercase tracking-wide">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>United Nations Sustainable Development Goals (SDGs)</span>
            </h4>
            <div className="grid grid-cols-1 gap-2.5">
              {recommendation.sdg_mappings && recommendation.sdg_mappings.map((sdg) => (
                <div key={sdg.id || sdg.sdg_number} className="bg-slate-800/70 border border-slate-700/70 rounded-xl p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-300">
                      SDG {sdg.sdg_number}: {sdg.sdg_title}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {sdg.is_measured_outcome ? 'Verified Outcome' : 'Potential Contribution'}
                    </span>
                  </div>
                  <p className="text-slate-300">{sdg.explanation}</p>
                  <p className="text-[11px] text-slate-400">
                    <strong className="text-slate-300">Indicator: </strong>{sdg.measurable_indicator}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Evidence and Assumptions */}
          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 text-[11px] space-y-1 text-slate-400">
            <div className="flex items-center space-x-1.5 text-slate-300 font-semibold">
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              <span>Evidence Basis & Calculation Safeguards</span>
            </div>
            <p>
              Numerical reductions are NOT generated by LLMs. All potential savings must be simulated via the deterministic carbon calculation engine based on verified activity data and approved emission factors.
            </p>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            Status: <strong className="text-white capitalize">{recommendation.status.replace('_', ' ')}</strong>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                onClose();
                onSimulate(recommendation);
              }}
              className="py-2 px-4 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center space-x-1.5 shadow-lg shadow-emerald-500/20 transition-all"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Simulate Reduction Scenario</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
