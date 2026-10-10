import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calculator,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Layers,
  Database,
  History,
  Building,
  Info,
  ShieldCheck,
  Search,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { apiClient } from '../api/client';
import {
  CampusBlock,
  EmissionFactor,
  CarbonCalculationResponse,
  CarbonCalculationListResponse,
} from '../types';

export const CarbonCalculationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'calculator' | 'factors' | 'history'>('calculator');

  // Master Data
  const [blocks, setBlocks] = useState<CampusBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string>('');
  const [loadingBlocks, setLoadingBlocks] = useState<boolean>(true);

  // Notifications
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Tab 1: Calculation State
  const todayStr = new Date().toISOString().split('T')[0];
  const [calcDate, setCalcDate] = useState<string>(todayStr);
  const [activityCode, setActivityCode] = useState<string>('ELEC_CONSUMPTION');
  const [electricitySource, setElectricitySource] = useState<string>('auto');
  const [useCustomQty, setUseCustomQty] = useState<boolean>(false);
  const [customQty, setCustomQty] = useState<string>('');
  const [customUnit, setCustomUnit] = useState<string>('kWh');
  const [calcNotes, setCalcNotes] = useState<string>('');
  const [executingCalc, setExecutingCalc] = useState<boolean>(false);
  const [latestResult, setLatestResult] = useState<CarbonCalculationResponse | null>(null);

  // Tab 2: Factors Catalogue State
  const [factors, setFactors] = useState<EmissionFactor[]>([]);
  const [loadingFactors, setLoadingFactors] = useState<boolean>(false);
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [factorSearch, setFactorSearch] = useState<string>('');
  const [selectedFactorDetail, setSelectedFactorDetail] = useState<EmissionFactor | null>(null);

  // Tab 3: History & Aggregations State
  const thirtyDaysAgoStr = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const [historyStartDate, setHistoryStartDate] = useState<string>(thirtyDaysAgoStr);
  const [historyEndDate, setHistoryEndDate] = useState<string>(todayStr);
  const [historyBlockId, setHistoryBlockId] = useState<string>('');
  const [historyScope, setHistoryScope] = useState<string>('all');
  const [calculationsData, setCalculationsData] = useState<CarbonCalculationListResponse | null>(null);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Recalculation modal
  const [recalcModalRecord, setRecalcModalRecord] = useState<CarbonCalculationResponse | null>(null);
  const [recalcReason, setRecalcReason] = useState<string>('');
  const [savingRecalc, setSavingRecalc] = useState<boolean>(false);

  // ---------------------------------------------------------------------------
  // Load Blocks on Mount
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

  // ---------------------------------------------------------------------------
  // Load Factors Catalogue
  // ---------------------------------------------------------------------------
  const fetchFactors = useCallback(async () => {
    try {
      setLoadingFactors(true);
      const res = await apiClient.getEmissionFactors({
        scope: scopeFilter !== 'all' ? scopeFilter : undefined,
        search: factorSearch.trim() || undefined,
        limit: 100,
      });
      setFactors(res.items);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch emission factors');
    } finally {
      setLoadingFactors(false);
    }
  }, [scopeFilter, factorSearch]);

  useEffect(() => {
    if (activeTab === 'factors') {
      fetchFactors();
    }
  }, [activeTab, fetchFactors]);

  // ---------------------------------------------------------------------------
  // Load Calculation History
  // ---------------------------------------------------------------------------
  const fetchHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const res = await apiClient.getCarbonCalculations({
        block_id: historyBlockId || undefined,
        start_date: historyStartDate || undefined,
        end_date: historyEndDate || undefined,
        scope: historyScope !== 'all' ? historyScope : undefined,
        limit: 100,
      });
      setCalculationsData(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load calculation history');
    } finally {
      setLoadingHistory(false);
    }
  }, [historyBlockId, historyStartDate, historyEndDate, historyScope]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  // ---------------------------------------------------------------------------
  // Sync Canonical Emission Factors
  // ---------------------------------------------------------------------------
  const handleSeedFactors = async () => {
    try {
      setErrorMsg(null);
      const res = await apiClient.seedEmissionFactors();
      setSuccessMsg(
        `Emission factors verified: ${res.created_factors} created, ${res.updated_factors} updated (${res.total_canonical} canonical factors active).`
      );
      if (activeTab === 'factors') fetchFactors();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to seed emission factors');
    }
  };

  // ---------------------------------------------------------------------------
  // Handle Execute Calculation
  // ---------------------------------------------------------------------------
  const handleRunCalculation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBlockId || !calcDate || !activityCode) return;
    try {
      setExecutingCalc(true);
      setErrorMsg(null);
      const res = await apiClient.calculateCarbon({
        block_id: selectedBlockId,
        reporting_date: calcDate,
        activity_code: activityCode,
        electricity_source: activityCode === 'ELEC_CONSUMPTION' ? electricitySource : undefined,
        custom_quantity: useCustomQty && customQty ? parseFloat(customQty) : undefined,
        custom_unit: useCustomQty && customUnit ? customUnit : undefined,
        notes: calcNotes || undefined,
      });
      setLatestResult(res);
      setSuccessMsg(
        `Greenhouse gas emissions calculated: ${res.emissions_kg_co2e.toLocaleString()} kg CO2e (${res.emissions_t_co2e.toLocaleString()} t CO2e)`
      );
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Calculation rejected by MRV engine');
    } finally {
      setExecutingCalc(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Handle Recalculation
  // ---------------------------------------------------------------------------
  const handleRecalculate = async () => {
    if (!recalcModalRecord) return;
    try {
      setSavingRecalc(true);
      setErrorMsg(null);
      const res = await apiClient.recalculateCarbon(recalcModalRecord.id, {
        reason: recalcReason || 'Auditor requested recalculation with updated parameters.',
      });
      setSuccessMsg(`Calculation record recalculated successfully (v${res.version}). Previous record marked as superseded.`);
      setRecalcModalRecord(null);
      setRecalcReason('');
      fetchHistory();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to recalculate record');
    } finally {
      setSavingRecalc(false);
    }
  };

  // Dynamic unit options based on selected activity
  const defaultUnitForActivity = useMemo(() => {
    switch (activityCode) {
      case 'ELEC_CONSUMPTION':
      case 'SOLAR_ELEC_GEN':
      case 'GEN_ELECTRICITY_GENERATED':
        return 'kWh';
      case 'FUEL_DIESEL':
      case 'FUEL_PETROL':
      case 'TRANS_FUEL_CONSUMPTION':
      case 'GEN_DIESEL_CONSUMPTION':
        return 'litres';
      case 'FUEL_LPG':
      case 'WASTE_FOOD':
      case 'WASTE_VEGETABLE':
      case 'WASTE_PAPER':
      case 'WASTE_PLASTIC':
        return 'kg';
      case 'STP_WASTEWATER_TREATED':
        return 'm3';
      case 'TRANS_DISTANCE':
        return 'km';
      default:
        return 'units';
    }
  }, [activityCode]);

  useEffect(() => {
    setCustomUnit(defaultUnitForActivity);
  }, [defaultUnitForActivity]);

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
            <span>Carbon Calculation Engine & Digital MRV</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              Phase 5 Active
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Deterministic, auditable greenhouse gas emissions calculations anchored in authoritative Indian CEA and IPCC emission factors.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSeedFactors}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-colors"
            title="Idempotently ensure all 12 canonical Indian and IPCC emission factors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Sync Emission Factors (12 Canonical)</span>
          </button>
        </div>
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
          onClick={() => setActiveTab('calculator')}
          className={`pb-3 font-medium flex items-center space-x-2 transition-colors relative shrink-0 ${
            activeTab === 'calculator' ? 'text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>Calculate Emissions</span>
        </button>

        <button
          onClick={() => setActiveTab('factors')}
          className={`pb-3 font-medium flex items-center space-x-2 transition-colors relative shrink-0 ${
            activeTab === 'factors' ? 'text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Emission Factor Catalogue</span>
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
          TAB 1: CALCULATE EMISSIONS (INTERACTIVE MRV ENGINE)
          ========================================================================= */}
      {activeTab === 'calculator' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2 mb-1">
              <Calculator className="w-5 h-5 text-emerald-400" />
              <span>Deterministic Carbon Accounting Calculator</span>
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Executes exact formula: Emissions (kg CO2e) = Standardized Activity Data × Emission Factor.
              Adheres to institutional double-counting safeguards and Scope classification.
            </p>

            <form onSubmit={handleRunCalculation} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Block Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Campus Block (27 Total) *
                  </label>
                  <select
                    value={selectedBlockId}
                    onChange={(e) => setSelectedBlockId(e.target.value)}
                    disabled={loadingBlocks}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                  >
                    {blocks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code}) — {b.category}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reporting Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Reporting Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={calcDate}
                    onChange={(e) => setCalcDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Measurable Activity */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Measurable Activity Category *
                  </label>
                  <select
                    value={activityCode}
                    onChange={(e) => setActivityCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <optgroup label="Scope 2: Purchased Electricity & Renewables">
                      <option value="ELEC_CONSUMPTION">Grid Electricity Consumption (ELEC_CONSUMPTION)</option>
                      <option value="SOLAR_ELEC_GEN">Rooftop Solar PV Generation (SOLAR_ELEC_GEN)</option>
                    </optgroup>
                    <optgroup label="Scope 1: Stationary Combustion & Cooking">
                      <option value="FUEL_DIESEL">Stationary Diesel Fuel (Boilers/Equipment)</option>
                      <option value="FUEL_PETROL">Stationary Petrol Fuel (Equipment)</option>
                      <option value="FUEL_LPG">Commercial Cooking LPG (Canteens/Dining)</option>
                      <option value="GEN_DIESEL_CONSUMPTION">Emergency Generator Diesel Consumed</option>
                    </optgroup>
                    <optgroup label="Scope 1: Transportation Fleet">
                      <option value="TRANS_FUEL_CONSUMPTION">Fleet Vehicle Fuel Dispensed (TRANS_FUEL_CONSUMPTION)</option>
                      <option value="TRANS_DISTANCE">Fleet Vehicle Distance Logged (Distance Only - Safeguard)</option>
                    </optgroup>
                    <optgroup label="Scope 3: Waste & Value Chain">
                      <option value="WASTE_FOOD">Cooked Food Waste Composting (WASTE_FOOD)</option>
                      <option value="WASTE_VEGETABLE">Raw Culinary Prep Waste Composting (WASTE_VEGETABLE)</option>
                      <option value="WASTE_PAPER">Paper & Cardboard Segregated Recycling (WASTE_PAPER)</option>
                      <option value="WASTE_PLASTIC">Plastics Segregated Mechanical Recycling (WASTE_PLASTIC)</option>
                      <option value="STP_WASTEWATER_TREATED">Sewage Treatment Wastewater Volume (STP - Safeguard)</option>
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Conditional: Electricity Integration Controls */}
              {activityCode === 'ELEC_CONSUMPTION' && (
                <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400">
                    <Zap className="w-4 h-4" />
                    <span>Phase 4 Electricity Integration Options</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Controls whether to report measured utility meter telemetry or deterministic baseline estimates.
                    Double-counting prevention guarantees estimated and actual loads are never summed together.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <label
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        electricitySource === 'auto'
                          ? 'border-emerald-500 bg-emerald-950/20 text-slate-200'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="elecSource"
                        value="auto"
                        checked={electricitySource === 'auto'}
                        onChange={(e) => setElectricitySource(e.target.value)}
                        className="sr-only"
                      />
                      <div className="font-semibold text-slate-200">Automatic Preference</div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Prefers official measured utility meter reading; falls back to baseline estimate if meter reading unavailable.
                      </div>
                    </label>

                    <label
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        electricitySource === 'measured'
                          ? 'border-blue-500 bg-blue-950/20 text-slate-200'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="elecSource"
                        value="measured"
                        checked={electricitySource === 'measured'}
                        onChange={(e) => setElectricitySource(e.target.value)}
                        className="sr-only"
                      />
                      <div className="font-semibold text-slate-200">Fiscal Measured Meter Only</div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Strictly requires official utility meter reading recorded in Phase 4. Fails if unmeasured.
                      </div>
                    </label>

                    <label
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        electricitySource === 'estimated'
                          ? 'border-amber-500 bg-amber-950/20 text-slate-200'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="elecSource"
                        value="estimated"
                        checked={electricitySource === 'estimated'}
                        onChange={(e) => setElectricitySource(e.target.value)}
                        className="sr-only"
                      />
                      <div className="font-semibold text-slate-200">Estimated Baseline Profile Only</div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Applies deterministic estimate calculated from facility room power ratings and operating hours.
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Custom Quantity Entry Toggle */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="customQtyToggle"
                  checked={useCustomQty}
                  onChange={(e) => setUseCustomQty(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0"
                />
                <label htmlFor="customQtyToggle" className="text-xs text-slate-300 font-medium cursor-pointer">
                  Manually enter ad-hoc quantity instead of fetching existing ledger record
                </label>
              </div>

              {/* Custom Quantity Fields */}
              {useCustomQty && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-slate-950 border border-slate-800 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Ad-Hoc Activity Quantity *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required={useCustomQty}
                      placeholder={`e.g. 1500`}
                      value={customQty}
                      onChange={(e) => setCustomQty(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Unit of Measure *
                    </label>
                    <select
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                    >
                      <option value="kWh">kWh (Electricity)</option>
                      <option value="MWh">MWh (1 MWh = 1,000 kWh)</option>
                      <option value="litres">litres (Fuel / Liquid)</option>
                      <option value="gallons">gallons (1 gallon = 3.78541 litres)</option>
                      <option value="kg">kg (Solid Mass / LPG)</option>
                      <option value="tonnes">tonnes (1 tonne = 1,000 kg)</option>
                      <option value="cylinders_19kg">19 kg LPG Commercial Cylinder</option>
                      <option value="cylinders_14.2kg">14.2 kg LPG Cylinder</option>
                      <option value="m3">m3 (Cubic Metres)</option>
                      <option value="km">km (Distance)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Audit Notes / Institutional Context
                </label>
                <input
                  type="text"
                  placeholder="e.g. Verified against substation incomer tariff bill and CEA User Guide v19"
                  value={calcNotes}
                  onChange={(e) => setCalcNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Action Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={executingCalc}
                  className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs transition-colors shadow-sm shadow-emerald-900/30"
                >
                  {executingCalc ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
                  <span>Execute Deterministic Calculation</span>
                </button>
              </div>
            </form>
          </div>

          {/* =====================================================================
              CALCULATION BREAKDOWN RESULT CARD
              ===================================================================== */}
          {latestResult && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5 animate-fadeIn">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                        latestResult.scope === 'scope_1'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : latestResult.scope === 'scope_2'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      }`}
                    >
                      {latestResult.scope.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-400">
                      Reporting Date: <strong className="text-slate-200">{latestResult.reporting_date}</strong>
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs text-slate-400">
                      Block: <strong className="text-slate-200">{latestResult.block_name || latestResult.block_id}</strong>
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-100 mt-1">
                    {latestResult.activity_code.replace(/_/g, ' ')}
                  </h3>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Calculated Greenhouse Gas Emissions</span>
                  <div className="flex items-baseline justify-end space-x-2">
                    <span className="text-3xl font-bold font-mono text-emerald-400">
                      {latestResult.emissions_kg_co2e.toLocaleString()}
                    </span>
                    <span className="text-sm font-semibold text-slate-300">kg CO2e</span>
                  </div>
                  <span className="text-xs font-mono text-slate-400 block mt-0.5">
                    ({latestResult.emissions_t_co2e.toLocaleString()} tonnes CO2e)
                  </span>
                </div>
              </div>

              {/* Detailed Audit Breakdown Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* 1. Input Lineage */}
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-2">
                  <div className="font-semibold text-slate-300 flex items-center space-x-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                    <span>Activity Data Lineage</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Reported Telemetry</span>
                    <span className="font-mono text-slate-200 font-semibold text-sm">
                      {latestResult.reported_quantity.toLocaleString()} {latestResult.reported_unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Standardized Activity Data</span>
                    <span className="font-mono text-emerald-400 font-semibold">
                      {latestResult.standardized_quantity.toLocaleString()} {latestResult.standardized_unit}
                    </span>
                    {latestResult.conversion_steps && (
                      <span className="block text-[11px] text-slate-400 font-mono mt-0.5">
                        {latestResult.conversion_steps}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 block">Reporting Source</span>
                    <span className="text-slate-300 uppercase font-semibold text-[10px]">
                      {latestResult.selected_reporting_source}
                    </span>
                    {latestResult.selection_reason && (
                      <span className="block text-[11px] text-slate-400 mt-0.5">
                        {latestResult.selection_reason}
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Factor Citation */}
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-2">
                  <div className="font-semibold text-slate-300 flex items-center space-x-1.5">
                    <Database className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Emission Factor Citation</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Factor Code & Version</span>
                    <span className="font-mono text-slate-200 font-semibold text-sm">
                      {latestResult.emission_factor_code} (v{latestResult.emission_factor_version})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Factor Value</span>
                    <span className="font-mono text-emerald-400 font-semibold">
                      {latestResult.emission_factor_value} {latestResult.emission_factor_unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Authoritative Source</span>
                    <span className="text-slate-300 block truncate" title={latestResult.emission_factor_source}>
                      {latestResult.emission_factor_source}
                    </span>
                  </div>
                </div>

                {/* 3. Mathematical Formula */}
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-2">
                  <div className="font-semibold text-slate-300 flex items-center space-x-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Audit Verification</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Calculation Method</span>
                    <span className="font-mono text-slate-200 text-xs block bg-slate-900 border border-slate-800 p-1.5 rounded">
                      {latestResult.formula}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Verification Status</span>
                    <span className="inline-flex items-center space-x-1 text-emerald-400 font-semibold uppercase text-[10px]">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{latestResult.status} (v{latestResult.version})</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Audit Record ID</span>
                    <span className="font-mono text-[10px] text-slate-400 block truncate">
                      {latestResult.id}
                    </span>
                  </div>
                </div>
              </div>

              {/* Warnings / Methodology Callouts */}
              {latestResult.validation_warnings && latestResult.validation_warnings.length > 0 && (
                <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-lg text-xs space-y-1">
                  <div className="font-semibold text-amber-400 flex items-center space-x-1.5">
                    <Info className="w-3.5 h-3.5" />
                    <span>Safeguards & Methodology Observations</span>
                  </div>
                  {latestResult.validation_warnings.map((w, i) => (
                    <p key={i} className="text-amber-300/80 pl-5">
                      • {w}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: EMISSION FACTOR CATALOGUE
          ========================================================================= */}
      {activeTab === 'factors' && (
        <div className="space-y-6">
          {/* Filter Toolbar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search factors or sources..."
                  value={factorSearch}
                  onChange={(e) => setFactorSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">Scope:</span>
                <select
                  value={scopeFilter}
                  onChange={(e) => setScopeFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">All Scopes</option>
                  <option value="scope_1">Scope 1 (Direct)</option>
                  <option value="scope_2">Scope 2 (Electricity)</option>
                  <option value="scope_3">Scope 3 (Waste/Other)</option>
                </select>
              </div>
            </div>

            <button
              onClick={fetchFactors}
              disabled={loadingFactors}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${loadingFactors ? 'animate-spin' : ''}`} />
              <span>Refresh Catalogue</span>
            </button>
          </div>

          {loadingFactors ? (
            <div className="p-12 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
              <RotateCcw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
              <span>Loading emission factor catalogue...</span>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200">
                  Authoritative Greenhouse Gas Emission Factors ({factors.length} total)
                </h3>
                <span className="text-xs text-slate-400">
                  Traceable to Indian CEA, IPCC 2006, and MoEFCC Guidelines
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3">Factor Code & Scope</th>
                      <th className="px-4 py-3">Name & Applicable Activity</th>
                      <th className="px-4 py-3 text-right">Value</th>
                      <th className="px-4 py-3">Unit</th>
                      <th className="px-4 py-3">Source Authority</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {factors.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-mono font-bold text-slate-200">{f.factor_code}</div>
                          <span
                            className={`text-[10px] px-2 py-0.2 rounded font-semibold uppercase ${
                              f.scope === 'scope_1'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : f.scope === 'scope_2'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            }`}
                          >
                            {f.scope.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-200">{f.name}</div>
                          <span className="text-[10px] font-mono text-slate-400">
                            Activity: {f.applicable_activity_code || 'Generic'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400 text-sm">
                          {f.factor_value}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-300">
                          {f.factor_unit}
                        </td>
                        <td className="px-4 py-3 max-w-xs truncate text-slate-400" title={f.reference_document}>
                          <div className="text-slate-300 font-medium">{f.source_organization}</div>
                          <div className="text-[10px] text-slate-500 truncate">{f.reference_document}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                              f.status === 'verified'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : f.status === 'provisional'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {f.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setSelectedFactorDetail(f)}
                            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Factor Details Modal */}
          {selectedFactorDetail && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
              <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-100">{selectedFactorDetail.name}</h3>
                    <span className="text-xs font-mono text-emerald-400">{selectedFactorDetail.factor_code} (v{selectedFactorDetail.version})</span>
                  </div>
                  <button
                    onClick={() => setSelectedFactorDetail(null)}
                    className="text-slate-400 hover:text-slate-200 text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block">Factor Value</span>
                    <span className="font-mono text-base font-bold text-emerald-400">
                      {selectedFactorDetail.factor_value} {selectedFactorDetail.factor_unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Scope & Category</span>
                    <span className="text-slate-200 font-medium uppercase">
                      {selectedFactorDetail.scope.replace('_', ' ')} • {selectedFactorDetail.category}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Geography / Jurisdiction</span>
                    <span className="text-slate-200 font-medium">{selectedFactorDetail.geography}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Publication & Effective Date</span>
                    <span className="text-slate-200 font-medium">
                      {selectedFactorDetail.publication_year} (Effective: {selectedFactorDetail.effective_start_date})
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block">Source Organization & Citation</span>
                    <span className="text-slate-200 font-medium block">{selectedFactorDetail.source_organization}</span>
                    <span className="text-slate-400 block mt-0.5">{selectedFactorDetail.reference_document}</span>
                    {selectedFactorDetail.reference_url && (
                      <a
                        href={selectedFactorDetail.reference_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:underline inline-flex items-center space-x-1 mt-1"
                      >
                        <span>{selectedFactorDetail.reference_url}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block">Calculation Methodology & Assumptions</span>
                    <p className="text-slate-300 mt-1 bg-slate-950 p-2.5 rounded border border-slate-800">
                      {selectedFactorDetail.calculation_methodology || 'Tier 1 default methodology.'}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setSelectedFactorDetail(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: CALCULATION HISTORY & AUDIT LOG
          ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">From Date</label>
                <input
                  type="date"
                  value={historyStartDate}
                  onChange={(e) => setHistoryStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">To Date</label>
                <input
                  type="date"
                  value={historyEndDate}
                  onChange={(e) => setHistoryEndDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Campus Block</label>
                <select
                  value={historyBlockId}
                  onChange={(e) => setHistoryBlockId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">All 27 Blocks</option>
                  {blocks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} ({b.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Scope</label>
                <select
                  value={historyScope}
                  onChange={(e) => setHistoryScope(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">All Scopes</option>
                  <option value="scope_1">Scope 1</option>
                  <option value="scope_2">Scope 2</option>
                  <option value="scope_3">Scope 3</option>
                </select>
              </div>
            </div>

            <button
              onClick={fetchHistory}
              disabled={loadingHistory}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
              <span>Query Audit Ledger</span>
            </button>
          </div>

          {loadingHistory ? (
            <div className="p-12 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
              <RotateCcw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
              <span>Querying institutional carbon accounting records...</span>
            </div>
          ) : !calculationsData ? (
            <div className="p-12 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
              <span>Execute a query to inspect past calculation records</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Aggregation Summary KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <span className="text-xs text-slate-400 block">Institutional Total</span>
                  <span className="text-xl font-bold font-mono text-emerald-400">
                    {(calculationsData.total_emissions_kg_co2e ?? 0).toLocaleString()} kg CO2e
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    ({(calculationsData.total_emissions_t_co2e ?? 0).toLocaleString()} t CO2e)
                  </span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <span className="text-xs text-slate-400 block">Scope 1 (Direct Fuels)</span>
                  <span className="text-xl font-bold font-mono text-amber-400">
                    {(calculationsData.by_scope?.['scope_1'] ?? 0).toLocaleString()} kg CO2e
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {(((calculationsData.by_scope?.['scope_1'] ?? 0) / (calculationsData.total_emissions_kg_co2e || 1)) * 100).toFixed(1)}% of total
                  </span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <span className="text-xs text-slate-400 block">Scope 2 (Purchased Grid)</span>
                  <span className="text-xl font-bold font-mono text-blue-400">
                    {(calculationsData.by_scope?.['scope_2'] ?? 0).toLocaleString()} kg CO2e
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {(((calculationsData.by_scope?.['scope_2'] ?? 0) / (calculationsData.total_emissions_kg_co2e || 1)) * 100).toFixed(1)}% of total
                  </span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <span className="text-xs text-slate-400 block">Scope 3 (Waste / Value Chain)</span>
                  <span className="text-xl font-bold font-mono text-purple-400">
                    {(calculationsData.by_scope?.['scope_3'] ?? 0).toLocaleString()} kg CO2e
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {(((calculationsData.by_scope?.['scope_3'] ?? 0) / (calculationsData.total_emissions_kg_co2e || 1)) * 100).toFixed(1)}% of total
                  </span>
                </div>
              </div>

              {/* Day-by-Day Audit Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-200">
                    Calculated Emissions Audit Trail ({calculationsData.items.length} records)
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    Reproducible historical calculations
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Date & Block</th>
                        <th className="px-4 py-3">Activity & Category</th>
                        <th className="px-4 py-3">Scope</th>
                        <th className="px-4 py-3 text-right">Standardized Input</th>
                        <th className="px-4 py-3">Factor Used</th>
                        <th className="px-4 py-3 text-right">Emissions (kg CO2e)</th>
                        <th className="px-4 py-3">Source & Status</th>
                        <th className="px-4 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {calculationsData.items.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3 text-slate-300 font-sans font-medium">
                            <div>{r.reporting_date}</div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {r.block_code || r.block_name || r.block_id}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-slate-200 font-sans font-medium">
                            <div>{r.activity_code.replace(/_/g, ' ')}</div>
                            <span className="text-[10px] text-slate-400 uppercase font-mono">{r.activity_category}</span>
                          </td>

                          <td className="px-4 py-3 font-sans">
                            <span
                              className={`text-[10px] px-2 py-0.2 rounded font-semibold uppercase ${
                                r.scope === 'scope_1'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : r.scope === 'scope_2'
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                  : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              }`}
                            >
                              {r.scope.replace('_', ' ')}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-right text-slate-200 font-semibold">
                            {r.standardized_quantity.toLocaleString()} {r.standardized_unit}
                          </td>

                          <td className="px-4 py-3 text-slate-300">
                            <div>{r.emission_factor_code} (v{r.emission_factor_version})</div>
                            <span className="text-[10px] text-slate-400">
                              {r.emission_factor_value} {r.emission_factor_unit}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-right font-bold text-emerald-400 text-sm">
                            {r.emissions_kg_co2e.toLocaleString()} kg
                          </td>

                          <td className="px-4 py-3 font-sans">
                            <div className="flex items-center space-x-1.5">
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded uppercase font-semibold ${
                                  r.selected_reporting_source === 'measured'
                                    ? 'bg-blue-500/10 text-blue-400'
                                    : 'bg-emerald-500/10 text-emerald-400'
                                }`}
                              >
                                {r.selected_reporting_source}
                              </span>
                              <span className="text-[10px] text-slate-400">v{r.version}</span>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-center font-sans">
                            <button
                              onClick={() => {
                                setRecalcModalRecord(r);
                                setRecalcReason('');
                              }}
                              className="inline-flex items-center space-x-1 text-slate-400 hover:text-emerald-400 text-xs transition-colors"
                              title="Safely recalculate using updated factors or parameters"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Recalculate</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Recalculate Modal */}
          {recalcModalRecord && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
              <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                    <RotateCcw className="w-4 h-4 text-emerald-400" />
                    <span>Safe Recalculation Request</span>
                  </h3>
                  <button
                    onClick={() => setRecalcModalRecord(null)}
                    className="text-slate-400 hover:text-slate-200 text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="text-xs space-y-3">
                  <p className="text-slate-300">
                    Recalculating will generate an audited <strong>v{recalcModalRecord.version + 1}</strong> record.
                    The current <strong>v{recalcModalRecord.version}</strong> record will be marked as superseded,
                    preserving complete historical reproducibility.
                  </p>

                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1 font-mono">
                    <div>Activity: <span className="text-slate-200">{recalcModalRecord.activity_code}</span></div>
                    <div>Date: <span className="text-slate-200">{recalcModalRecord.reporting_date}</span></div>
                    <div>Current Emissions: <span className="text-emerald-400">{recalcModalRecord.emissions_kg_co2e} kg CO2e</span></div>
                    <div>Factor Code: <span className="text-slate-200">{recalcModalRecord.emission_factor_code} (v{recalcModalRecord.emission_factor_version})</span></div>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider">
                      Recalculation Audit Reason *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Annual emission factor update published by CEA"
                      value={recalcReason}
                      onChange={(e) => setRecalcReason(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    onClick={() => setRecalcModalRecord(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRecalculate}
                    disabled={savingRecalc}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium inline-flex items-center space-x-1.5"
                  >
                    {savingRecalc ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Confirm Recalculation</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
