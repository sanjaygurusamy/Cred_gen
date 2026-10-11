import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Target,
  TrendingDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building,
  RotateCcw,
  Sparkles,
  Filter,
  Search,
} from 'lucide-react';
import { apiClient } from '../api/client';
import {
  SustainabilityRecommendationItem,
  RecommendationStatus,
} from '../types';

export const MRVProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<SustainabilityRecommendationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusTab, setStatusTab] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Updating status indicator
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const recs = await apiClient.getRecommendations();
      setProjects(recs);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve decarbonization projects.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleStatusUpdate = async (projectId: string, newStatus: RecommendationStatus) => {
    setUpdatingId(projectId);
    try {
      const updated = await apiClient.updateRecommendationStatus(projectId, newStatus);
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, status: updated.status } : p))
      );
      setToastMsg(`Project status transitioned to "${newStatus.replace('_', ' ')}".`);
      setTimeout(() => setToastMsg(null), 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update intervention status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchSearch =
        searchQuery === '' ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.block_name && p.block_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        p.proposed_action.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = statusTab === 'all' || p.status === statusTab;
      const matchCategory = categoryFilter === 'all' || p.category === categoryFilter;
      const matchPriority = priorityFilter === 'all' || p.priority === priorityFilter;

      return matchSearch && matchStatus && matchCategory && matchPriority;
    });
  }, [projects, searchQuery, statusTab, categoryFilter, priorityFilter]);

  const totalAvoidance = useMemo(() => {
    return projects.reduce((acc, p) => acc + (p.potential_co2e_reduction_t_year || 0), 0);
  }, [projects]);

  const inProgressCount = useMemo(() => {
    return projects.filter((p) => p.status === 'in_progress').length;
  }, [projects]);

  const approvedCount = useMemo(() => {
    return projects.filter((p) => p.status === 'approved').length;
  }, [projects]);

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
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

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <Building className="w-4 h-4" />
            <span>Amrita Vishwa Vidyapeetham</span>
            <span className="text-slate-600">•</span>
            <span>Coimbatore Campus (AVV-CBE)</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-3">
            <span>Decarbonization Intervention Pipeline & Digital MRV</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              GHG Protocol Mitigation
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Measurement, Reporting, and Verification lifecycle management for commissioned campus emission reduction projects and verified avoidance telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchProjects()}
            disabled={isLoading}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-colors"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Pipeline</span>
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">✕</button>
        </div>
      )}

      {/* 2. Statistical Pipeline Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Total Interventions</span>
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-2xl font-bold font-mono text-slate-100 block mt-1">
            {projects.length} Projects
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Active mitigation portfolio
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Total Avoidance Potential</span>
            <TrendingDown className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-2xl font-bold font-mono text-emerald-400 block mt-1">
            {totalAvoidance.toLocaleString()} t
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            t CO₂e/year GHG reduction
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">In Active Implementation</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-2xl font-bold font-mono text-amber-400 block mt-1">
            {inProgressCount} Interventions
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Under active commissioning
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Approved for Execution</span>
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="text-2xl font-bold font-mono text-cyan-400 block mt-1">
            {approvedCount} Projects
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Ready for engineering rollout
          </span>
        </div>
      </div>

      {/* 3. Pipeline Lifecycle Tabs */}
      <div className="flex items-center border-b border-slate-800 space-x-4 text-xs overflow-x-auto">
        {[
          { key: 'all', label: 'All Projects', count: projects.length },
          { key: 'in_progress', label: 'In Progress', count: projects.filter((p) => p.status === 'in_progress').length },
          { key: 'approved', label: 'Approved', count: projects.filter((p) => p.status === 'approved').length },
          { key: 'proposed', label: 'Proposed', count: projects.filter((p) => p.status === 'proposed').length },
          { key: 'completed', label: 'Completed', count: projects.filter((p) => p.status === 'completed').length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusTab(tab.key)}
            className={`pb-3 font-semibold flex items-center space-x-1.5 transition-colors relative shrink-0 ${
              statusTab === tab.key
                ? 'text-emerald-400 border-b-2 border-emerald-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{tab.label}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 4. Search & Domain Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search projects by title, facility, or action..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Domains</option>
              <option value="electricity_efficiency">Electricity Efficiency</option>
              <option value="food_waste">Food Waste & Biogas</option>
              <option value="water_conservation">Water & Effluent</option>
              <option value="tree_canopy">Tree Canopy & Forestry</option>
              <option value="fuel_transport">Vehicle Fleet</option>
              <option value="data_collection">Sub-Metering & IoT</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. Project Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-xs bg-slate-900 rounded-xl border border-slate-800">
          <RotateCcw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
          <span>Loading decarbonization project pipeline...</span>
        </div>
      ) : filteredProjects.length > 0 ? (
        <div className="space-y-4">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-700 transition-colors"
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono border ${getPriorityBadge(
                        project.priority
                      )}`}
                    >
                      {project.priority} priority
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                      {project.category.replace('_', ' ').toUpperCase()}
                    </span>
                    {project.block_name && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        {project.block_name}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-100">{project.title}</h3>
                </div>

                {/* Status Switcher */}
                <div className="flex items-center space-x-2 shrink-0">
                  <span className="text-xs text-slate-400">Lifecycle:</span>
                  <select
                    value={project.status}
                    disabled={updatingId === project.id}
                    onChange={(e) => handleStatusUpdate(project.id, e.target.value as RecommendationStatus)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-emerald-400 font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="proposed">Proposed</option>
                    <option value="approved">Approved</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {/* Proposed Engineering Action */}
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
                <span className="font-semibold text-slate-200">Proposed Engineering Action: </span>
                {project.proposed_action}
              </p>

              {/* Methodology & Avoided Calculation Formula */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>Avoided Emission Quantification Formula</span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-300 mt-1">
                    {project.calculation_rationale}
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <div className="flex items-center space-x-1.5 text-cyan-400 font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Operational Assumptions & Context</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {project.assumptions}
                  </div>
                </div>
              </div>

              {/* Card Footer: Reduction metric and SDGs */}
              <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400">Target Mitigation:</span>
                  <span className="text-sm font-bold font-mono text-emerald-400">
                    {project.potential_co2e_reduction_t_year > 0
                      ? `${project.potential_co2e_reduction_t_year.toLocaleString()} t CO₂e/year`
                      : 'Audit & Telemetry Baseline Enabler'}
                  </span>
                </div>

                {project.related_sdgs && project.related_sdgs.length > 0 && (
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[11px] text-slate-500">SDG Impacts:</span>
                    {project.related_sdgs.map((sdg) => (
                      <span
                        key={sdg}
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-500/10 text-blue-300 border border-blue-500/20"
                      >
                        SDG {sdg}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center text-slate-400 text-xs bg-slate-900 rounded-xl border border-slate-800 space-y-2">
          <Target className="w-8 h-8 mx-auto text-slate-600" />
          <h4 className="text-sm font-semibold text-slate-300">No matching decarbonization projects found</h4>
          <p className="max-w-md mx-auto text-slate-500">
            Adjust your lifecycle stage filter or search criteria to view campus interventions.
          </p>
        </div>
      )}
    </div>
  );
};
