import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, TrendingDown, Award, AlertCircle, PlusCircle, BarChart2 } from 'lucide-react';
import { api } from '../api';

export default function OutcomeComparisonModal({
  intervention,
  onClose
}) {
  const [measuredActivity, setMeasuredActivity] = useState('');
  const [measuredUnit, setMeasuredUnit] = useState('kg');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comparison, setComparison] = useState(null);
  const [error, setError] = useState(null);

  const fetchComparison = () => {
    if (!intervention?.id) return;
    api.compareOutcome(intervention.id)
      .then(res => setComparison(res))
      .catch(err => {
        // May have no measurements yet
        setComparison(null);
      });
  };

  useEffect(() => {
    fetchComparison();
  }, [intervention]);

  const handleRecordMeasurement = async (e) => {
    e.preventDefault();
    if (!measuredActivity) return;
    setIsSubmitting(true);
    setError(null);

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

    try {
      await api.recordMeasurement(intervention.id, {
        measurement_period_start: sevenDaysAgo.toISOString(),
        measurement_period_end: now.toISOString(),
        measured_activity: parseFloat(measuredActivity),
        measured_unit: measuredUnit,
        notes: notes.trim() || 'Post-implementation verification telemetry'
      });
      fetchComparison();
      setMeasuredActivity('');
      setNotes('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
              <BarChart2 className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Post-Implementation Outcome Verification
              </h2>
              <p className="text-xs text-slate-400">
                Intervention: <strong className="text-slate-200">{intervention?.title}</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Existing Outcome Comparison Display */}
        {comparison ? (
          <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700 space-y-4 text-xs">
            
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300 uppercase tracking-wide">
                Empirical Evaluation Result
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                comparison.status === 'exceeded_target'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : comparison.status === 'met_target'
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              }`}>
                {comparison.status.replace('_', ' ')}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-slate-900/60 rounded-lg p-2.5 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Baseline Act.</span>
                <span className="text-sm font-bold text-slate-200 font-mono mt-0.5 block">
                  {comparison.baseline_activity}
                </span>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-2.5 border border-slate-800">
                <span className="text-[10px] text-emerald-400 block">Measured Post</span>
                <span className="text-sm font-bold text-emerald-300 font-mono mt-0.5 block">
                  {comparison.measured_activity}
                </span>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-2.5 border border-slate-800">
                <span className="text-[10px] text-emerald-400 block">Actual Reduction</span>
                <span className="text-sm font-bold text-emerald-400 font-mono mt-0.5 block">
                  {comparison.actual_reduction_kg} kg
                </span>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-2.5 border border-slate-800">
                <span className="text-[10px] text-teal-400 block">Reduction %</span>
                <span className="text-sm font-bold text-teal-300 font-mono mt-0.5 block">
                  {comparison.actual_reduction_percentage}%
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 text-[11px] text-slate-300">
              <strong className="text-emerald-400">Auditor Notes: </strong>
              {comparison.evaluation_notes}
            </div>

          </div>
        ) : (
          <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800 text-xs text-slate-400 text-center">
            No verified post-implementation measurements recorded yet. Add empirical activity data below to compare against baseline.
          </div>
        )}

        {/* Form: Record New Post Measurement */}
        <form onSubmit={handleRecordMeasurement} className="space-y-4 text-xs pt-2 border-t border-slate-800">
          <div className="font-bold text-slate-200 flex items-center space-x-1.5">
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>Add Post-Implementation Measurement</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Measured Activity Value</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={measuredActivity}
                onChange={(e) => setMeasuredActivity(e.target.value)}
                placeholder="e.g. 71.0"
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-200 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Activity Unit</label>
              <input
                type="text"
                value={measuredUnit}
                onChange={(e) => setMeasuredUnit(e.target.value)}
                placeholder="kg, kWh, liter"
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-200 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Audit & Sub-Meter Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. 7-day average post-retrofit gas meter reading"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-200 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {error && (
            <p className="text-rose-400 text-xs">{error}</p>
          )}

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              Done
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !measuredActivity}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center space-x-1.5 shadow-lg shadow-emerald-500/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Recording...' : 'Record & Verify Outcome'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
