import React, { useState, useEffect } from 'react';
import { 
  Play, Sliders, DollarSign, TrendingDown, Save, 
  HelpCircle, ArrowRight, ShieldCheck, CheckCircle2, RotateCcw
} from 'lucide-react';
import { api } from '../api';

export default function ScenarioSimulator({
  elements,
  prefilledRecommendation,
  onScenarioSaved,
  onOpenComparison
}) {
  const [selectedElementId, setSelectedElementId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reductionPct, setReductionPct] = useState(10); // default 10% assumption as in Section 10!
  const [costPerUnit, setCostPerUnit] = useState('');
  const [previewResult, setPreviewResult] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize selected element and title when element or recommendation changes
  useEffect(() => {
    if (prefilledRecommendation) {
      setSelectedElementId(prefilledRecommendation.element_id || (elements[0]?.id || ''));
      setTitle(`Scenario: ${prefilledRecommendation.title}`);
      setDescription(prefilledRecommendation.proposed_action || '');
      const typical = prefilledRecommendation.estimation_assumptions?.typical_reduction_percent;
      if (typical) setReductionPct(typical);
    } else if (elements.length > 0 && !selectedElementId) {
      setSelectedElementId(elements[0].id);
      setTitle(`Scenario: 10% Reduction for ${elements[0].name}`);
    }
  }, [prefilledRecommendation, elements]);

  // Recalculate deterministic preview whenever element or reduction percentage changes
  useEffect(() => {
    if (!selectedElementId) return;

    let isMounted = true;
    setIsCalculating(true);

    const costVal = costPerUnit !== '' ? parseFloat(costPerUnit) : undefined;

    api.calculatePreview({
      element_id: selectedElementId,
      reduction_percentage: parseFloat(reductionPct),
      cost_per_unit: costVal
    })
      .then((res) => {
        if (isMounted) {
          setPreviewResult(res);
          setIsCalculating(false);
        }
      })
      .catch((err) => {
        console.error("Preview calculation failed:", err);
        if (isMounted) setIsCalculating(false);
      });

    return () => { isMounted = false; };
  }, [selectedElementId, reductionPct, costPerUnit]);

  const selectedElement = elements.find(e => e.id === selectedElementId);

  const handleSaveScenario = async () => {
    if (!selectedElementId || !title.trim()) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await api.createScenario({
        campus_id: selectedElement?.campus_id || 'green-tech-univ-01',
        element_id: selectedElementId,
        recommendation_id: prefilledRecommendation?.id || null,
        title: title.trim(),
        description: description.trim() || `Modeled ${reductionPct}% reduction for ${selectedElement?.name}.`,
        reduction_percentage_assumption: parseFloat(reductionPct),
        cost_per_unit_override: costPerUnit !== '' ? parseFloat(costPerUnit) : null
      });

      setSaveSuccess(true);
      if (onScenarioSaved) onScenarioSaved();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert(`Failed to save scenario: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Sliders className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Deterministic Reduction Scenario Simulator
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Simulate baseline vs. alternative activity hypotheses. Calculations run on the deterministic carbon calculation engine.
          </p>
        </div>

        <button
          onClick={onOpenComparison}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors self-start sm:self-auto"
        >
          Compare Saved Scenarios
        </button>
      </div>

      {/* Simulator Form & Real-time Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Controls Column (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Element Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Target Campus Element</label>
            <select
              value={selectedElementId}
              onChange={(e) => {
                setSelectedElementId(e.target.value);
                const el = elements.find(item => item.id === e.target.value);
                if (el) setTitle(`Scenario: ${reductionPct}% Reduction for ${el.name}`);
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              {elements.map((el) => (
                <option key={el.id} value={el.id}>
                  {el.name} ({el.category} - {el.scope})
                </option>
              ))}
            </select>
          </div>

          {/* Scenario Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Scenario Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Commercial Burner 10% Optimization"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Reduction Assumption Slider */}
          <div className="space-y-2 bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Reduction Assumption</span>
              <span className="font-mono text-emerald-400 font-bold text-sm bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                {reductionPct}%
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="60"
              step="1"
              value={reductionPct}
              onChange={(e) => setReductionPct(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>1% (Minor tune-up)</span>
              <span>30% (Deep retrofit)</span>
              <span>60% (Fuel switch)</span>
            </div>
          </div>

          {/* Cost rate override */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Utility Cost Rate (Optional)</span>
              <span className="text-[10px] text-slate-500">For financial savings estimate</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 text-xs">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costPerUnit}
                onChange={(e) => setCostPerUnit(e.target.value)}
                placeholder="Leave blank to use recorded facility tariff"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-7 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button
              onClick={handleSaveScenario}
              disabled={isSaving || !title.trim()}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                saveSuccess
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
              }`}
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Scenario Saved Successfully!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Calculating & Saving...' : 'Save Scenario'}</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* Real-time Calculation Results Display (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                Deterministic Output: Baseline vs Alternative
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                E = Activity × EF
              </span>
            </div>

            {/* Comparison Cards Grid */}
            <div className="grid grid-cols-2 gap-4">
              
              {/* Baseline Card */}
              <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Current Baseline</span>
                <div className="space-y-0.5">
                  <div className="text-lg font-bold text-slate-200 font-mono">
                    {previewResult?.baseline_activity} <span className="text-xs font-normal text-slate-400">{previewResult?.baseline_unit}/day</span>
                  </div>
                  <div className="text-xs text-rose-400/90 font-mono font-medium">
                    {previewResult?.baseline_emissions_kg} kgCO₂e/day
                  </div>
                </div>
              </div>

              {/* Alternative Card */}
              <div className="bg-emerald-950/20 rounded-xl p-4 border border-emerald-900/50 space-y-2">
                <span className="text-[11px] font-semibold text-emerald-400 uppercase">Simulated Alternative</span>
                <div className="space-y-0.5">
                  <div className="text-lg font-bold text-emerald-300 font-mono">
                    {previewResult?.alternative_activity} <span className="text-xs font-normal text-emerald-400/80">{previewResult?.alternative_unit}/day</span>
                  </div>
                  <div className="text-xs text-emerald-400 font-mono font-medium">
                    {previewResult?.alternative_emissions_kg} kgCO₂e/day
                  </div>
                </div>
              </div>

            </div>

            {/* Calculated Reductions Summary */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              
              {/* Daily Reduction */}
              <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Daily Reduction</span>
                <span className="text-base font-extrabold text-emerald-400 font-mono mt-1 block">
                  {previewResult?.potential_reduction_kg} <span className="text-[10px]">kg</span>
                </span>
                <span className="text-[10px] text-emerald-500 font-semibold">
                  (-{previewResult?.potential_reduction_percentage}%)
                </span>
              </div>

              {/* Annual Project */}
              <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Annual Avoided</span>
                <span className="text-base font-extrabold text-teal-400 font-mono mt-1 block">
                  {previewResult?.annual_reduction_tco2e} <span className="text-[10px]">tCO₂e</span>
                </span>
                <span className="text-[10px] text-slate-400">365-day model</span>
              </div>

              {/* Financial Savings */}
              <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Financial Savings</span>
                <span className="text-base font-extrabold text-amber-400 font-mono mt-1 block">
                  {previewResult?.financial_savings_amount ? `$${previewResult.financial_savings_amount.toLocaleString()}` : 'N/A'}
                </span>
                <span className="text-[10px] text-slate-400">Est. / year</span>
              </div>

            </div>

            {/* Calculation Methodology & Disclaimer */}
            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-[11px] space-y-1 text-slate-400">
              <div className="flex items-center space-x-1.5 text-slate-300 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Deterministic Calculation Rule (Section 9 & 10)</span>
              </div>
              <p>
                Potential Reduction = E_baseline - E_alternative = (A_baseline × EF) - (A_alternative × EF).
              </p>
              <p className="text-amber-400/90 font-medium">
                Disclaimer: The {reductionPct}% reduction is an illustrative simulation assumption. It is not an achieved historical outcome until validated by post-implementation telemetry.
              </p>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
