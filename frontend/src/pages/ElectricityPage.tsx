import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Zap,
  Plus,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sliders,
  Layers,
  TrendingUp,
  Sun,
  History,
  Building,
  Gauge,
} from 'lucide-react';
import { apiClient } from '../api/client';
import {
  CampusBlock,
  ElectricityBaseline,
  ElectricityBaselineItemCreate,
  DailyEstimateItemInput,
  DailyEstimatePreviewResponse,
  DailyElectricityEstimate,
  ElectricityComparisonResponse,
} from '../types';

export const ElectricityPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'baselines' | 'estimate' | 'actual' | 'comparison' | 'history'>('baselines');

  // Master Data
  const [blocks, setBlocks] = useState<CampusBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string>('');
  const [loadingBlocks, setLoadingBlocks] = useState<boolean>(true);

  // Notifications
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Tab 1: Baselines state
  const [activeBaseline, setActiveBaseline] = useState<ElectricityBaseline | null>(null);
  const [baselineVersions, setBaselineVersions] = useState<ElectricityBaseline[]>([]);
  const [loadingBaseline, setLoadingBaseline] = useState<boolean>(false);
  const [showReviseModal, setShowReviseModal] = useState<boolean>(false);
  const [newBaselineName, setNewBaselineName] = useState<string>('');
  const [newBaselineRationale, setNewBaselineRationale] = useState<string>('');
  const [newBaselineStartDate, setNewBaselineStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [modalItems, setModalItems] = useState<ElectricityBaselineItemCreate[]>([]);

  // Tab 2: Daily Estimation state
  const [estimateDate, setEstimateDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [operationalMode, setOperationalMode] = useState<string>('regular_day');
  const [isHoliday, setIsHoliday] = useState<boolean>(false);
  const [isZeroDay, setIsZeroDay] = useState<boolean>(false);
  const [estimateNotes, setEstimateNotes] = useState<string>('');
  const [estimateItems, setEstimateItems] = useState<DailyEstimateItemInput[]>([]);
  const [previewResult, setPreviewResult] = useState<DailyEstimatePreviewResponse | null>(null);
  const [savingEstimate, setSavingEstimate] = useState<boolean>(false);

  // Tab 3: Actual Meter Reading state
  const [actualDate, setActualDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [actualKwh, setActualKwh] = useState<string>('');
  const [meterBoundary, setMeterBoundary] = useState<string>('grid_import');
  const [measurementMethod, setMeasurementMethod] = useState<string>('utility_meter');
  const [sourceReference, setSourceReference] = useState<string>('');
  const [meterStartReading, setMeterStartReading] = useState<string>('');
  const [meterEndReading, setMeterEndReading] = useState<string>('');
  const [actualNotes, setActualNotes] = useState<string>('');
  const [savingActual, setSavingActual] = useState<boolean>(false);

  // Tab 4: Comparison state
  const todayStr = new Date().toISOString().split('T')[0];
  const thirtyDaysAgoStr = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const [compStartDate, setCompStartDate] = useState<string>(thirtyDaysAgoStr);
  const [compEndDate, setCompEndDate] = useState<string>(todayStr);
  const [comparisonData, setComparisonData] = useState<ElectricityComparisonResponse | null>(null);
  const [loadingComparison, setLoadingComparison] = useState<boolean>(false);

  // Tab 5: History state
  const [historyEstimates, setHistoryEstimates] = useState<DailyElectricityEstimate[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // ---------------------------------------------------------------------------
  // Load blocks on mount
  // ---------------------------------------------------------------------------
  const fetchBlocks = useCallback(async () => {
    try {
      setLoadingBlocks(true);
      const res = await apiClient.getBlocks();
      setBlocks(res.items);
      if (res.items.length > 0 && !selectedBlockId) {
        setSelectedBlockId(res.items[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load campus blocks');
    } finally {
      setLoadingBlocks(false);
    }
  }, [selectedBlockId]);

  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

  // Selected block object
  const selectedBlock = useMemo(() => {
    return blocks.find((b) => b.id === selectedBlockId) || null;
  }, [blocks, selectedBlockId]);

  // ---------------------------------------------------------------------------
  // Load active baseline for selected block
  // ---------------------------------------------------------------------------
  const fetchBlockBaseline = useCallback(async (blockId: string) => {
    if (!blockId) return;
    try {
      setLoadingBaseline(true);
      setErrorMsg(null);
      const [curr, versions] = await Promise.all([
        apiClient.getBaselineForBlock(blockId).catch(() => null),
        apiClient.getBaselineVersionsForBlock(blockId).catch(() => []),
      ]);
      setActiveBaseline(curr);
      setBaselineVersions(versions);

      // Prefill estimation items if on estimate tab or when baseline changes
      if (curr && curr.items) {
        setEstimateItems(
          curr.items.map((it) => ({
            facility_type: it.facility_type,
            facility_name: it.facility_name,
            quantity: it.quantity,
            average_power_kw: it.average_power_kw,
            operating_hours: it.default_operating_hours,
            source_rationale: it.source_rationale || undefined,
          }))
        );
      } else {
        setEstimateItems([]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch baseline profile');
    } finally {
      setLoadingBaseline(false);
    }
  }, []);

  useEffect(() => {
    if (selectedBlockId) {
      fetchBlockBaseline(selectedBlockId);
    }
  }, [selectedBlockId, fetchBlockBaseline]);

  // ---------------------------------------------------------------------------
  // Calculate preview when estimate items or dates change
  // ---------------------------------------------------------------------------
  const updateCalculationPreview = useCallback(async () => {
    if (!selectedBlockId || !estimateDate) return;
    try {
      const res = await apiClient.calculateDailyEstimatePreview({
        block_id: selectedBlockId,
        reporting_date: estimateDate,
        operational_mode: operationalMode,
        is_holiday: isHoliday,
        is_zero_consumption: isZeroDay,
        baseline_id: activeBaseline?.id,
        custom_items: estimateItems.length > 0 ? estimateItems : undefined,
      });
      setPreviewResult(res);
    } catch {
      // preview calculation fallback
      if (isHoliday || isZeroDay) {
        setPreviewResult({
          block_id: selectedBlockId,
          reporting_date: estimateDate,
          baseline_version: activeBaseline?.version || 1,
          operational_mode: operationalMode,
          is_holiday: isHoliday,
          is_zero_consumption: isZeroDay,
          items: [],
          total_estimated_kwh: 0,
        });
      } else {
        const items = estimateItems.map((it) => ({
          ...it,
          estimated_kwh: Math.round(it.quantity * it.average_power_kw * it.operating_hours * 1000) / 1000,
        }));
        const total = items.reduce((acc, it) => acc + it.estimated_kwh, 0);
        setPreviewResult({
          block_id: selectedBlockId,
          reporting_date: estimateDate,
          baseline_version: activeBaseline?.version || 1,
          operational_mode: operationalMode,
          is_holiday: false,
          is_zero_consumption: false,
          items,
          total_estimated_kwh: Math.round(total * 1000) / 1000,
        });
      }
    }
  }, [selectedBlockId, estimateDate, operationalMode, isHoliday, isZeroDay, activeBaseline, estimateItems]);

  useEffect(() => {
    updateCalculationPreview();
  }, [updateCalculationPreview]);

  // ---------------------------------------------------------------------------
  // Load Comparison Data
  // ---------------------------------------------------------------------------
  const fetchComparison = useCallback(async () => {
    if (!selectedBlockId || !compStartDate || !compEndDate) return;
    try {
      setLoadingComparison(true);
      setErrorMsg(null);
      const res = await apiClient.getElectricityComparison({
        block_id: selectedBlockId,
        start_date: compStartDate,
        end_date: compEndDate,
      });
      setComparisonData(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load comparison data');
    } finally {
      setLoadingComparison(false);
    }
  }, [selectedBlockId, compStartDate, compEndDate]);

  useEffect(() => {
    if (activeTab === 'comparison' && selectedBlockId) {
      fetchComparison();
    }
  }, [activeTab, selectedBlockId, fetchComparison]);

  // ---------------------------------------------------------------------------
  // Load History Estimates
  // ---------------------------------------------------------------------------
  const fetchHistory = useCallback(async () => {
    if (!selectedBlockId) return;
    try {
      setLoadingHistory(true);
      const res = await apiClient.getDailyEstimates({
        block_id: selectedBlockId,
        limit: 50,
      });
      setHistoryEstimates(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load historical estimates');
    } finally {
      setLoadingHistory(false);
    }
  }, [selectedBlockId]);

  useEffect(() => {
    if (activeTab === 'history' && selectedBlockId) {
      fetchHistory();
    }
  }, [activeTab, selectedBlockId, fetchHistory]);

  // ---------------------------------------------------------------------------
  // Handle Save Daily Estimate
  // ---------------------------------------------------------------------------
  const handleSaveEstimate = async () => {
    if (!selectedBlockId || !estimateDate) return;
    try {
      setSavingEstimate(true);
      setErrorMsg(null);
      await apiClient.createDailyEstimate({
        block_id: selectedBlockId,
        reporting_date: estimateDate,
        baseline_id: activeBaseline?.id,
        operational_mode: operationalMode,
        is_holiday: isHoliday,
        is_zero_consumption: isZeroDay,
        notes: estimateNotes || undefined,
        items: isHoliday || isZeroDay ? [] : estimateItems,
        replace_existing: true,
      });
      setSuccessMsg(`Daily electricity estimate for ${selectedBlock?.name} on ${estimateDate} saved successfully.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save daily estimate');
    } finally {
      setSavingEstimate(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Handle Save Actual Meter Reading
  // ---------------------------------------------------------------------------
  const handleSaveActual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBlockId || !actualDate || !actualKwh) return;
    try {
      setSavingActual(true);
      setErrorMsg(null);
      await apiClient.recordActualElectricity({
        block_id: selectedBlockId,
        reporting_date: actualDate,
        quantity_kwh: parseFloat(actualKwh),
        meter_boundary: meterBoundary,
        measurement_method: measurementMethod,
        source_reference: sourceReference || undefined,
        meter_start_reading: meterStartReading ? parseFloat(meterStartReading) : undefined,
        meter_end_reading: meterEndReading ? parseFloat(meterEndReading) : undefined,
        notes: actualNotes || undefined,
        replace_existing: true,
      });
      setSuccessMsg(`Actual meter reading of ${actualKwh} kWh for ${selectedBlock?.name} recorded successfully.`);
      setActualKwh('');
      setMeterStartReading('');
      setMeterEndReading('');
      setActualNotes('');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save actual meter reading');
    } finally {
      setSavingActual(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Handle Revise / Create Baseline Modal
  // ---------------------------------------------------------------------------
  const openReviseModal = () => {
    if (activeBaseline) {
      setNewBaselineName(`${activeBaseline.name} (Rev ${activeBaseline.version + 1})`);
      setNewBaselineRationale(activeBaseline.source_rationale || '');
      setModalItems(
        activeBaseline.items.map((it) => ({
          facility_type: it.facility_type,
          facility_name: it.facility_name,
          quantity: it.quantity,
          average_power_kw: it.average_power_kw,
          default_operating_hours: it.default_operating_hours,
          source_rationale: it.source_rationale || undefined,
        }))
      );
    } else {
      setNewBaselineName(`${selectedBlock?.name || 'Block'} Standard Baseline Profile`);
      setNewBaselineRationale('Initial facility audit assumptions');
      setModalItems([
        {
          facility_type: 'standard_classroom',
          facility_name: 'Standard Classroom (Non-AC)',
          quantity: 10,
          average_power_kw: 1.2,
          default_operating_hours: 8.0,
          source_rationale: 'Classroom lighting, fans and multimedia load',
        },
      ]);
    }
    setShowReviseModal(true);
  };

  const handleSaveBaselineRevision = async () => {
    if (!selectedBlockId || modalItems.length === 0) return;
    try {
      setErrorMsg(null);
      if (activeBaseline) {
        await apiClient.reviseBaseline(activeBaseline.id, {
          name: newBaselineName,
          source_rationale: newBaselineRationale,
          effective_start_date: newBaselineStartDate,
          items: modalItems,
        });
        setSuccessMsg(`Baseline revision for ${selectedBlock?.name} saved successfully.`);
      } else {
        await apiClient.createBaseline({
          block_id: selectedBlockId,
          name: newBaselineName,
          source_rationale: newBaselineRationale,
          effective_start_date: newBaselineStartDate,
          items: modalItems,
        });
        setSuccessMsg(`New baseline profile created for ${selectedBlock?.name}.`);
      }
      setShowReviseModal(false);
      fetchBlockBaseline(selectedBlockId);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save baseline');
    }
  };

  // ---------------------------------------------------------------------------
  // Sync Seed Baselines Trigger
  // ---------------------------------------------------------------------------
  const handleSeedBaselines = async () => {
    try {
      const res = await apiClient.seedBaselines();
      setSuccessMsg(
        `Baselines verified: ${res.created_baselines} created, ${res.skipped_blocks} blocks already configured.`
      );
      if (selectedBlockId) fetchBlockBaseline(selectedBlockId);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to seed canonical baselines');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <Building className="w-4 h-4" />
            <span>Amrita Vishwa Vidyapeetham</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">Coimbatore Campus (AVV-CBE)</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-3">
            <span>Electricity Baselines & MRV Telemetry</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              Phase 4 Active
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Database-backed baseline profiles, deterministic daily estimation, actual meter readings, and variance tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSeedBaselines}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-colors"
            title="Idempotently ensure canonical baselines for all 27 Coimbatore blocks"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Sync Baselines (27 Blocks)</span>
          </button>
        </div>
      </div>

      {/* Block Selector Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <Building className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="w-full md:w-80">
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Select Campus Block (27 Total)
            </label>
            <select
              value={selectedBlockId}
              onChange={(e) => setSelectedBlockId(e.target.value)}
              disabled={loadingBlocks}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
            >
              {blocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code}) — {b.category.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedBlock && (
          <div className="flex items-center gap-6 text-xs text-slate-400 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-6">
            <div>
              <span className="text-slate-400">Category: </span>
              <span className="text-slate-200 font-medium capitalize">{selectedBlock.category}</span>
            </div>
            <div>
              <span className="text-slate-400">Floor Area: </span>
              <span className="text-slate-200 font-medium">
                {selectedBlock.floor_area_sqm ? `${selectedBlock.floor_area_sqm.toLocaleString()} m²` : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Occupancy: </span>
              <span className="text-slate-200 font-medium">
                {selectedBlock.occupant_capacity ? `${selectedBlock.occupant_capacity.toLocaleString()} persons` : 'N/A'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 px-4 py-3 rounded-lg text-sm flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-950/40 border border-rose-800/60 text-rose-300 px-4 py-3 rounded-lg text-sm flex items-center space-x-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center border-b border-slate-800 space-x-6 text-sm overflow-x-auto">
        <button
          onClick={() => setActiveTab('baselines')}
          className={`pb-3 font-medium flex items-center space-x-2 transition-colors relative shrink-0 ${
            activeTab === 'baselines' ? 'text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Baselines & Profiles</span>
          {activeBaseline && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px]">
              v{activeBaseline.version}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('estimate')}
          className={`pb-3 font-medium flex items-center space-x-2 transition-colors relative shrink-0 ${
            activeTab === 'estimate' ? 'text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Daily Electricity Estimation</span>
        </button>

        <button
          onClick={() => setActiveTab('actual')}
          className={`pb-3 font-medium flex items-center space-x-2 transition-colors relative shrink-0 ${
            activeTab === 'actual' ? 'text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Gauge className="w-4 h-4" />
          <span>Actual Meter Ingestion</span>
        </button>

        <button
          onClick={() => setActiveTab('comparison')}
          className={`pb-3 font-medium flex items-center space-x-2 transition-colors relative shrink-0 ${
            activeTab === 'comparison' ? 'text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Estimated vs Actual Comparison</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 font-medium flex items-center space-x-2 transition-colors relative shrink-0 ${
            activeTab === 'history' ? 'text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit Log & History</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: BASELINES & PROFILES
          ========================================================================= */}
      {activeTab === 'baselines' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                <span>Active Electricity Baseline Profile</span>
                {activeBaseline && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    Version {activeBaseline.version}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configured facility room counts, average active power ratings (kW), and typical operating hours.
              </p>
            </div>

            <button
              onClick={openReviseModal}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors shadow-sm shadow-emerald-900/30"
            >
              <Plus className="w-4 h-4" />
              <span>{activeBaseline ? 'Revise Baseline (Create New Version)' : 'Create Baseline Profile'}</span>
            </button>
          </div>

          {loadingBaseline ? (
            <div className="p-12 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
              <RotateCcw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
              <span>Loading baseline profile...</span>
            </div>
          ) : !activeBaseline ? (
            <div className="p-12 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
              <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="font-medium text-slate-300">No baseline profile found for this block</p>
              <p className="text-xs text-slate-500 mt-1">
                Configure facility profiles or click Sync Baselines to seed initial configurations.
              </p>
              <button
                onClick={openReviseModal}
                className="mt-4 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-500"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Configure Baseline</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Baseline Summary Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base font-semibold text-slate-200">{activeBaseline.name}</h3>
                    {activeBaseline.description && (
                      <p className="text-xs text-slate-400 mt-0.5">{activeBaseline.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Baseline Daily Load</span>
                    <span className="text-xl font-bold font-mono text-emerald-400">
                      {activeBaseline.total_default_daily_kwh.toLocaleString()} kWh/day
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block">Effective Start Date</span>
                    <span className="text-slate-200 font-medium">{activeBaseline.effective_start_date}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Effective End Date</span>
                    <span className="text-slate-200 font-medium">
                      {activeBaseline.effective_end_date || 'Currently Active (Open-ended)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Active Profiles</span>
                    <span className="text-slate-200 font-medium">{activeBaseline.items.length} facility types</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Audit Rationale</span>
                    <span className="text-slate-300 font-medium truncate block" title={activeBaseline.source_rationale || ''}>
                      {activeBaseline.source_rationale || 'Audited campus inventory'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Facility Profiles Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-200">Configured Facility Profiles</h3>
                  <span className="text-xs text-slate-400">
                    Formula: Quantity × Power (kW) × Typical Operating Hours
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Facility Type</th>
                        <th className="px-4 py-3 text-right">Qty</th>
                        <th className="px-4 py-3 text-right">Power Rating</th>
                        <th className="px-4 py-3 text-right">Typical Hours</th>
                        <th className="px-4 py-3 text-right">Daily Contribution</th>
                        <th className="px-4 py-3">Source & Rationale</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {activeBaseline.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-200">
                            <div>{item.facility_name}</div>
                            <span className="text-[10px] text-slate-400 font-mono uppercase">{item.facility_type}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-300">{item.quantity}</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-300">{item.average_power_kw} kW</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-300">{item.default_operating_hours} hrs/day</td>
                          <td className="px-4 py-3 text-right font-mono text-emerald-400 font-semibold">
                            {(item.calculated_default_daily_kwh ?? Math.round(item.quantity * item.average_power_kw * item.default_operating_hours * 1000) / 1000).toLocaleString()} kWh
                          </td>
                          <td className="px-4 py-3 text-slate-400 max-w-xs truncate" title={item.source_rationale || ''}>
                            {item.source_rationale || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Historical Baseline Versions List */}
              {baselineVersions.length > 1 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                    <History className="w-4 h-4 text-emerald-400" />
                    <span>Historical Baseline Versions ({baselineVersions.length})</span>
                  </h3>
                  <div className="space-y-2">
                    {baselineVersions.map((bv) => (
                      <div
                        key={bv.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs"
                      >
                        <div className="flex items-center space-x-3">
                          <span
                            className={`px-2 py-0.5 rounded font-mono font-bold ${
                              bv.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            v{bv.version}
                          </span>
                          <div>
                            <span className="text-slate-200 font-medium">{bv.name}</span>
                            <span className="text-slate-400 block text-[11px]">
                              Effective: {bv.effective_start_date} to {bv.effective_end_date || 'Present'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-slate-300 font-semibold">{bv.total_default_daily_kwh.toLocaleString()} kWh/day</span>
                          <span className="text-[10px] text-slate-400 block">{bv.items.length} profiles</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: DAILY ELECTRICITY ESTIMATION
          ========================================================================= */}
      {activeTab === 'estimate' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-emerald-400" />
                <span>Deterministic Daily Electricity Estimation</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Prefills operating hours from active baseline. Adjust operating hours for this specific date without altering baseline profile.
              </p>
            </div>

            {/* Date & Mode Controls */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Reporting Date</label>
                <input
                  type="date"
                  value={estimateDate}
                  onChange={(e) => setEstimateDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Operational Mode</label>
                <select
                  value={operationalMode}
                  onChange={(e) => setOperationalMode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="regular_day">Regular Academic Day</option>
                  <option value="exam_day">Examination Schedule</option>
                  <option value="weekend">Weekend Schedule</option>
                  <option value="vacation">Vacation Period</option>
                  <option value="holiday">Official Holiday</option>
                  <option value="maintenance">Maintenance Shutdown</option>
                </select>
              </div>

              <div className="flex flex-col justify-end space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={isHoliday}
                    onChange={(e) => {
                      setIsHoliday(e.target.checked);
                      if (e.target.checked) setIsZeroDay(true);
                    }}
                    className="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span>Campus Holiday</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={isZeroDay}
                    onChange={(e) => setIsZeroDay(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span>Zero-Consumption Day</span>
                </label>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Calculation Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Saturday afternoon symposium"
                  value={estimateNotes}
                  onChange={(e) => setEstimateNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Editable Operating Hours Table */}
            {!(isHoliday || isZeroDay) ? (
              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Facility Operating Hours for {estimateDate}</span>
                  <span className="text-slate-400">Baseline Version: v{activeBaseline?.version || 1}</span>
                </div>

                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">Facility Type</th>
                      <th className="px-4 py-2.5 text-right">Qty</th>
                      <th className="px-4 py-2.5 text-right">Power Rating</th>
                      <th className="px-4 py-2.5 text-right w-36">Operating Hours</th>
                      <th className="px-4 py-2.5 text-right">Estimated kWh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {estimateItems.map((item, idx) => {
                      const estimatedItemKwh = Math.round(item.quantity * item.average_power_kw * item.operating_hours * 1000) / 1000;
                      return (
                        <tr key={idx} className="hover:bg-slate-800/20">
                          <td className="px-4 py-2.5 font-medium text-slate-200">
                            <div>{item.facility_name}</div>
                            <span className="text-[10px] text-slate-400 font-mono">{item.facility_type}</span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-slate-300">{item.quantity}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-slate-300">{item.average_power_kw} kW</td>
                          <td className="px-4 py-2.5 text-right">
                            <input
                              type="number"
                              min="0"
                              max="24"
                              step="0.5"
                              value={item.operating_hours}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                const updated = [...estimateItems];
                                updated[idx].operating_hours = Math.min(24, Math.max(0, val));
                                setEstimateItems(updated);
                              }}
                              className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-right font-mono text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-emerald-400 font-semibold">
                            {estimatedItemKwh.toLocaleString()} kWh
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-lg text-slate-400 text-xs">
                <Sun className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <span className="font-semibold text-slate-200 block text-sm">Designated Zero-Consumption / Holiday</span>
                <span className="text-slate-400">Total estimated electricity will be recorded as 0.0 kWh for this date.</span>
              </div>
            )}

            {/* Calculation Total Banner & Save Button */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg bg-slate-950 border border-slate-800">
              <div className="flex items-center space-x-3">
                <Zap className="w-6 h-6 text-emerald-400" />
                <div>
                  <span className="text-xs text-slate-400 block">Total Daily Estimated Consumption</span>
                  <span className="text-2xl font-bold font-mono text-emerald-400">
                    {previewResult ? previewResult.total_estimated_kwh.toLocaleString() : '0'} kWh
                  </span>
                </div>
              </div>

              <button
                onClick={handleSaveEstimate}
                disabled={savingEstimate}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs transition-colors shadow-sm"
              >
                {savingEstimate ? <RotateCcw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Save Daily Estimate for {estimateDate}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: ACTUAL METER INGESTION
          ========================================================================= */}
      {activeTab === 'actual' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2 mb-1">
              <Gauge className="w-5 h-5 text-emerald-400" />
              <span>Record Actual Electricity Measurement</span>
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Ingests actual meter reading into the daily telemetry ledger. Reuses Phase 3 activity records with strict meter boundary accounting.
            </p>

            <form onSubmit={handleSaveActual} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Measurement Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={actualDate}
                    onChange={(e) => setActualDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Active Electricity Consumption (kWh) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="e.g. 1450.5"
                    value={actualKwh}
                    onChange={(e) => setActualKwh(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Meter Accounting Boundary *
                  </label>
                  <select
                    value={meterBoundary}
                    onChange={(e) => setMeterBoundary(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="grid_import">Grid Electricity Imported (Main Incomer)</option>
                    <option value="solar_generation">Solar Electricity Generated (PV Inverter)</option>
                    <option value="solar_consumption">Solar Electricity Consumed On-Site</option>
                    <option value="solar_export">Solar Electricity Exported to Grid</option>
                    <option value="total_consumption">Total Facility Net Electricity Consumption</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Measurement Method *
                  </label>
                  <select
                    value={measurementMethod}
                    onChange={(e) => setMeasurementMethod(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="utility_meter">Digital Utility Fiscal Meter</option>
                    <option value="sub_meter">Dedicated Feeder Sub-Meter</option>
                    <option value="invoice">EB Power Bill / Tariff Invoice</option>
                    <option value="logbook">Substation Shift Logbook</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Meter Serial / Feeder Reference
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. EM-AB1-MAIN-01"
                    value={sourceReference}
                    onChange={(e) => setSourceReference(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Start Reading
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="e.g. 12500"
                      value={meterStartReading}
                      onChange={(e) => setMeterStartReading(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      End Reading
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="e.g. 13950"
                      value={meterEndReading}
                      onChange={(e) => setMeterEndReading(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Field Notes / Verification Observations
                </label>
                <input
                  type="text"
                  placeholder="e.g. Verified against substation feeder CT/PT logbook"
                  value={actualNotes}
                  onChange={(e) => setActualNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingActual}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs transition-colors shadow-sm"
                >
                  {savingActual ? <RotateCcw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Record Actual Measurement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: ESTIMATED-VERSUS-ACTUAL COMPARISON
          ========================================================================= */}
      {activeTab === 'comparison' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">From Date</label>
                <input
                  type="date"
                  value={compStartDate}
                  onChange={(e) => setCompStartDate(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">To Date</label>
                <input
                  type="date"
                  value={compEndDate}
                  onChange={(e) => setCompEndDate(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              onClick={fetchComparison}
              disabled={loadingComparison}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${loadingComparison ? 'animate-spin' : ''}`} />
              <span>Refresh Comparison</span>
            </button>
          </div>

          {loadingComparison ? (
            <div className="p-12 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
              <RotateCcw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
              <span>Comparing estimated vs actual telemetry...</span>
            </div>
          ) : !comparisonData ? (
            <div className="p-12 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
              <span>Select date range to view comparison</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <span className="text-xs text-slate-400 block">Total Estimated</span>
                  <span className="text-xl font-bold font-mono text-emerald-400">
                    {comparisonData.total_estimated_kwh.toLocaleString()} kWh
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">Across range</span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <span className="text-xs text-slate-400 block">Total Actual Measured</span>
                  <span className="text-xl font-bold font-mono text-blue-400">
                    {comparisonData.total_actual_kwh.toLocaleString()} kWh
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">Utility & sub-meters</span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <span className="text-xs text-slate-400 block">Net Variance (Actual − Est)</span>
                  <span
                    className={`text-xl font-bold font-mono ${
                      (comparisonData.net_variance_kwh || 0) > 0
                        ? 'text-amber-400'
                        : (comparisonData.net_variance_kwh || 0) < 0
                        ? 'text-emerald-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {comparisonData.net_variance_kwh != null
                      ? `${comparisonData.net_variance_kwh > 0 ? '+' : ''}${comparisonData.net_variance_kwh.toLocaleString()} kWh`
                      : 'N/A'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">Matched days only</span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <span className="text-xs text-slate-400 block">Day Status Breakdown</span>
                  <div className="flex items-center space-x-2 text-xs font-semibold mt-1">
                    <span className="text-emerald-400">{comparisonData.matched_days} Matched</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-amber-400">{comparisonData.estimated_only_days} Est Only</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400">{comparisonData.missing_days} Missing</span>
                  </div>
                </div>
              </div>

              {/* Day-by-Day Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-200">
                    Day-by-Day Variance Analysis ({comparisonData.records.length} days)
                  </h3>
                  <span className="text-xs text-slate-400">
                    Difference = Actual − Estimated | % = (Actual − Est) / Est × 100
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3 text-right">Estimated (kWh)</th>
                        <th className="px-4 py-3 text-right">Actual (kWh)</th>
                        <th className="px-4 py-3 text-right">Difference</th>
                        <th className="px-4 py-3 text-right">% Variance</th>
                        <th className="px-4 py-3">Reporting Recommendation</th>
                        <th className="px-4 py-3 text-right">Solar Gen (PV)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {comparisonData.records.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3 text-slate-300 font-sans font-medium">
                            {r.reporting_date}
                            {r.is_holiday && (
                              <span className="ml-2 text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                Holiday
                              </span>
                            )}
                          </td>

                          {/* Estimated */}
                          <td className="px-4 py-3 text-right text-slate-200 font-semibold">
                            {r.has_estimate ? (
                              <div>
                                {r.estimated_kwh?.toLocaleString()} kWh
                                <span className="block text-[10px] text-slate-400 font-sans">v{r.baseline_version}</span>
                              </div>
                            ) : (
                              <span className="text-slate-600 font-sans">No Estimate</span>
                            )}
                          </td>

                          {/* Actual */}
                          <td className="px-4 py-3 text-right text-slate-200 font-semibold">
                            {r.has_actual ? (
                              <div>
                                {r.actual_kwh?.toLocaleString()} kWh
                                <span className="block text-[10px] text-slate-400 font-sans">
                                  {r.meter_boundary?.replace('_', ' ')}
                                </span>
                              </div>
                            ) : (
                              <span className="text-amber-500/70 font-sans">Missing Actual</span>
                            )}
                          </td>

                          {/* Absolute Difference */}
                          <td className="px-4 py-3 text-right font-bold">
                            {r.difference_kwh != null ? (
                              <span className={r.difference_kwh > 0 ? 'text-amber-400' : r.difference_kwh < 0 ? 'text-emerald-400' : 'text-slate-400'}>
                                {r.difference_kwh > 0 ? '+' : ''}
                                {r.difference_kwh.toLocaleString()} kWh
                              </span>
                            ) : (
                              <span className="text-slate-600 font-sans font-normal">—</span>
                            )}
                          </td>

                          {/* Percentage Difference */}
                          <td className="px-4 py-3 text-right font-bold">
                            {r.percentage_difference != null ? (
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] ${
                                  r.percentage_difference > 10
                                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                    : r.percentage_difference < -10
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {r.percentage_difference > 0 ? '+' : ''}
                                {r.percentage_difference}%
                              </span>
                            ) : (
                              <span className="text-slate-600 font-sans font-normal">N/A</span>
                            )}
                          </td>

                          {/* Recommended Value */}
                          <td className="px-4 py-3 font-sans">
                            {r.recommended_reporting_value != null ? (
                              <div className="flex items-center space-x-1.5">
                                <span className="font-mono text-slate-200 font-semibold">
                                  {r.recommended_reporting_value.toLocaleString()} kWh
                                </span>
                                <span
                                  className={`text-[10px] px-1.5 py-0.2 rounded uppercase font-semibold ${
                                    r.recommended_reporting_source === 'measured'
                                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  }`}
                                >
                                  {r.recommended_reporting_source}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-600">Pending</span>
                            )}
                          </td>

                          {/* Solar Generation */}
                          <td className="px-4 py-3 text-right text-amber-400 font-semibold">
                            {r.solar_generation_kwh != null ? (
                              <span>{r.solar_generation_kwh.toLocaleString()} kWh</span>
                            ) : (
                              <span className="text-slate-600 font-sans font-normal">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 5: AUDIT LOG & HISTORY
          ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-200">
                Persistent Daily Electricity Estimates for {selectedBlock?.name}
              </h2>
              <span className="text-xs text-slate-400">Auditable Calculation Records</span>
            </div>

            {loadingHistory ? (
              <div className="p-8 text-center text-slate-400">Loading history...</div>
            ) : historyEstimates.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No saved daily estimates found for this block yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Mode</th>
                      <th className="px-4 py-3 text-right">Estimated kWh</th>
                      <th className="px-4 py-3 text-center">Baseline Ver</th>
                      <th className="px-4 py-3 text-center">Record Ver</th>
                      <th className="px-4 py-3">Profile Breakdown</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {historyEstimates.map((est) => (
                      <tr key={est.id} className="hover:bg-slate-800/30">
                        <td className="px-4 py-3 text-slate-200 font-sans font-medium">{est.reporting_date}</td>
                        <td className="px-4 py-3 text-slate-400 font-sans capitalize">{est.operational_mode}</td>
                        <td className="px-4 py-3 text-right text-emerald-400 font-bold">
                          {est.total_estimated_kwh.toLocaleString()} kWh
                        </td>
                        <td className="px-4 py-3 text-center text-slate-300">v{est.baseline_version}</td>
                        <td className="px-4 py-3 text-center text-slate-400">v{est.version}</td>
                        <td className="px-4 py-3 font-sans text-slate-400 text-[11px]">
                          {est.calculation_details && est.calculation_details.length > 0 ? (
                            <span>{est.calculation_details.map((d) => `${d.facility_name}: ${d.estimated_kwh} kWh`).join('; ')}</span>
                          ) : (
                            <span>Zero day / Holiday</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: REVISE OR CREATE BASELINE
          ========================================================================= */}
      {showReviseModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl space-y-5 p-6 animate-scaleUp max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-100">
                  {activeBaseline ? 'Revise Baseline Profile (New Version)' : 'Create Baseline Profile'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Target Block: <span className="text-emerald-400 font-medium">{selectedBlock?.name}</span>
                </p>
              </div>
              <button
                onClick={() => setShowReviseModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Profile Name *</label>
                  <input
                    type="text"
                    required
                    value={newBaselineName}
                    onChange={(e) => setNewBaselineName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Effective Start Date *</label>
                  <input
                    type="date"
                    required
                    value={newBaselineStartDate}
                    onChange={(e) => setNewBaselineStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">Source & Audit Rationale</label>
                <input
                  type="text"
                  placeholder="e.g. Certified energy audit Q2 2026 by Estate Engineering Team"
                  value={newBaselineRationale}
                  onChange={(e) => setNewBaselineRationale(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Facility Items Config */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Facility Profiles</h4>
                  <button
                    type="button"
                    onClick={() => {
                      setModalItems([
                        ...modalItems,
                        {
                          facility_type: 'custom',
                          facility_name: 'Custom Room Type',
                          quantity: 1,
                          average_power_kw: 1.0,
                          default_operating_hours: 8.0,
                          source_rationale: 'Audited room inventory',
                        },
                      ]);
                    }}
                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Profile</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {modalItems.map((item, idx) => (
                    <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <div className="md:col-span-2">
                          <label className="block text-slate-400 text-[10px] uppercase">Facility Name</label>
                          <input
                            type="text"
                            value={item.facility_name}
                            onChange={(e) => {
                              const updated = [...modalItems];
                              updated[idx].facility_name = e.target.value;
                              setModalItems(updated);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 text-[10px] uppercase">Quantity</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const updated = [...modalItems];
                              updated[idx].quantity = parseInt(e.target.value) || 1;
                              setModalItems(updated);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 text-[10px] uppercase">Power (kW)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            value={item.average_power_kw}
                            onChange={(e) => {
                              const updated = [...modalItems];
                              updated[idx].average_power_kw = parseFloat(e.target.value) || 0.1;
                              setModalItems(updated);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                        <div>
                          <label className="block text-slate-400 text-[10px] uppercase">Typical Hours (0 - 24)</label>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="24"
                            value={item.default_operating_hours}
                            onChange={(e) => {
                              const updated = [...modalItems];
                              updated[idx].default_operating_hours = Math.min(24, Math.max(0, parseFloat(e.target.value) || 0));
                              setModalItems(updated);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 text-[10px] uppercase">Daily Load Preview</label>
                          <span className="font-mono text-emerald-400 font-semibold block pt-1">
                            {Math.round(item.quantity * item.average_power_kw * item.default_operating_hours * 100) / 100} kWh/day
                          </span>
                        </div>
                        <div className="text-right">
                          <button
                            type="button"
                            onClick={() => {
                              if (modalItems.length > 1) {
                                setModalItems(modalItems.filter((_, i) => i !== idx));
                              }
                            }}
                            disabled={modalItems.length <= 1}
                            className="text-rose-400 hover:text-rose-300 disabled:opacity-30 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 pt-4 shrink-0">
              <div className="text-xs font-mono text-slate-400">
                Total Baseline Load:{' '}
                <span className="text-emerald-400 font-bold">
                  {modalItems
                    .reduce((acc, it) => acc + it.quantity * it.average_power_kw * it.default_operating_hours, 0)
                    .toLocaleString()}{' '}
                  kWh/day
                </span>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowReviseModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveBaselineRevision}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
                >
                  Save Baseline Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
