import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Globe2,
  Leaf,
  Target,
  FileCheck2,
  TrendingDown,
  ShieldCheck,
  Building,
  Download,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ExternalLink,
  RefreshCw,
  Info,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { SDGEmblem } from '../components/common/SDGEmblem';
import {
  SustainabilitySummary,
  SDGItem,
  SustainabilityRecommendationItem,
  InstitutionalEvidenceItem,
  RecommendationStatus,
} from '../types';

export const SustainabilityPage: React.FC = () => {
  const [summary, setSummary] = useState<SustainabilitySummary | null>(null);
  const [sdgs, setSdgs] = useState<SDGItem[]>([]);
  const [recommendations, setRecommendations] = useState<SustainabilityRecommendationItem[]>([]);
  const [evidenceItems, setEvidenceItems] = useState<InstitutionalEvidenceItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'sdgs' | 'recommendations' | 'evidence' | 'data_quality'>('sdgs');

  // Filters for recommendations
  const [recCategoryFilter, setRecCategoryFilter] = useState<string>('all');
  const [recStatusFilter, setRecStatusFilter] = useState<string>('all');
  const [updatingRecId, setUpdatingRecId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected SDG for drill-down modal/drawer
  const [selectedSdg, setSelectedSdg] = useState<SDGItem | null>(null);

  // Download PDF report state
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const sum = await apiClient.getSustainabilitySummary();
      setSummary(sum);
      setSdgs(sum.sdgs || []);
      setRecommendations(sum.priority_recommendations || []);
      setEvidenceItems(sum.institutional_evidence_items || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load sustainability metrics.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = async (recId: string, newStatus: RecommendationStatus) => {
    setUpdatingRecId(recId);
    try {
      const updated = await apiClient.updateRecommendationStatus(recId, newStatus);
      setRecommendations((prev) =>
        prev.map((r) => (r.id === recId ? { ...r, status: updated.status } : r))
      );
      showToast(`Recommendation status changed to "${newStatus.replace('_', ' ')}".`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update recommendation status.');
    } finally {
      setUpdatingRecId(null);
    }
  };

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      await apiClient.downloadPdfReport();
      showToast('Executive Sustainability & Carbon Audit PDF downloaded successfully.');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to generate PDF report.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const filteredRecommendations = useMemo(() => {
    return recommendations.filter((r) => {
      const matchCat = recCategoryFilter === 'all' || r.category === recCategoryFilter;
      const matchStat = recStatusFilter === 'all' || r.status === recStatusFilter;
      return matchCat && matchStat;
    });
  }, [recommendations, recCategoryFilter, recStatusFilter]);

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'critical':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'high':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'medium':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'in_progress':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'approved':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'rejected':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      default:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
  };

  const getSdgColor = (num: number) => {
    switch (num) {
      case 6:
        return '#26BDE2';
      case 7:
        return '#FCC30B';
      case 11:
        return '#FD9D24';
      case 12:
        return '#BF8B2E';
      case 13:
        return '#3F7E44';
      case 15:
        return '#56C02B';
      default:
        return '#10B981';
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-200 text-xs shadow-lg flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/30 border border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Globe2 className="w-4 h-4" />
            <span>Institutional Sustainability & UN SDG Framework</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100">
            Sustainability & Decarbonization Roadmap
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Amrita Vishwa Vidyapeetham — Coimbatore Campus (`AVV-CBE`). Verified GHG accounting,
            NAAC Criteria 7 & NIRF Green Campus institutional evidence, and deterministic decarbonization pathways.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors flex items-center space-x-2 border border-slate-700/60"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors flex items-center space-x-2 shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExportingPdf ? 'Generating PDF...' : 'Executive Audit PDF'}</span>
          </button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* High-Level Institutional Impact KPIs */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Gross Compliance Emissions */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-medium uppercase tracking-wider">Gross GHG Footprint</span>
              <Building className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-bold text-slate-100">
              {summary.gross_emissions_t_co2e > 0
                ? `${summary.gross_emissions_t_co2e.toLocaleString()} t`
                : '0.00 t'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Scope 1: {summary.scope_1_t}t · Scope 2: {summary.scope_2_t}t
            </div>
          </div>

          {/* Biological Sequestration Sink */}
          <div className="p-4 rounded-xl bg-slate-900 border border-emerald-900/30 bg-emerald-950/10 shadow-sm">
            <div className="flex items-center justify-between text-emerald-400 mb-2">
              <span className="text-[11px] font-medium uppercase tracking-wider">Biomass Sequestration</span>
              <Leaf className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-300">
              {summary.biological_sequestration_t_co2e.toFixed(2)} t/yr
            </div>
            <div className="text-[11px] text-emerald-600/80 mt-1">
              {summary.standing_trees_count.toLocaleString()} Trees · Strict Isolated Sink
            </div>
          </div>

          {/* Potential Decarbonization */}
          <div className="p-4 rounded-xl bg-slate-900 border border-cyan-900/30 bg-cyan-950/10 shadow-sm">
            <div className="flex items-center justify-between text-cyan-400 mb-2">
              <span className="text-[11px] font-medium uppercase tracking-wider">Reduction Potential</span>
              <TrendingDown className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-cyan-300">
              {summary.potential_reduction_t_co2e.toFixed(1)} t/yr
            </div>
            <div className="text-[11px] text-cyan-600/80 mt-1">
              {summary.recommendations_count} Active Interventions
            </div>
          </div>

          {/* Active UN SDGs */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-medium uppercase tracking-wider">UN SDGs Aligned</span>
              <Target className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-slate-100">
              6 Goals
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              SDGs 6, 7, 11, 12, 13, 15
            </div>
          </div>

          {/* Institutional Evidence Verified */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-medium uppercase tracking-wider">Audit Evidence</span>
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-slate-100">
              {evidenceItems.length} Artifacts
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              NIRF & NAAC Green Campus
            </div>
          </div>
        </div>
      )}

      {/* Main Tabbed Interface */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('sdgs')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'sdgs'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span>UN SDG Alignment ({sdgs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('recommendations')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'recommendations'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Decarbonization Pathways ({recommendations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('evidence')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'evidence'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>NAAC & NIRF Evidence ({evidenceItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('data_quality')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'data_quality'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Data Quality & Audit Gaps</span>
          </button>
        </div>

        {/* TAB 1: UN SDG ALIGNMENT */}
        {activeTab === 'sdgs' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-100">
                  Amrita Coimbatore SDG Alignment Framework
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Predefined mappings to United Nations Sustainable Development Goals, specific indicators, and institutional implementation.
                </p>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                Framework: UN Agenda 2030 / THE Impact
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sdgs.map((s) => {
                const borderHex = getSdgColor(s.sdg_number);
                return (
                  <div
                    key={s.sdg_number}
                    className="p-5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between group shadow-sm"
                  >
                    <div>
                      {/* SDG Header & Visual Emblem */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center space-x-3">
                          <SDGEmblem sdgNumber={s.sdg_number} size="md" />
                          <div>
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm inline-block"
                              style={{ backgroundColor: borderHex }}
                            >
                              SDG {s.sdg_number}
                            </span>
                            <h4 className="text-sm font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors mt-1">
                              {s.title}
                            </h4>
                          </div>
                        </div>
                        <span className="text-[11px] font-medium text-slate-400 shrink-0">
                          {s.targets?.length || 0} Targets
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                        {s.institutional_relevance}
                      </p>

                      {/* Targets List */}
                      <div className="mt-4 pt-3 border-t border-slate-900 space-y-2">
                        {s.targets?.slice(0, 2).map((t) => (
                          <div key={t.target_code} className="text-[11px] text-slate-300">
                            <span className="font-semibold text-emerald-400">Target {t.target_code}: </span>
                            <span className="text-slate-400">{t.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedSdg(s)}
                      className="mt-4 w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center justify-center space-x-1.5 border border-slate-800"
                    >
                      <span>View Specific Indicators</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: DECARBONIZATION RECOMMENDATIONS */}
        {activeTab === 'recommendations' && (
          <div className="space-y-6">
            {/* Filter toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Category:</span>
                </div>
                <select
                  value={recCategoryFilter}
                  onChange={(e) => setRecCategoryFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">All Categories</option>
                  <option value="energy_efficiency">Energy Efficiency</option>
                  <option value="renewable_energy">Renewable Energy</option>
                  <option value="waste_management">Waste Management</option>
                  <option value="water_conservation">Water Conservation</option>
                  <option value="green_transport">Green Transport</option>
                  <option value="afforestation">Afforestation</option>
                </select>

                <div className="flex items-center space-x-2 text-xs text-slate-400 ml-2">
                  <span>Status:</span>
                </div>
                <select
                  value={recStatusFilter}
                  onChange={(e) => setRecStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="proposed">Proposed</option>
                  <option value="approved">Approved</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="text-xs text-slate-500 font-mono">
                Showing {filteredRecommendations.length} of {recommendations.length} recommendations
              </div>
            </div>

            {/* Recommendations List */}
            <div className="space-y-4">
              {filteredRecommendations.map((r) => (
                <div
                  key={r.id}
                  className="p-5 rounded-xl bg-slate-950 border border-slate-800/90 hover:border-slate-700 transition-all space-y-4 shadow-sm"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getPriorityBadge(r.priority)}`}>
                          {r.priority.toUpperCase()} PRIORITY
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {r.category.replace('_', ' ').toUpperCase()}
                        </span>
                        {r.block_name && (
                          <span className="text-[10px] text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                            Block: {r.block_name}
                          </span>
                        )}
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${getStatusBadge(r.status)}`}>
                          {r.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <h4 className="text-base font-semibold text-slate-100">
                        {r.title}
                      </h4>
                    </div>

                    {/* Potential Reduction Pill & Status Selector */}
                    <div className="flex items-center space-x-3 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-base font-bold text-emerald-400">
                          {r.potential_co2e_reduction_t_year ? `-${r.potential_co2e_reduction_t_year.toFixed(1)} t CO₂e/yr` : '—'}
                        </div>
                        <div className="text-[10px] text-slate-500">Projected Avoidance</div>
                      </div>

                      <select
                        value={r.status}
                        disabled={updatingRecId === r.id}
                        onChange={(e) => handleStatusChange(r.id, e.target.value as RecommendationStatus)}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-500"
                      >
                        <option value="proposed">Proposed</option>
                        <option value="approved">Approved</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                  </div>

                  {/* Proposed Action */}
                  <div className="text-xs text-slate-300 leading-relaxed bg-slate-900/40 p-3 rounded-lg border border-slate-900">
                    <span className="font-semibold text-slate-200">Action Plan: </span>
                    {r.proposed_action}
                  </div>

                  {/* Supporting Evidence, Explicit Formula & Related SDGs */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] pt-1">
                    <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-900">
                      <div className="font-semibold text-slate-400 mb-1 flex items-center space-x-1">
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>Supporting Audit Evidence:</span>
                      </div>
                      <div className="text-slate-300">{r.supporting_evidence}</div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-900">
                      <div className="font-semibold text-slate-400 mb-1 flex items-center space-x-1">
                        <Info className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Deterministic Formula:</span>
                      </div>
                      <div className="font-mono text-cyan-300 text-[10px]">{r.calculation_rationale}</div>
                      <div className="text-slate-500 text-[10px] mt-1 italic">{r.assumptions}</div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-900">
                      <div className="font-semibold text-slate-400 mb-1 flex items-center space-x-1">
                        <Globe2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>UN SDGs Supported:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {r.related_sdgs?.map((num) => (
                          <span
                            key={num}
                            className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-xs"
                            style={{ backgroundColor: getSdgColor(num) }}
                          >
                            SDG {num}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: INSTITUTIONAL EVIDENCE (NIRF / NAAC) */}
        {activeTab === 'evidence' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-100">
                  Institutional Evidence Registry & Regulatory Audits
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Traceable documentation supporting NAAC Criteria 7 (Institutional Values & Best Practices) and NIRF Green Campus rankings.
                </p>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                Audited & Archived
              </span>
            </div>

            <div className="space-y-3">
              {evidenceItems.map((e) => (
                <div
                  key={e.id}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {e.reference_number}
                      </span>
                      <span className="text-xs font-semibold text-slate-200">
                        {e.title}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {e.verification_status.toUpperCase()}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {e.reporting_period}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {e.description}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-900 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-slate-500">Framework Tags:</span>
                      {e.framework_tags?.map((t) => (
                        <span key={t} className="text-[10px] bg-slate-900 text-slate-300 px-2 py-0.5 rounded border border-slate-800">
                          {t}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-slate-500 font-mono">{e.document_url_or_ref}</span>
                      <span className="text-[10px] text-emerald-400 flex items-center space-x-1">
                        <FileCheck2 className="w-3 h-3" />
                        <span>Verified in Vault</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: DATA QUALITY & AUDIT GAPS */}
        {activeTab === 'data_quality' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Campus Data Quality & Verification Audit
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluation of data quality levels across the 27 campus blocks. Zero measurements are distinguished from unverified or unknown parameters.
              </p>
            </div>

            {/* Quality Summary Cards */}
            {summary?.data_quality_breakdown && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-900/40">
                  <div className="text-[11px] font-medium text-emerald-400">Verified</div>
                  <div className="text-xl font-bold text-slate-100 mt-1">
                    {summary.data_quality_breakdown.verified || 0}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Physical sub-metered / lab</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-blue-900/40">
                  <div className="text-[11px] font-medium text-blue-400">User Provided</div>
                  <div className="text-xl font-bold text-slate-100 mt-1">
                    {summary.data_quality_breakdown.user_provided || 0}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Estate log declaration</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-900/40">
                  <div className="text-[11px] font-medium text-amber-400">Estimated</div>
                  <div className="text-xl font-bold text-slate-100 mt-1">
                    {summary.data_quality_breakdown.estimated || 0}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Benchmarked proxy</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[11px] font-medium text-slate-400">Awaiting Audit</div>
                  <div className="text-xl font-bold text-slate-100 mt-1">
                    {summary.data_quality_breakdown.awaiting_verification || 0}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Physical audit queued</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[11px] font-medium text-slate-500">Not Applicable</div>
                  <div className="text-xl font-bold text-slate-100 mt-1">
                    {summary.data_quality_breakdown.not_applicable || 0}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Open sites / unmetered</div>
                </div>
              </div>
            )}

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
              <div className="font-semibold text-slate-200 flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Auditing Safeguard Principles:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                <li><b className="text-slate-300">Zero vs Unknown:</b> An unmetered facility is flagged as <code>awaiting_verification</code>, never logged as 0 kg CO₂e.</li>
                <li><b className="text-slate-300">Sink Segregation:</b> Living tree biomass sequestration (22.51 t CO₂e/yr) is maintained as an isolated carbon sink and is never subtracted from compliance gross emissions.</li>
                <li><b className="text-slate-300">Traceable Factors:</b> CEA User Guide v19.0 (0.716 kg CO₂e/kWh) and IPCC 2006 stationary combustion guidelines are version-pinned in PostgreSQL.</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Modal: SDG Target & Indicator Details */}
      {selectedSdg && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3.5">
                <SDGEmblem sdgNumber={selectedSdg.sdg_number} size="sm" />
                <div>
                  <div className="flex items-center space-x-2">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold text-white"
                      style={{ backgroundColor: getSdgColor(selectedSdg.sdg_number) }}
                    >
                      SDG {selectedSdg.sdg_number}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">UN Agenda 2030</span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-100 mt-0.5">
                    {selectedSdg.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedSdg(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Amrita Coimbatore Institutional Relevance
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800">
                  {selectedSdg.institutional_relevance}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Mapped UN Targets & Campus Indicators
                </h4>
                <div className="space-y-3">
                  {selectedSdg.targets?.map((t) => (
                    <div key={t.target_code} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="text-xs font-bold text-emerald-400">
                        Target {t.target_code}: <span className="text-slate-200 font-semibold">{t.title}</span>
                      </div>
                      <div className="space-y-2 pt-1">
                        {t.indicators?.map((ind) => (
                          <div key={ind.indicator_code} className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-[11px] space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-cyan-400 font-semibold">{ind.indicator_code}</span>
                              <span className="text-slate-500">{ind.metric_unit}</span>
                            </div>
                            <div className="font-medium text-slate-200">{ind.name}</div>
                            <div className="text-slate-400">{ind.description}</div>
                            <div className="text-emerald-400 text-[10px]">
                              <b>Campus Application: </b>{ind.campus_applicability}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex justify-end">
              <button
                onClick={() => setSelectedSdg(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
