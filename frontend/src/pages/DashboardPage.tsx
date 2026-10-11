import React, { useState, useEffect, useCallback } from 'react';
import {
  Building,
  RotateCcw,
  Layers,
  PieChart,
  BarChart3,
  Calendar,
  AlertCircle,
  ShieldCheck,
  TrendingUp,
  Info,
  CheckCircle2,
  Server,
  Database,
  Trees,
  Globe2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useSystemStatus } from '../context/SystemStatusContext';
import {
  DashboardMetricsResponse,
  CategoryEmissionsResponse,
  BlockEmissionsResponse,
  TrendsResponse,
  BlockDetailAnalyticsResponse,
  DataQualityResponse,
  CampusBlock,
  SequestrationSummary,
  SDGItem,
} from '../types';

export const DashboardPage: React.FC = () => {
  // System diagnostics state
  const { connectionState } = useSystemStatus();

  // Date filter state
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'blocks' | 'trends' | 'quality'>('overview');

  // Master blocks for block drilldown
  const [blocks, setBlocks] = useState<CampusBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string>('');

  // Reporting Data States
  const [metrics, setMetrics] = useState<DashboardMetricsResponse | null>(null);
  const [categories, setCategories] = useState<CategoryEmissionsResponse | null>(null);
  const [blockEmissions, setBlockEmissions] = useState<BlockEmissionsResponse | null>(null);
  const [treeSummary, setTreeSummary] = useState<SequestrationSummary | null>(null);
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [blockDetail, setBlockDetail] = useState<BlockDetailAnalyticsResponse | null>(null);
  const [dataQuality, setDataQuality] = useState<DataQualityResponse | null>(null);
  const [sdgs, setSdgs] = useState<SDGItem[]>([]);

  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingBlockDetail, setLoadingBlockDetail] = useState<boolean>(false);
  const [trendGroupBy, setTrendGroupBy] = useState<'day' | 'month'>('day');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Load Campus Blocks
  // ---------------------------------------------------------------------------
  const fetchBlocks = useCallback(async () => {
    try {
      const res = await apiClient.getBlocks();
      setBlocks(res.items);
      if (res.items.length > 0 && !selectedBlockId) {
        setSelectedBlockId(res.items[0].id);
      }
    } catch {
      // Ignored for block dropdown
    }
  }, [selectedBlockId]);

  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

  // ---------------------------------------------------------------------------
  // Fetch Dashboard & Analytics Data
  // ---------------------------------------------------------------------------
  const fetchDashboardData = useCallback(async () => {
    if (startDate && endDate && startDate > endDate) {
      setErrorMsg('Start date cannot be after end date.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const params = {
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      };

      const [metricsRes, catRes, blkRes, trendsRes, qualityRes, treeRes, sdgRes] = await Promise.all([
        apiClient.getDashboardMetrics(params),
        apiClient.getEmissionsByCategory(params),
        apiClient.getEmissionsByBlock(params),
        apiClient.getEmissionsTrends({ ...params, group_by: trendGroupBy }),
        apiClient.getDataQuality(params),
        apiClient.getTreesSummary(),
        apiClient.getCampusSDGs().catch(() => []),
      ]);

      setMetrics(metricsRes);
      setCategories(catRes);
      setBlockEmissions(blkRes);
      setTrends(trendsRes);
      setDataQuality(qualityRes);
      setTreeSummary(treeRes);
      setSdgs(sdgRes);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch campus carbon dashboard metrics');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, trendGroupBy]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ---------------------------------------------------------------------------
  // Fetch Specific Block Detail Analytics
  // ---------------------------------------------------------------------------
  const fetchSelectedBlockDetail = useCallback(async () => {
    if (!selectedBlockId) return;
    try {
      setLoadingBlockDetail(true);
      const res = await apiClient.getBlockDetailAnalytics(selectedBlockId, {
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setBlockDetail(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch block analytics');
    } finally {
      setLoadingBlockDetail(false);
    }
  }, [selectedBlockId, startDate, endDate]);

  useEffect(() => {
    if (activeTab === 'blocks') {
      fetchSelectedBlockDetail();
    }
  }, [activeTab, fetchSelectedBlockDetail]);

  // Quick Preset Handlers
  const handlePreset = (preset: 'last7' | 'last30' | 'ytd' | 'all') => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'last7') {
      const past = new Date(Date.now() - 7 * 86400000);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'last30') {
      const past = new Date(Date.now() - 30 * 86400000);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'ytd') {
      const yearStart = `${today.getFullYear()}-01-01`;
      setStartDate(yearStart);
      setEndDate(todayStr);
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <Building className="w-4 h-4" />
            <span>Amrita Vishwa Vidyapeetham</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">Coimbatore Campus (AVV-CBE)</span>
            <span className="sr-only">GreenTech University Main Campus</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-3">
            <span>Campus Carbon Dashboard & Digital MRV</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              Phase 6 Active
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time greenhouse gas accounting, energy telemetrics, and block-level footprint tracking powered by deterministic calculations.
          </p>
        </div>

        {/* Global Refresh Control */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchDashboardData()}
            disabled={loading}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-colors"
            title="Refresh live metrics from database"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Dashboard</span>
          </button>
        </div>
      </div>

      {/* System Infrastructure Health (Backend API & PostgreSQL Status) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-slate-800 text-slate-400">
              <Server className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Backend Transport Endpoint</span>
              <span className="text-xs font-semibold text-slate-200">
                {connectionState === 'connected' || connectionState === 'degraded'
                  ? 'Healthy & Responding'
                  : connectionState === 'loading'
                  ? 'Checking probe...'
                  : 'Offline / Unreachable'}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono text-slate-500">GET /api/health</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-slate-800 text-slate-400">
              <Database className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Database Infrastructure</span>
              <span className="text-xs font-semibold text-slate-200">
                {connectionState === 'connected'
                  ? 'Connected (Ping 200)'
                  : connectionState === 'loading'
                  ? 'Checking probe...'
                  : 'Unavailable (503)'}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono text-slate-500">GET /api/ready</span>
        </div>
      </div>

      {/* 2. Notification Alerts */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between text-rose-300 text-xs">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">✕</button>
        </div>
      )}

      {/* 3. Reporting Period Selector Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>Reporting Window:</span>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
              title="Start Date"
            />
            <span className="text-slate-500 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
              title="End Date"
            />
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handlePreset('last7')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
          >
            Last 7 Days
          </button>
          <button
            onClick={() => handlePreset('last30')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
          >
            Last 30 Days
          </button>
          <button
            onClick={() => handlePreset('ytd')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
          >
            YTD
          </button>
          <button
            onClick={() => handlePreset('all')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
          >
            All Records
          </button>
        </div>
      </div>

      {/* 4. Executive Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Emissions */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 block">Total Campus Emissions</span>
          <div className="mt-1">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {metrics && metrics.has_data ? `${metrics.total_emissions_t_co2e.toLocaleString()} t` : '—'}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
              {metrics && metrics.has_data ? `${metrics.total_emissions_kg_co2e.toLocaleString()} kg CO2e` : 'Zero records recorded'}
            </span>
          </div>
        </div>

        {/* Scope 1 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 block">Scope 1 (Direct Fuel)</span>
          <div className="mt-1">
            <span className="text-2xl font-bold font-mono text-amber-400">
              {metrics && metrics.has_data ? `${metrics.scope_1_t.toLocaleString()} t` : '—'}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
              {metrics && metrics.has_data ? `${metrics.scope_1_kg.toLocaleString()} kg` : 'Zero fuel recorded'}
            </span>
          </div>
        </div>

        {/* Scope 2 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 block">Scope 2 (Electricity)</span>
          <div className="mt-1">
            <span className="text-2xl font-bold font-mono text-blue-400">
              {metrics && metrics.has_data ? `${metrics.scope_2_t.toLocaleString()} t` : '—'}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
              {metrics && metrics.has_data ? `${metrics.scope_2_kg.toLocaleString()} kg` : 'Zero grid recorded'}
            </span>
          </div>
        </div>

        {/* Scope 3 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 block">Scope 3 (Waste & Value)</span>
          <div className="mt-1">
            <span className="text-2xl font-bold font-mono text-purple-400">
              {metrics && metrics.has_data ? `${metrics.scope_3_t.toLocaleString()} t` : '—'}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
              {metrics && metrics.has_data ? `${metrics.scope_3_kg.toLocaleString()} kg` : 'Zero waste recorded'}
            </span>
          </div>
        </div>

        {/* Electricity Consumption */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 block">Total Electricity (kWh)</span>
          <div className="mt-1">
            <span className="text-2xl font-bold font-mono text-cyan-400">
              {metrics && metrics.has_data ? `${metrics.total_electricity_kwh.toLocaleString()}` : '—'}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
              {metrics && metrics.has_data ? `${metrics.actual_electricity_kwh.toLocaleString()} actual / ${metrics.estimated_electricity_kwh.toLocaleString()} est` : 'No meter telemetry'}
            </span>
          </div>
        </div>

        {/* Reporting Coverage */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 block">Measurement Coverage</span>
          <div className="mt-1">
            <span className="text-2xl font-bold font-mono text-emerald-300">
              {metrics && metrics.has_data ? `${metrics.measured_coverage_pct}%` : '—'}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
              {metrics && metrics.has_data ? `${metrics.reporting_blocks_count}/${metrics.active_blocks_count} blocks active` : 'No activity logged'}
            </span>
          </div>
        </div>
      </div>

      {/* Honest Empty State Banner if 0 records */}
      {(!metrics || !metrics.has_data) && (
        <div className="p-8 text-center rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
          <h3 className="text-base font-semibold text-slate-300">
            No campus activity data has been recorded yet
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Zero greenhouse gas emissions records were found for the selected reporting window.
            Record activity readings in Phase 3 or generate calculations in the Carbon Calculator to populate this dashboard.
          </p>
        </div>
      )}

      {/* 5. Navigation Tabs for Phase 6 Sub-Views */}
      <div className="flex items-center border-b border-slate-800 space-x-6 text-sm overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 font-medium flex items-center space-x-2 transition-colors relative shrink-0 ${
            activeTab === 'overview'
              ? 'text-emerald-400 border-b-2 border-emerald-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>Overview & Scope Breakdown</span>
        </button>

        <button
          onClick={() => setActiveTab('blocks')}
          className={`pb-3 font-medium flex items-center space-x-2 transition-colors relative shrink-0 ${
            activeTab === 'blocks'
              ? 'text-emerald-400 border-b-2 border-emerald-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Block-Wise Analytics (27 Blocks)</span>
        </button>

        <button
          onClick={() => setActiveTab('trends')}
          className={`pb-3 font-medium flex items-center space-x-2 transition-colors relative shrink-0 ${
            activeTab === 'trends'
              ? 'text-emerald-400 border-b-2 border-emerald-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Emissions & Energy Trends</span>
        </button>

        <button
          onClick={() => setActiveTab('quality')}
          className={`pb-3 font-medium flex items-center space-x-2 transition-colors relative shrink-0 ${
            activeTab === 'quality'
              ? 'text-emerald-400 border-b-2 border-emerald-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Data Quality & Safeguards</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: OVERVIEW & SCOPE BREAKDOWN
          ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Emissions Breakdown */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>Emissions by Activity Category</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {categories ? `${categories.items.length} categories` : 'Loading...'}
                </span>
              </div>

              {categories && categories.items.length > 0 ? (
                <div className="space-y-3">
                  {categories.items.map((cat) => (
                    <div key={cat.category} className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200">{cat.category_name}</span>
                        <span className="font-mono text-emerald-400 font-bold">
                          {cat.emissions_t_co2e.toLocaleString()} t ({cat.percentage_of_total}%)
                        </span>
                      </div>
                      {/* Visual progress bar */}
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            cat.scope === 'scope_1'
                              ? 'bg-amber-400'
                              : cat.scope === 'scope_2'
                              ? 'bg-blue-400'
                              : 'bg-purple-400'
                          }`}
                          style={{ width: `${Math.min(cat.percentage_of_total, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span className="uppercase">{cat.scope.replace('_', ' ')}</span>
                        <span>{cat.record_count} calculations ({cat.measured_count} measured)</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <span>No categorized emissions data recorded for this period.</span>
                </div>
              )}
            </div>

            {/* Top Emitting Campus Blocks Ranking */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  <span>Top Emitting Campus Blocks</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">Ranked by footprint</span>
              </div>

              {blockEmissions && blockEmissions.items.filter((b) => b.has_data).length > 0 ? (
                <div className="space-y-3">
                  {blockEmissions.items.filter((b) => b.has_data).slice(0, 5).map((b, idx) => (
                    <div key={b.block_id} className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 font-mono text-xs flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-semibold text-slate-200 text-xs">{b.block_name}</div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {b.block_code} • {b.block_category.replace('_', ' ').toUpperCase()} • {b.emissions_per_sqm} kg/m²
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold font-mono text-emerald-400 block">
                          {b.total_emissions_t_co2e.toLocaleString()} t
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {b.percentage_of_campus}% of campus
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <span>No block activity footprints available for ranking.</span>
                </div>
              )}
            </div>
          </div>

          {/* Campus Tree Sequestration & Living Green Canopy (Biological Sink) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <div className="flex items-center space-x-2">
                <Trees className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
                    <span>Campus Trees & Biological Carbon Sequestration</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      Biological Sink
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Living biomass carbon absorption calculated via IPCC AFOLU & FSI allometric models (segregated from gross compliance emissions).
                  </p>
                </div>
              </div>
              <Link
                to="/trees"
                className="inline-flex items-center space-x-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
              >
                <span>Explore Trees & Plantation</span>
                <span>→</span>
              </Link>
            </div>

            {treeSummary ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Catalogued Trees</span>
                    <span className="text-lg font-bold font-mono text-emerald-400">
                      {treeSummary.total_trees.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Across {treeSummary.total_species_count} species
                    </span>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Annual Absorption</span>
                    <span className="text-lg font-bold font-mono text-emerald-400">
                      {treeSummary.total_annual_sequestration_t_co2e.toLocaleString()} t CO₂e/yr
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {treeSummary.total_annual_sequestration_kg_co2e.toLocaleString()} kg/yr
                    </span>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Dedicated Green Spaces</span>
                    <span className="text-lg font-bold font-mono text-cyan-400">
                      {treeSummary.total_green_spaces} zones
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {treeSummary.total_green_space_area_sqm.toLocaleString()} m² area
                    </span>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Plantation Survival</span>
                    <span className="text-lg font-bold font-mono text-amber-400">
                      {treeSummary.average_survival_rate_percent}%
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {treeSummary.total_saplings_surviving} of {treeSummary.total_saplings_planted} saplings
                    </span>
                  </div>
                </div>

                {treeSummary.species_breakdown && treeSummary.species_breakdown.length > 0 && (
                  <div className="pt-2">
                    <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                      <span>Top Absorbing Species on Campus</span>
                      <span className="text-[10px] text-slate-400 font-mono">Ranked by annual carbon intake</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {treeSummary.species_breakdown.slice(0, 6).map((sp) => (
                        <div
                          key={sp.species_name}
                          className="bg-slate-950 border border-slate-800/80 rounded-lg p-2.5 flex items-center justify-between"
                        >
                          <div>
                            <div className="text-xs font-semibold text-slate-200">{sp.common_name}</div>
                            <div className="text-[10px] italic text-slate-400">{sp.species_name} ({sp.tree_count} trees)</div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold font-mono text-emerald-400 block">
                              {sp.annual_sequestration_t.toFixed(2)} t
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">{sp.percentage_of_total}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 text-center text-slate-400 text-xs">
                <span>No tree inventory data available.</span>
              </div>
            )}
          </div>

          {/* UN Sustainable Development Goals (SDG) Alignment & Indicators */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <div className="flex items-center space-x-2">
                <Globe2 className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
                    <span>UN Sustainable Development Goals (SDG) Alignment</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/10 text-blue-300 border border-blue-500/20">
                      {sdgs.length} Active Goals
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Institutional environmental telemetrics mapped to United Nations Agenda 2030 sustainability frameworks.
                  </p>
                </div>
              </div>
              <Link
                to="/sustainability"
                className="inline-flex items-center space-x-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
              >
                <span>View Comprehensive SDG Analytics</span>
                <span>→</span>
              </Link>
            </div>

            {sdgs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {sdgs.map((sdg) => (
                  <div
                    key={sdg.sdg_number}
                    className="bg-slate-950 border border-slate-800/90 hover:border-slate-700 rounded-xl p-4 space-y-3 transition-colors flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold font-mono text-white text-xs shadow-md"
                            style={{ backgroundColor: sdg.theme_color }}
                          >
                            {sdg.sdg_number}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-100 block">
                              SDG {sdg.sdg_number}: {sdg.short_name}
                            </span>
                            <span className="text-[10px] text-slate-400 block line-clamp-1">
                              {sdg.title}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                        {sdg.institutional_relevance}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 font-mono">
                        {sdg.targets?.length || 0} Targets Tracked
                      </span>
                      <Link
                        to="/sustainability"
                        className="text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center space-x-1"
                      >
                        <span>Targets</span>
                        <span>→</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-slate-400 text-xs">
                <span>Loading UN SDG mappings...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: BLOCK-WISE ANALYTICS
          ========================================================================= */}
      {activeTab === 'blocks' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                  <Building className="w-4 h-4 text-emerald-400" />
                  <span>Block Footprint & Operations Drilldown</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Inspect floor area carbon intensity, activity records, and actual vs estimated electricity coverage.
                </p>
              </div>

              {/* Block Selector */}
              <div className="w-full sm:w-72">
                <select
                  value={selectedBlockId}
                  onChange={(e) => setSelectedBlockId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                >
                  {blocks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code}) — {b.category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loadingBlockDetail ? (
              <div className="p-12 text-center text-slate-400 text-xs bg-slate-950 rounded-lg">
                <RotateCcw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
                <span>Querying block telemetry and calculations...</span>
              </div>
            ) : blockDetail ? (
              <div className="space-y-6 pt-2">
                {/* Block Profile Metadata & KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                    <span className="text-[11px] text-slate-400 block">Calculated Footprint</span>
                    <span className="text-lg font-bold font-mono text-emerald-400">
                      {blockDetail.total_emissions_t_co2e.toLocaleString()} t
                    </span>
                    <span className="text-[10px] text-slate-500 block font-mono">
                      ({blockDetail.total_emissions_kg_co2e.toLocaleString()} kg CO2e)
                    </span>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                    <span className="text-[11px] text-slate-400 block">Carbon Intensity</span>
                    <span className="text-lg font-bold font-mono text-cyan-400">
                      {blockDetail.emissions_per_sqm} kg/m²
                    </span>
                    <span className="text-[10px] text-slate-500 block font-mono">
                      {blockDetail.block.floor_area_sqm != null ? blockDetail.block.floor_area_sqm.toLocaleString() : '—'} m² floor area
                    </span>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                    <span className="text-[11px] text-slate-400 block">Electricity Logged</span>
                    <span className="text-lg font-bold font-mono text-blue-400">
                      {blockDetail.electricity_kwh.toLocaleString()} kWh
                    </span>
                    <span className="text-[10px] text-slate-500 block font-mono">
                      {blockDetail.measured_records} measured / {blockDetail.estimated_records} est
                    </span>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                    <span className="text-[11px] text-slate-400 block">Occupant Capacity</span>
                    <span className="text-lg font-bold font-mono text-slate-200">
                      {blockDetail.block.occupant_capacity != null ? blockDetail.block.occupant_capacity.toLocaleString() : '—'}
                    </span>
                    <span className="text-[10px] text-slate-500 block font-mono">
                      {blockDetail.block.category.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Activities Breakdown Table */}
                <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-200">
                      Reported Activities for {blockDetail.block.name}
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400">
                      {blockDetail.activities_breakdown.length} active activity types
                    </span>
                  </div>
                  {blockDetail.activities_breakdown.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="px-3 py-2">Activity Code</th>
                            <th className="px-3 py-2">Category & Scope</th>
                            <th className="px-3 py-2 text-right">Standard Quantity</th>
                            <th className="px-3 py-2">Emission Factor</th>
                            <th className="px-3 py-2 text-right">Emissions (kg CO2e)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono">
                          {blockDetail.activities_breakdown.map((act) => (
                            <tr key={act.activity_code} className="hover:bg-slate-800/30">
                              <td className="px-3 py-2 font-semibold text-slate-200">
                                {act.activity_code}
                              </td>
                              <td className="px-3 py-2 font-sans text-slate-400 uppercase text-[10px]">
                                {act.category} • {act.scope.replace('_', ' ')}
                              </td>
                              <td className="px-3 py-2 text-right text-emerald-400">
                                {act.standardized_quantity.toLocaleString()} {act.standardized_unit}
                              </td>
                              <td className="px-3 py-2 text-slate-300">
                                {act.emission_factor_code}
                              </td>
                              <td className="px-3 py-2 text-right font-bold text-slate-100">
                                {act.emissions_kg_co2e.toLocaleString()} kg
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-slate-400 text-xs font-sans">
                      No activity records logged for this block during the selected window.
                    </div>
                  )}
                </div>

                {/* Missing Expectation Indicators */}
                {blockDetail.missing_expected_activities.length > 0 && (
                  <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs space-y-1.5">
                    <div className="font-semibold text-amber-300 flex items-center space-x-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Configured Reporting Expectations Missing:</span>
                    </div>
                    <p className="text-amber-200/80 text-[11px]">
                      This block is configured to record: <strong>{blockDetail.missing_expected_activities.join(', ')}</strong>, but zero readings were submitted during this period.
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: EMISSIONS & ENERGY TRENDS
          ========================================================================= */}
      {activeTab === 'trends' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>Time-Series Trajectory Analysis</span>
                </h3>
                <span className="text-xs text-slate-400">
                  Aggregated chronologically by reporting day or month.
                </span>
              </div>

              {/* Bucket toggle */}
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">Group by:</span>
                <button
                  onClick={() => setTrendGroupBy('day')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    trendGroupBy === 'day'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Day
                </button>
                <button
                  onClick={() => setTrendGroupBy('month')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    trendGroupBy === 'month'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Month
                </button>
              </div>
            </div>

            {trends && trends.data_points.length > 0 ? (
              <div className="space-y-4">
                {!trends.sufficient_data_for_trend && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300 flex items-center space-x-2">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>Single interval detected. Multi-day data entry required to plot continuous slope.</span>
                  </div>
                )}

                {/* Time-series Table */}
                <div className="overflow-x-auto bg-slate-950 border border-slate-800 rounded-lg">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 font-sans">
                      <tr>
                        <th className="px-4 py-3">Period</th>
                        <th className="px-4 py-3 text-right">Scope 1 (kg)</th>
                        <th className="px-4 py-3 text-right">Scope 2 (kg)</th>
                        <th className="px-4 py-3 text-right">Scope 3 (kg)</th>
                        <th className="px-4 py-3 text-right">Total (kg CO2e)</th>
                        <th className="px-4 py-3 text-right">Emissions (t CO2e)</th>
                        <th className="px-4 py-3 text-right">Electricity (kWh)</th>
                        <th className="px-4 py-3 text-center">Data Lineage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {trends.data_points.map((pt) => (
                        <tr key={pt.period} className="hover:bg-slate-800/30">
                          <td className="px-4 py-3 font-semibold text-slate-200">{pt.period}</td>
                          <td className="px-4 py-3 text-right text-amber-400">{pt.scope_1_kg.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-blue-400">{pt.scope_2_kg.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-purple-400">{pt.scope_3_kg.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-200">{pt.total_emissions_kg_co2e.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-400">{pt.total_emissions_t_co2e.toLocaleString()} t</td>
                          <td className="px-4 py-3 text-right text-cyan-400">{pt.electricity_kwh.toLocaleString()}</td>
                          <td className="px-4 py-3 text-center text-[10px] text-slate-400 font-sans">
                            {pt.measured_count} meas / {pt.estimated_count} est
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                <span>No time-series trends available for the selected period.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: DATA QUALITY & SAFEGUARDS
          ========================================================================= */}
      {activeTab === 'quality' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>MRV Completeness & Institutional Safeguards</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Verifies reporting compliance against configured expectations and guarantees zero double-counting.
              </p>
            </div>

            {dataQuality ? (
              <div className="space-y-6">
                {/* Safeguard Verification Badges */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-lg space-y-1">
                    <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Transport Fuel vs Distance</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Strictly prohibits fuel factor multiplication on km logs. Fuel volume required.
                    </p>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-lg space-y-1">
                    <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Generator Fuel Isolation</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Gross generator kWh output produces zero direct emissions. Fuel consumed accounts for Scope 1.
                    </p>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-lg space-y-1">
                    <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Waste Transfer Exclusions</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Internal transfer logs (is_transfer=True) produce zero generation emissions.
                    </p>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-lg space-y-1">
                    <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Wastewater STP Telemetry</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Hydraulic volume alone is uncalculated without BOD/COD lab telemetry.
                    </p>
                  </div>
                </div>

                {/* Blocks with Missing Expectations */}
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-200">
                      Configured Block Reporting Expectations Missing
                    </h4>
                    <span className="text-[10px] text-amber-400 font-mono">
                      {dataQuality.blocks_with_missing_expectations.length} blocks with pending submissions
                    </span>
                  </div>

                  {dataQuality.blocks_with_missing_expectations.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                      {dataQuality.blocks_with_missing_expectations.slice(0, 8).map((b) => (
                        <div key={b.block_id} className="p-2.5 rounded bg-slate-900 border border-slate-800 text-xs space-y-1">
                          <div className="font-semibold text-slate-300">
                            {b.block_name} ({b.block_code})
                          </div>
                          <span className="text-[10px] text-amber-400/90 block">
                            Missing: {b.missing_activities.map((a) => a.activity_code).join(', ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-slate-400 text-xs">
                      All active blocks have fulfilled configured reporting expectations!
                    </div>
                  )}
                </div>

                {/* Uncalculated Records Explanations */}
                {dataQuality.uncalculated_activity_records_count > 0 && (
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2">
                    <h4 className="text-xs font-semibold text-slate-200">
                      Uncalculated Ledger Records Rationale ({dataQuality.uncalculated_activity_records_count} total)
                    </h4>
                    <div className="space-y-1.5 text-xs">
                      {dataQuality.uncalculated_records_details.slice(0, 4).map((ur, idx) => (
                        <div key={idx} className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] flex items-center justify-between">
                          <span className="font-mono text-slate-300">{ur.reporting_date}: {ur.quantity} {ur.unit}</span>
                          <span className="text-amber-400 font-medium text-[10px]">{ur.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
