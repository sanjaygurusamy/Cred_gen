import React from 'react';
import { Database, Calendar, ArrowRight } from 'lucide-react';
import { Badge } from './Badge';

interface EmptyStateProps {
  title: string;
  description: string;
  plannedPhase?: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  plannedPhase,
  actionText,
  onAction,
  icon,
}) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-4 max-w-xl mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400">
        {icon || <Database className="w-7 h-7 text-emerald-400/80" />}
      </div>

      <div className="space-y-1.5 max-w-md">
        <div className="flex items-center justify-center space-x-2">
          <h4 className="text-base font-bold text-white tracking-tight">{title}</h4>
          {plannedPhase && (
            <Badge variant="planned">
              {plannedPhase}
            </Badge>
          )}
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
      </div>

      {actionText && (
        <button
          onClick={onAction}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-colors"
        >
          <span>{actionText}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}

      <div className="pt-2 border-t border-slate-800/60 w-full flex items-center justify-center space-x-2 text-[11px] text-slate-500">
        <Calendar className="w-3.5 h-3.5 text-slate-500" />
        <span>Subsequent phases will introduce activity loggers and meter connectors.</span>
      </div>
    </div>
  );
};
