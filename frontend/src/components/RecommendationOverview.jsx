import React from 'react';
import { 
  Lightbulb, Clock, CheckCircle2, Award, 
  TrendingDown, AlertTriangle, Layers, Zap,
  Flame, Bus, Utensils, Droplets, Wind, Wrench
} from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'All Elements', icon: Layers },
  { id: 'kitchen_lpg', label: 'Kitchen & LPG', icon: Flame },
  { id: 'electricity', label: 'Electricity', icon: Zap },
  { id: 'transportation', label: 'Transportation', icon: Bus },
  { id: 'food_waste', label: 'Food Waste', icon: Utensils },
  { id: 'water_wastewater', label: 'Water & Wastewater', icon: Droplets },
  { id: 'air_conditioning', label: 'Air Conditioning', icon: Wind },
  { id: 'fabrication_construction', label: 'Fabrication & Works', icon: Wrench },
];

export default function RecommendationOverview({
  summary,
  activeCategory,
  onSelectCategory,
  onGenerateClick,
  isGenerating,
  userRole
}) {
  return (
    <div className="space-y-6">
      
      {/* Top Banner & Generation CTA */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-900/40 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Zap className="w-3 h-3" />
              <span>Decarbonization Engine Active</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              AI Sustainability Interventions & Reduction Scenarios
            </h1>
            <p className="text-sm text-slate-300">
              Analyzes campus telemetry, matches vetted carbon mitigation interventions, maps impacts to UN SDGs, and estimates potential reductions using a deterministic carbon calculation engine.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            {userRole !== 'viewer' && (
              <button
                onClick={onGenerateClick}
                disabled={isGenerating}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center space-x-2 transition-all shadow-lg ${
                  isGenerating
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 hover:scale-[1.02]'
                }`}
              >
                <Lightbulb className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isGenerating ? 'Analyzing Elements...' : 'Generate AI Recommendations'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        
        {/* Total Recommendations */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total Actions</span>
            <Lightbulb className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-white">
            {summary?.total_recommendations ?? 0}
          </div>
          <span className="text-[11px] text-slate-400">Across 7 categories</span>
        </div>

        {/* Awaiting Review */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Awaiting Review</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-amber-300">
            {summary?.awaiting_review ?? 0}
          </div>
          <span className="text-[11px] text-slate-400">Requires officer signoff</span>
        </div>

        {/* Approved */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Approved</span>
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-blue-300">
            {summary?.approved ?? 0}
          </div>
          <span className="text-[11px] text-slate-400">Ready for scheduling</span>
        </div>

        {/* Implemented */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Implemented</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-300">
            {summary?.implemented ?? 0}
          </div>
          <span className="text-[11px] text-slate-400">In physical operation</span>
        </div>

        {/* Potential Emissions Savings */}
        <div className="bg-gradient-to-br from-emerald-900/40 to-slate-800/60 border border-emerald-700/40 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-300">
            <span className="text-xs font-semibold">Potential Savings</span>
            <TrendingDown className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-400 font-mono">
            {summary?.potential_emissions_reduction_tco2e ? summary.potential_emissions_reduction_tco2e.toFixed(1) : '0.0'} <span className="text-xs font-normal text-slate-300">tCO₂e/yr</span>
          </div>
          <span className="text-[11px] text-emerald-300/80">From saved scenarios</span>
        </div>

        {/* Requires Data */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Needs Data</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-rose-300">
            {summary?.requires_assessment ?? 0}
          </div>
          <span className="text-[11px] text-slate-400">Uncertain baseline</span>
        </div>

      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

    </div>
  );
}
