import React, { useState, useEffect } from 'react';
import { X, Scale, AlertTriangle, CheckCircle, BarChart3 } from 'lucide-react';
import { api } from '../api';

export default function ScenarioComparisonModal({
  scenarios,
  onClose
}) {
  const [selectedIds, setSelectedIds] = useState(scenarios.map(s => s.id));
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedIds.length === 0) {
      setComparisonData(null);
      return;
    }

    setLoading(true);
    api.compareScenarios(selectedIds)
      .then((res) => {
        setComparisonData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Comparison error:", err);
        setLoading(false);
      });
  }, [selectedIds]);

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col justify-between">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Scale className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Reduction Scenario Comparative Analysis
              </h2>
              <p className="text-xs text-slate-400">
                Compare multiple sustainability intervention scenarios with automated double-counting safeguards.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-sm">
          
          {/* Double Counting Warning Banner */}
          {comparisonData?.double_counting_warning && (
            <div className="bg-amber-950/40 border border-amber-600/50 rounded-xl p-4 flex items-start space-x-3 text-amber-200 text-xs">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-amber-300 block mb-0.5">
                  Double-Counting Safeguard Activated
                </strong>
                <p className="leading-relaxed">
                  {comparisonData.double_counting_warning}
                </p>
              </div>
            </div>
          )}

          {/* Aggregated Highlights */}
          {comparisonData && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 text-center">
                <span className="text-xs text-slate-400 font-medium">Unique Daily Reduction</span>
                <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
                  {comparisonData.total_potential_reduction_kg?.toLocaleString()} <span className="text-xs">kgCO₂e</span>
                </div>
              </div>
              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 text-center">
                <span className="text-xs text-slate-400 font-medium">Aggregated Annual Avoided</span>
                <div className="text-2xl font-black text-teal-400 font-mono mt-1">
                  {comparisonData.total_annual_reduction_tco2e?.toLocaleString()} <span className="text-xs">tCO₂e/yr</span>
                </div>
              </div>
              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 text-center">
                <span className="text-xs text-slate-400 font-medium">Estimated Financial Savings</span>
                <div className="text-2xl font-black text-amber-400 font-mono mt-1">
                  ${comparisonData.total_potential_financial_savings?.toLocaleString()} <span className="text-xs">/yr</span>
                </div>
              </div>
            </div>
          )}

          {/* Scenario Comparison Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/80 text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3 w-10">Select</th>
                    <th className="p-3">Scenario Title</th>
                    <th className="p-3">Element / Category</th>
                    <th className="p-3 font-mono">Baseline (A × EF)</th>
                    <th className="p-3 font-mono">Simulated Alt</th>
                    <th className="p-3 font-mono text-emerald-400">Potential Red.</th>
                    <th className="p-3 font-mono text-teal-400">Annual (tCO₂e)</th>
                    <th className="p-3 font-mono text-amber-400">Est. Savings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                  {scenarios.map((scen) => {
                    const isSelected = selectedIds.includes(scen.id);
                    const res = scen.results?.[0];
                    return (
                      <tr key={scen.id} className={isSelected ? 'bg-slate-800/30' : 'opacity-60'}>
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(scen.id)}
                            className="rounded accent-emerald-500 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 font-semibold text-white">{scen.title}</td>
                        <td className="p-3 text-slate-300">
                          {scen.element_name} <span className="text-[10px] text-slate-500">({scen.element_category})</span>
                        </td>
                        <td className="p-3 font-mono text-slate-300">
                          {res?.baseline_activity} {res?.baseline_unit} ({res?.baseline_emissions_kg} kg)
                        </td>
                        <td className="p-3 font-mono text-slate-300">
                          {res?.alternative_activity} {res?.alternative_unit}
                        </td>
                        <td className="p-3 font-mono font-bold text-emerald-400">
                          -{res?.potential_reduction_kg} kg ({res?.potential_reduction_percentage}%)
                        </td>
                        <td className="p-3 font-mono font-bold text-teal-400">
                          {res?.annual_reduction_tco2e}
                        </td>
                        <td className="p-3 font-mono font-bold text-amber-400">
                          {res?.financial_savings_amount ? `$${res.financial_savings_amount.toLocaleString()}` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            Close Comparison
          </button>
        </div>

      </div>
    </div>
  );
}
