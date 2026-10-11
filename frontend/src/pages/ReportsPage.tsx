import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText,
  Calendar,
  Building,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Zap,
  Flame,
  Trash2,
  Layers,
  Filter,
  Info,
  FileSpreadsheet,
} from 'lucide-react';
import { apiClient } from '../api/client';
import {
  DashboardMetricsResponse,
  CategoryEmissionsResponse,
  BlockEmissionsResponse,
  DataQualityResponse,
  CampusBlock,
} from '../types';

export const ReportsPage: React.FC = () => {
  // Period and Block Filter State
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedBlockId, setSelectedBlockId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'scopes' | 'blocks' | 'factors' | 'safeguards'>('scopes');

  // Master Data
  const [blocks, setBlocks] = useState<CampusBlock[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetricsResponse | null>(null);
  const [categories, setCategories] = useState<CategoryEmissionsResponse | null>(null);
  const [blockEmissions, setBlockEmissions] = useState<BlockEmissionsResponse | null>(null);
  const [dataQuality, setDataQuality] = useState<DataQualityResponse | null>(null);

  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [exportingCsv, setExportingCsv] = useState<boolean>(false);
  const [exportingPdf, setExportingPdf] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Load Campus Blocks
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const loadBlocks = async () => {
      try {
        const res = await apiClient.getBlocks();
        setBlocks(res.items);
      } catch {
        // Ignored for block selector
      }
    };
    loadBlocks();
  }, []);

  // ---------------------------------------------------------------------------
  // Fetch Report Disclosure Data
  // ---------------------------------------------------------------------------
  const fetchReportData = useCallback(async () => {
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
        block_id: selectedBlockId || undefined,
      };

      const [metricsRes, catRes, blkRes, qualityRes] = await Promise.all([
        apiClient.getDashboardMetrics(params),
        apiClient.getEmissionsByCategory(params),
        apiClient.getEmissionsByBlock({
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        }),
        apiClient.getDataQuality({
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        }),
      ]);

      setMetrics(metricsRes);
      setCategories(catRes);
      setBlockEmissions(blkRes);
      setDataQuality(qualityRes);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch reporting disclosures');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedBlockId]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // ---------------------------------------------------------------------------
  // Date Preset Handlers
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Export Handlers
  // ---------------------------------------------------------------------------
  const handleDownloadCsv = async () => {
    try {
      setExportingCsv(true);
      setErrorMsg(null);
      await apiClient.downloadCsvReport({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        block_id: selectedBlockId || undefined,
      });
      setExportSuccessMsg('Audit CSV export generated and downloaded successfully.');
      setTimeout(() => setExportSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to download CSV export');
    } finally {
      setExportingCsv(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setExportingPdf(true);
      setErrorMsg(null);
      await apiClient.downloadPdfReport({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        block_id: selectedBlockId || undefined,
      });
      setExportSuccessMsg('Executive PDF summary report generated and downloaded successfully.');
      setTimeout(() => setExportSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to download PDF summary report');
    } finally {
      setExportingPdf(false);
    }
  };

  const selectedBlockName = useMemo(() => {
    if (!selectedBlockId) return 'All Campus Blocks (Campus-Wide)';
    const b = blocks.find((blk) => blk.id === selectedBlockId);
    return b ? `${b.name} (${b.code})` : 'Selected Block';
  }, [blocks, selectedBlockId]);

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
          </div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-3">
            <span>Sustainability & GHG Reporting Disclosures</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              GHG Protocol Corporate Standard
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Audit-grade executive greenhouse gas disclosures, Scope 1/2/3 inventories, and exportable compliance records.
          </p>
        </div>

        {/* Export Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleDownloadCsv}
            disabled={exportingCsv || loading}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition-all disabled:opacity-50 shadow-sm"
            title="Download RFC 4180 audit trail with factor citations"
          >
            <FileSpreadsheet className={`w-4 h-4 text-emerald-400 ${exportingCsv ? 'animate-spin' : ''}`} />
            <span>{exportingCsv ? 'Generating CSV...' : 'Download CSV Export'}</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={exportingPdf || loading}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50"
            title="Download structured ReportLab executive summary PDF"
          >
            <FileText className={`w-4 h-4 ${exportingPdf ? 'animate-spin' : ''}`} />
            <span>{exportingPdf ? 'Compiling PDF...' : 'Download Executive PDF'}</span>
          </button>
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

      {exportSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-emerald-300 text-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{exportSuccessMsg}</span>
          </div>
          <button onClick={() => setExportSuccessMsg(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* 3. Reporting Filter & Scope Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-md">
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

          <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => handlePreset('last7')}
              className="px-2.5 py-1 text-[11px] rounded font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              7 Days
            </button>
            <button
              onClick={() => handlePreset('last30')}
              className="px-2.5 py-1 text-[11px] rounded font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              30 Days
            </button>
            <button
              onClick={() => handlePreset('ytd')}
              className="px-2.5 py-1 text-[11px] rounded font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              YTD
            </button>
            <button
              onClick={() => handlePreset('all')}
              className={`px-2.5 py-1 text-[11px] rounded font-medium transition-colors ${
                !startDate && !endDate
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              All Records
            </button>
          </div>
        </div>

        {/* Block Scope Selector */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
            <Filter className="w-4 h-4 text-emerald-400" />
            <span>Boundary:</span>
          </div>
          <select
            value={selectedBlockId}
            onChange={(e) => setSelectedBlockId(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="">Campus-Wide (All 27 Blocks)</option>
            {blocks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>

          <button
            onClick={() => fetchReportData()}
            disabled={loading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Refresh Report Data"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4. Executive Summary KPI Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Emissions */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Gross Campus Footprint</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {metrics?.has_data ? `${metrics.total_emissions_t_co2e.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })} t` : '—'}
          </div>
          <div className="text-xs text-slate-400 mt-1 font-mono">
            {metrics?.has_data ? `${metrics.total_emissions_kg_co2e.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg CO₂e` : 'No calculated data'}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>Reporting Boundary:</span>
            <span className="text-slate-300 font-medium truncate max-w-[140px]">{selectedBlockName}</span>
          </div>
        </div>

        {/* Scope 1 Combustion */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Scope 1 (Direct Fuel)</span>
            <Flame className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {metrics?.has_data ? `${metrics.scope_1_kg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg` : '—'}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {metrics?.has_data && metrics.total_emissions_kg_co2e > 0
              ? `${((metrics.scope_1_kg / metrics.total_emissions_kg_co2e) * 100).toFixed(1)}% of gross footprint`
              : 'LPG, Diesel, Petrol'}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>Methodology:</span>
            <span className="text-slate-300">IPCC 2006 Tier 1</span>
          </div>
        </div>

        {/* Scope 2 Electricity */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Scope 2 (Electricity)</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {metrics?.has_data ? `${metrics.scope_2_kg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg` : '—'}
          </div>
          <div className="text-xs text-slate-400 mt-1 font-mono">
            {metrics?.has_data ? `${metrics.total_electricity_kwh.toLocaleString()} kWh managed` : 'Purchased Grid Power'}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>Factor Source:</span>
            <span className="text-slate-300">CEA v19 (0.716 kg/kWh)</span>
          </div>
        </div>

        {/* Scope 3 Waste */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Scope 3 (Waste Streams)</span>
            <Trash2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {metrics?.has_data ? `${metrics.scope_3_kg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg` : '—'}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {metrics?.has_data && metrics.total_emissions_kg_co2e > 0
              ? `${((metrics.scope_3_kg / metrics.total_emissions_kg_co2e) * 100).toFixed(1)}% of gross footprint`
              : 'Composted food & solid waste'}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>Measured Coverage:</span>
            <span className="text-emerald-400 font-mono font-medium">{metrics?.measured_coverage_pct || 0}%</span>
          </div>
        </div>
      </div>

      {/* 5. Navigation Tabs */}
      <div className="border-b border-slate-800 flex items-center space-x-2">
        <button
          onClick={() => setActiveTab('scopes')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center space-x-2 ${
            activeTab === 'scopes'
              ? 'border-emerald-500 text-emerald-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>GHG Protocol Scope Disclosures</span>
        </button>

        <button
          onClick={() => setActiveTab('blocks')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center space-x-2 ${
            activeTab === 'blocks'
              ? 'border-emerald-500 text-emerald-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>Campus Block Inventories (27 Blocks)</span>
        </button>

        <button
          onClick={() => setActiveTab('factors')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center space-x-2 ${
            activeTab === 'factors'
              ? 'border-emerald-500 text-emerald-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Authoritative Factor Schedule</span>
        </button>

        <button
          onClick={() => setActiveTab('safeguards')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center space-x-2 ${
            activeTab === 'safeguards'
              ? 'border-emerald-500 text-emerald-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>MRV Safeguards & Integrity</span>
        </button>
      </div>

      {/* 6. Tab Content */}

      {/* Tab A: GHG Protocol Scope Disclosures */}
      {activeTab === 'scopes' && (
        <div className="space-y-6">
          {/* Institutional Compliance Notice */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start space-x-3 text-xs text-slate-300">
            <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-white">GHG Accounting Protocol Compliance</span>
              <p className="text-slate-400 leading-relaxed">
                This report consolidates operational greenhouse gas emissions for Amrita Vishwa Vidyapeetham (Coimbatore Campus).
                All calculations are executed deterministically using activity data multiplied by verified emission factors.
                Historical calculations remain immutable and protected against retrospective factor drift.
              </p>
            </div>
          </div>

          {/* Activity Category Breakdown Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Emissions by Activity Category</h3>
                <p className="text-xs text-slate-400">Institutional summary across monitored utility and consumption streams</p>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                {categories?.items.length || 0} Categories Monitored
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800 text-[10px]">
                  <tr>
                    <th className="py-3 px-6">Category</th>
                    <th className="py-3 px-4">GHG Scope</th>
                    <th className="py-3 px-4 text-right">Records (Total / Measured)</th>
                    <th className="py-3 px-4 text-right">Emissions (kg CO₂e)</th>
                    <th className="py-3 px-4 text-right">Emissions (t CO₂e)</th>
                    <th className="py-3 px-6 text-right">Share of Campus Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {categories && categories.items.length > 0 ? (
                    categories.items.map((cat) => {
                      const scopeBadge =
                        cat.category === 'electricity'
                          ? 'Scope 2'
                          : cat.category === 'fuel'
                          ? 'Scope 1'
                          : 'Scope 3';

                      const scopeColor =
                        cat.category === 'electricity'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : cat.category === 'fuel'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

                      return (
                        <tr key={cat.category} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3.5 px-6 font-sans font-semibold text-slate-200 capitalize flex items-center space-x-2">
                            {cat.category === 'electricity' && <Zap className="w-3.5 h-3.5 text-amber-400" />}
                            {cat.category === 'fuel' && <Flame className="w-3.5 h-3.5 text-rose-400" />}
                            {cat.category.includes('waste') && <Trash2 className="w-3.5 h-3.5 text-emerald-400" />}
                            <span>{cat.category_name || cat.category.replace('_', ' ')}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${scopeColor}`}>
                              {scopeBadge}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-300">
                            {cat.record_count.toLocaleString()} ({cat.measured_count} metered)
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-100 font-bold">
                            {cat.emissions_kg_co2e.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-300">
                            {cat.emissions_t_co2e.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                          </td>
                          <td className="py-3.5 px-6 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-emerald-400 h-1.5 rounded-full"
                                  style={{ width: `${Math.min(100, cat.percentage_of_total)}%` }}
                                />
                              </div>
                              <span className="text-slate-300 w-10 text-right">{cat.percentage_of_total}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                        No category calculation records found for the selected reporting period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab B: Campus Block Inventories */}
      {activeTab === 'blocks' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Campus Block Footprint & Intensity</h3>
                <p className="text-xs text-slate-400">Carbon accounting breakdown across all 27 campus facilities</p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Sorted by Total Emissions (High to Low)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800 text-[10px]">
                  <tr>
                    <th className="py-3 px-6">Block Code</th>
                    <th className="py-3 px-4">Block Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Floor Area (m²)</th>
                    <th className="py-3 px-4 text-right">Occupants</th>
                    <th className="py-3 px-4 text-right">Gross Emissions (kg CO₂e)</th>
                    <th className="py-3 px-4 text-right">Carbon Intensity (kg/m²)</th>
                    <th className="py-3 px-6 text-right">Intensity (kg/person)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {blockEmissions && blockEmissions.items.length > 0 ? (
                    blockEmissions.items.map((b) => (
                      <tr key={b.block_id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-6 font-bold text-emerald-400">
                          {b.block_code}
                        </td>
                        <td className="py-3.5 px-4 font-sans font-medium text-slate-200">
                          {b.block_name}
                        </td>
                        <td className="py-3.5 px-4 capitalize font-sans text-slate-400">
                          {b.block_category.replace('_', ' ')}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-400">
                          {b.floor_area_sqm ? b.floor_area_sqm.toLocaleString() : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-400">
                          {b.occupant_capacity ? b.occupant_capacity.toLocaleString() : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-100 font-bold">
                          {b.total_emissions_kg_co2e.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-300">
                          {b.emissions_per_sqm != null ? b.emissions_per_sqm.toFixed(2) : '—'}
                        </td>
                        <td className="py-3.5 px-6 text-right text-slate-300">
                          {b.emissions_per_occupant != null ? b.emissions_per_occupant.toFixed(2) : '—'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500 font-sans">
                        No block activity or emissions records registered for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab C: Authoritative Factor Schedule */}
      {activeTab === 'factors' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Authoritative Emission Factor Schedule</h3>
                <p className="text-xs text-slate-400">Traceable statutory and international greenhouse gas factor coefficients</p>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                Traceable & Audit-Ready
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800 text-[10px]">
                  <tr>
                    <th className="py-3 px-6">Domain / Activity</th>
                    <th className="py-3 px-4">Factor Value</th>
                    <th className="py-3 px-4">Unit</th>
                    <th className="py-3 px-4">Authority & Source</th>
                    <th className="py-3 px-4">Geography / Grid</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-6">Methodology Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  <tr className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-slate-200">
                      Grid Electricity Consumption
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                      0.7160
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      kg CO₂e / kWh
                    </td>
                    <td className="py-3.5 px-4 text-slate-200">
                      Central Electricity Authority (CEA)
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      Southern Regional Grid (India)
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Verified (v19.0)
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-slate-400 text-[11px]">
                      CEA CO₂ Baseline Database for the Indian Power Sector, User Guide v19.0 (Dec 2023)
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-slate-200">
                      LPG Stationary Combustion
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-rose-400">
                      2.9830
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      kg CO₂e / kg
                    </td>
                    <td className="py-3.5 px-4 text-slate-200">
                      IPCC Guidelines (2006)
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      National Default (India)
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Verified
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-slate-400 text-[11px]">
                      IPCC 2006 Guidelines for National GHG Inventories, Vol 2 Energy, Stationary Combustion Tier 1
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-slate-200">
                      Diesel Fuel Combustion (Generators)
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-rose-400">
                      2.6800
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      kg CO₂e / Litre
                    </td>
                    <td className="py-3.5 px-4 text-slate-200">
                      IPCC Guidelines (2006)
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      India
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Verified
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-slate-400 text-[11px]">
                      IPCC 2006 Vol 2 Energy: Stationary / Mobile Diesel Fuel (Calculated from NCV 43.0 TJ/Gg)
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-slate-200">
                      Petrol Fuel Combustion
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-rose-400">
                      2.3100
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      kg CO₂e / Litre
                    </td>
                    <td className="py-3.5 px-4 text-slate-200">
                      IPCC Guidelines (2006)
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      India
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Verified
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-slate-400 text-[11px]">
                      IPCC 2006 Vol 2 Energy: Motor Gasoline Combustion Tier 1
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-slate-200">
                      Food & Organic Waste (Aerobic Composting)
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-400">
                      0.1900
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      kg CO₂e / kg
                    </td>
                    <td className="py-3.5 px-4 text-slate-200">
                      IPCC Guidelines (2006)
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      Biological Treatment
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Verified
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-slate-400 text-[11px]">
                      IPCC 2006 Vol 5 Waste, Biological Treatment of Solid Waste, Tier 1 (4 g CH₄ + 0.24 g N₂O / kg)
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-slate-200">
                      Mixed Solid Waste (Unmanaged Landfill)
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-400">
                      0.4500
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      kg CO₂e / kg
                    </td>
                    <td className="py-3.5 px-4 text-slate-200">
                      IPCC Guidelines (2006)
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      Solid Waste Disposal
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Provisional
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-slate-400 text-[11px]">
                      IPCC 2006 Vol 5 Waste, SWDS Tier 1 default methane generation potential
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab D: MRV Safeguards & Integrity */}
      {activeTab === 'safeguards' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
              <div className="flex items-center space-x-2 text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
                <h4 className="text-sm font-bold text-white">Institutional Safeguards Active</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                The calculation and reporting engines enforce strict institutional guardrails to prevent double-counting and improper proxy accounting:
              </p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>No Distance Proxies:</strong> Vehicle fuel is calculated exclusively on physical fuel purchase litres, not odometer approximations.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Generator Gross Separation:</strong> Generator electricity output (kWh) is excluded from grid multiplication to prevent double-counting fuel combustion.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Water Transfer Exclusion:</strong> Internal inter-tank and pump transfers are tagged and isolated from intake accounting.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>STP Volume Safeguard:</strong> Untreated wastewater volume is blocked from emission multiplying without certified COD/BOD lab test reports.</span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
              <div className="flex items-center space-x-2 text-amber-400">
                <AlertCircle className="w-5 h-5" />
                <h4 className="text-sm font-bold text-white">Data Completeness & Audit Status</h4>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">Total Uncalculated Activity Records:</span>
                  <span className="font-mono font-bold text-slate-200">
                    {dataQuality?.uncalculated_activity_records_count || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">Measured vs Estimated Ratio:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {metrics?.measured_coverage_pct || 0}% Measured
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">Reporting Block Coverage:</span>
                  <span className="font-mono font-bold text-slate-200">
                    {metrics?.reporting_blocks_count || 0} / {metrics?.active_blocks_count || 27} Blocks ({metrics?.reporting_coverage_pct || 0}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Disclaimer & MRV Footnote */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>
            CampusCarbon AI • Amrita Vishwa Vidyapeetham Digital MRV System • Standards Compliant (GHG Protocol Corporate Standard)
          </span>
        </div>
        <span className="font-mono text-slate-600">
          Generated: {new Date().toLocaleDateString()}
        </span>
      </div>
    </div>
  );
};
