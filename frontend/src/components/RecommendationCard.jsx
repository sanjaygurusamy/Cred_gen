import React from 'react';
import { 
  CheckCircle2, XCircle, PlayCircle, Eye, AlertCircle,
  Building2, Sparkles, Database, Check, Award
} from 'lucide-react';

const SDG_COLORS = {
  6: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  7: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  9: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  11: 'bg-amber-600/10 text-amber-500 border-amber-600/30',
  12: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  13: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
};

const STATUS_BADGES = {
  pending_review: { label: 'Awaiting Review', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  approved: { label: 'Approved', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  implemented: { label: 'Implemented', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  rejected: { label: 'Rejected', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
  requires_assessment: { label: 'Requires Assessment', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' }
};

export default function RecommendationCard({
  recommendation,
  onViewDetails,
  onSimulate,
  onApprove,
  onReject,
  onImplement,
  userRole
}) {
  const statusInfo = STATUS_BADGES[recommendation.status] || STATUS_BADGES.pending_review;

  return (
    <div className="bg-slate-800/80 border border-slate-700/70 hover:border-slate-600 rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-xl space-y-4">
      
      {/* Top Header: Target Element & Priority Score */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs gap-2">
          
          {/* Target Element & Campus Body */}
          <div className="flex items-center space-x-1.5 text-slate-400 truncate">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-semibold text-slate-200 truncate">{recommendation.element_name || 'Element'}</span>
            <span className="text-slate-500">•</span>
            <span className="truncate">{recommendation.campus_body_name || 'Campus Facility'}</span>
          </div>

          {/* Status & Priority */}
          <div className="flex items-center space-x-2 shrink-0">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
              recommendation.priority_level === 'high'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : recommendation.priority_level === 'medium'
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                : 'bg-slate-700/50 text-slate-400 border-slate-600'
            }`}>
              {recommendation.priority_score ? `${recommendation.priority_score}/100` : recommendation.priority_level}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-white tracking-tight leading-snug">
          {recommendation.title}
        </h3>
      </div>

      {/* Problem & Proposed Action */}
      <div className="space-y-2 text-xs">
        <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/80 space-y-1.5">
          <p className="text-slate-400">
            <strong className="text-rose-400 font-medium">Issue: </strong>
            {recommendation.problem}
          </p>
          <p className="text-slate-300">
            <strong className="text-emerald-400 font-medium">Intervention: </strong>
            {recommendation.proposed_action}
          </p>
        </div>

        {/* Environmental & Operational Benefits preview */}
        {recommendation.expected_environmental_benefit && (
          <p className="text-slate-400 line-clamp-2">
            <span className="text-teal-400 font-medium">Benefit: </span>
            {recommendation.expected_environmental_benefit}
          </p>
        )}
      </div>

      {/* SDGs & Source Tag */}
      <div className="pt-2 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-2">
        
        {/* SDG Badges */}
        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
          {recommendation.sdg_mappings && recommendation.sdg_mappings.length > 0 ? (
            recommendation.sdg_mappings.map((s) => (
              <span
                key={s.id || s.sdg_number}
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded border ${SDG_COLORS[s.sdg_number] || 'bg-slate-800 text-slate-300 border-slate-700'}`}
                title={`${s.sdg_title}: ${s.explanation}`}
              >
                SDG {s.sdg_number}
              </span>
            ))
          ) : (
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
              SDG 13
            </span>
          )}
        </div>

        {/* Engine Source Badge */}
        <div className="flex items-center space-x-1 text-[10px] text-slate-400">
          {recommendation.source === 'llm' ? (
            <span className="flex items-center space-x-1 text-purple-400">
              <Sparkles className="w-3 h-3" />
              <span>LLM Contextual</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1 text-emerald-400">
              <Database className="w-3 h-3" />
              <span>Verified Rule</span>
            </span>
          )}
        </div>

      </div>

      {/* Action Buttons */}
      <div className="pt-1 flex items-center justify-between gap-2">
        <button
          onClick={() => onViewDetails(recommendation)}
          className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-700/70 hover:bg-slate-700 text-slate-200 transition-colors flex items-center justify-center space-x-1.5"
        >
          <Eye className="w-3.5 h-3.5 text-slate-400" />
          <span>Details</span>
        </button>

        <button
          onClick={() => onSimulate(recommendation)}
          className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-colors flex items-center justify-center space-x-1.5"
        >
          <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>Simulate</span>
        </button>

        {/* Role-governed Workflow Actions */}
        {userRole !== 'viewer' && recommendation.status === 'pending_review' && (
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onApprove(recommendation.id)}
              className="p-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30"
              title="Approve Recommendation"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onReject(recommendation)}
              className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30"
              title="Reject Recommendation"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {userRole !== 'viewer' && recommendation.status === 'approved' && (
          <button
            onClick={() => onImplement(recommendation)}
            className="py-1.5 px-2 rounded-lg text-xs font-semibold bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 flex items-center space-x-1"
            title="Mark Implemented"
          >
            <Award className="w-3.5 h-3.5 text-teal-400" />
            <span>Deploy</span>
          </button>
        )}
      </div>

    </div>
  );
}
