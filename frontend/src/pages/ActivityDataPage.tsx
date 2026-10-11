import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Activity,
  Plus,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Pencil,
  Trash2,
  Info,
  Scale,
  FileText,
  X,
  History,
} from 'lucide-react';
import { apiClient } from '../api/client';
import {
  CampusBlock,
  ActivityDefinition,
  BlockActivityAssignment,
  DailyActivityRecord,
  DailyRecordCreatePayload,
  DailyRecordUpdatePayload,
  MeasurementDataStatus,
} from '../types';

export const ActivityDataPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'entry' | 'history'>('entry');

  // Master Data
  const [blocks, setBlocks] = useState<CampusBlock[]>([]);
  const [allActivities, setAllActivities] = useState<ActivityDefinition[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string>('');
  const [blockAssignments, setBlockAssignments] = useState<BlockActivityAssignment[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');

  // Form State
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [reportingDate, setReportingDate] = useState<string>(todayStr);
  const [quantity, setQuantity] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [dataStatus, setDataStatus] = useState<MeasurementDataStatus>('measured');
  const [measurementMethod, setMeasurementMethod] = useState<string>('utility_meter');
  const [readingIdentifier, setReadingIdentifier] = useState<string>('official_daily_total');
  const [sourceReference, setSourceReference] = useState<string>('');
  const [destinationDetails, setDestinationDetails] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // History & Table State
  const [records, setRecords] = useState<DailyActivityRecord[]>([]);
  const [historyFilterBlock, setHistoryFilterBlock] = useState<string>('');
  const [historyFilterActivity, setHistoryFilterActivity] = useState<string>('');
  const [historyStartDate, setHistoryStartDate] = useState<string>('');
  const [historyEndDate, setHistoryEndDate] = useState<string>('');
  const [historyFilterStatus, setHistoryFilterStatus] = useState<string>('');

  // UI & Loading States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edit & Delete Modals
  const [editingRecord, setEditingRecord] = useState<DailyActivityRecord | null>(null);
  const [editQuantity, setEditQuantity] = useState<string>('');
  const [editUnit, setEditUnit] = useState<string>('');
  const [editDataStatus, setEditDataStatus] = useState<MeasurementDataStatus>('measured');
  const [editMethod, setEditMethod] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [deletingRecord, setDeletingRecord] = useState<DailyActivityRecord | null>(null);

  // Load initial master data (blocks, activities, recent records)
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch blocks
      const blockRes = await apiClient.getBlocks();
      setBlocks(blockRes.items);

      // If no blocks, seed Phase 2
      let initialBlockId = '';
      if (blockRes.items.length > 0) {
        initialBlockId = blockRes.items[0].id;
        setSelectedBlockId(initialBlockId);
      }

      // 2. Fetch all activities catalogue
      let acts = await apiClient.getActivities();
      if (acts.length === 0) {
        await apiClient.seedPhase3Catalogue();
        acts = await apiClient.getActivities();
      }
      setAllActivities(acts);

      // 3. Fetch block activities for first block
      if (initialBlockId) {
        const blkActs = await apiClient.getBlockActivities(initialBlockId);
        setBlockAssignments(blkActs.activities);
        if (blkActs.activities.length > 0) {
          const firstAct = blkActs.activities[0].activity || acts[0];
          setSelectedActivityId(firstAct.id);
          setSelectedUnit(firstAct.default_unit);
        }
      }

      // 4. Fetch recent records
      const recRes = await apiClient.getActivityRecords({ limit: 50 });
      setRecords(recRes.items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to initialize activity data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // When selected block changes, load its assigned activities
  useEffect(() => {
    if (!selectedBlockId) return;
    const fetchBlockActs = async () => {
      try {
        const blkActs = await apiClient.getBlockActivities(selectedBlockId);
        setBlockAssignments(blkActs.activities);
        if (blkActs.activities.length > 0) {
          const firstAct = blkActs.activities[0].activity;
          if (firstAct) {
            setSelectedActivityId(firstAct.id);
            setSelectedUnit(firstAct.default_unit);
          }
        } else {
          setSelectedActivityId('');
          setSelectedUnit('');
        }
      } catch (err: unknown) {
        console.error('Failed to fetch block activities:', err);
      }
    };
    fetchBlockActs();
  }, [selectedBlockId]);

  // Selected Activity Object
  const selectedActivity = useMemo(() => {
    return allActivities.find((a) => a.id === selectedActivityId) || null;
  }, [allActivities, selectedActivityId]);

  // Update unit when selected activity changes
  useEffect(() => {
    if (selectedActivity) {
      setSelectedUnit(selectedActivity.default_unit);
    }
  }, [selectedActivity]);

  // Real-time conversion preview calculation
  const conversionPreview = useMemo(() => {
    if (!selectedActivity || !quantity || isNaN(parseFloat(quantity))) return null;
    const qty = parseFloat(quantity);
    if (qty < 0) return null;

    if (selectedUnit === selectedActivity.default_unit) {
      return `${qty} ${selectedActivity.default_unit}`;
    }

    const mult = selectedActivity.unit_conversions?.[selectedUnit];
    if (mult) {
      const converted = Math.round(qty * mult * 10000) / 10000;
      return `${qty} ${selectedUnit} = ${converted} ${selectedActivity.default_unit}`;
    }
    return `${qty} ${selectedUnit}`;
  }, [selectedActivity, quantity, selectedUnit]);

  // Fetch filtered history records
  const fetchRecords = useCallback(async () => {
    try {
      const res = await apiClient.getActivityRecords({
        block_id: historyFilterBlock || undefined,
        activity_id: historyFilterActivity || undefined,
        start_date: historyStartDate || undefined,
        end_date: historyEndDate || undefined,
        data_status: historyFilterStatus || undefined,
        limit: 100,
      });
      setRecords(res.items);
    } catch (err: unknown) {
      console.error('Failed to fetch filtered records:', err);
    }
  }, [historyFilterBlock, historyFilterActivity, historyStartDate, historyEndDate, historyFilterStatus]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchRecords();
    }
  }, [activeTab, fetchRecords]);

  // Submit new daily record
  const handleSubmitRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!selectedBlockId || !selectedActivityId) {
      setError('Please select both a Campus Block and an Activity.');
      return;
    }

    const numQty = parseFloat(quantity);
    if (isNaN(numQty) || numQty < 0) {
      setError('Please enter a valid non-negative quantity.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: DailyRecordCreatePayload = {
        block_id: selectedBlockId,
        activity_id: selectedActivityId,
        reporting_date: reportingDate,
        quantity: numQty,
        unit: selectedUnit,
        data_status: dataStatus,
        measurement_method: measurementMethod,
        reading_identifier: readingIdentifier.trim() || 'official_daily_total',
        is_daily_total: readingIdentifier.trim() === 'official_daily_total' || !readingIdentifier.trim(),
        source_reference: sourceReference.trim() || undefined,
        destination_details: destinationDetails.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const created = await apiClient.createActivityRecord(payload);
      setSuccessMsg(
        `Successfully logged ${created.quantity} ${created.unit} (${created.standardized_quantity} ${created.standardized_unit}) for ${created.block_name || 'Block'} on ${created.reporting_date}.`
      );

      // Reset quantity and notes
      setQuantity('');
      setNotes('');
      setSourceReference('');
      setDestinationDetails('');

      // Refresh records
      await fetchRecords();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit daily record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Re-seed catalogue
  const handleSeedCatalogue = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.seedPhase3Catalogue();
      setSuccessMsg(
        `Activity catalogue updated: ${res.total_activities} activities, ${res.total_assignments} assignments active.`
      );
      await loadInitialData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Seeding failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (rec: DailyActivityRecord) => {
    setEditingRecord(rec);
    setEditQuantity(String(rec.quantity));
    setEditUnit(rec.unit);
    setEditDataStatus(rec.data_status);
    setEditMethod(rec.measurement_method);
    setEditNotes(rec.notes || '');
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    const numQty = parseFloat(editQuantity);
    if (isNaN(numQty) || numQty < 0) {
      setError('Quantity cannot be negative.');
      return;
    }

    try {
      const payload: DailyRecordUpdatePayload = {
        quantity: numQty,
        unit: editUnit,
        data_status: editDataStatus,
        measurement_method: editMethod,
        notes: editNotes.trim() || undefined,
      };

      await apiClient.updateActivityRecord(editingRecord.id, payload);
      setEditingRecord(null);
      setSuccessMsg('Record updated and audited successfully.');
      await fetchRecords();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update record.');
    }
  };

  // Confirm Delete
  const handleDeleteConfirm = async () => {
    if (!deletingRecord) return;
    try {
      await apiClient.deleteActivityRecord(deletingRecord.id);
      setDeletingRecord(null);
      setSuccessMsg('Activity record deleted.');
      await fetchRecords();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete record.');
    }
  };

  // Handler to load duplicate record directly into edit modal
  const handleEditDuplicateRecord = async (recId: string) => {
    try {
      const rec = await apiClient.getActivityRecordById(recId);
      openEditModal(rec);
      if (quantity && !isNaN(parseFloat(quantity))) {
        setEditQuantity(quantity);
      }
      if (selectedUnit) {
        setEditUnit(selectedUnit);
      }
      if (dataStatus) {
        setEditDataStatus(dataStatus);
      }
      if (measurementMethod) {
        setEditMethod(measurementMethod);
      }
      if (notes) {
        setEditNotes(notes);
      }
    } catch {
      setActiveTab('history');
      setHistoryFilterBlock(selectedBlockId);
      setHistoryFilterActivity(selectedActivityId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <Activity className="w-4 h-4" />
            <span>Amrita Vishwa Vidyapeetham</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">Coimbatore Campus (AVV-CBE)</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-3">
            <span>Daily Activity Telemetry & Entry</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              Phase 3 Active
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Database-backed activity catalogue, daily resource consumption entries, unit standardization, and audit logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSeedCatalogue}
            disabled={isLoading}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-colors"
            title="Idempotently ensure all 28 canonical activities and 215 assignments are loaded"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Catalogue (28)</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (() => {
        const duplicateMatch = error.match(/\/api\/v1\/activity-records\/([a-f0-9-]+)/);
        const duplicateRecordId = duplicateMatch ? duplicateMatch[1] : null;

        return (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            {duplicateRecordId && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-rose-500/20">
                <button
                  type="button"
                  onClick={() => handleEditDuplicateRecord(duplicateRecordId)}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center space-x-1.5 transition-colors shadow-sm"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Update Existing Measurement Now</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('history');
                    setHistoryFilterBlock(selectedBlockId);
                    setHistoryFilterActivity(selectedActivityId);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                >
                  View in History & Audit Log
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* Tab Selector */}
      <div className="flex items-center border-b border-slate-800 space-x-6 text-sm">
        <button
          onClick={() => setActiveTab('entry')}
          className={`pb-3 font-medium flex items-center space-x-2 transition-colors relative ${
            activeTab === 'entry'
              ? 'text-emerald-400 border-b-2 border-emerald-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>New Daily Entry</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 font-medium flex items-center space-x-2 transition-colors relative ${
            activeTab === 'history'
              ? 'text-emerald-400 border-b-2 border-emerald-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Daily History & Audit Log</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px]">
            {records.length}
          </span>
        </button>
      </div>

      {/* TAB 1: NEW DAILY ENTRY FORM */}
      {activeTab === 'entry' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Card */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
            <h2 className="text-base font-semibold text-slate-100 flex items-center space-x-2 mb-4">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Record Daily Activity Measurement</span>
            </h2>

            <form onSubmit={handleSubmitRecord} className="space-y-4">
              {/* Row 1: Target Block & Reporting Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Campus Block / Facility <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={selectedBlockId}
                    onChange={(e) => setSelectedBlockId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                    required
                  >
                    {blocks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code}) — {b.category.replace('_', ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Reporting Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={reportingDate}
                    max={todayStr}
                    onChange={(e) => setReportingDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Activity Selector (filtered by selected block) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-300">
                    Activity Definition <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {blockAssignments.length} activities configured for this block
                  </span>
                </div>

                {blockAssignments.length > 0 ? (
                  <select
                    value={selectedActivityId}
                    onChange={(e) => setSelectedActivityId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                    required
                  >
                    {blockAssignments.map((a) => (
                      <option key={a.activity_id} value={a.activity_id}>
                        {a.activity?.name} [{a.activity?.default_unit}] — Category: {a.activity?.category.toUpperCase()}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                    No activities configured for this facility. Please select another block or assign activities.
                  </div>
                )}
              </div>

              {/* Row 3: Quantity & Unit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Reported Quantity <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Measurement Unit <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={selectedUnit}
                    onChange={(e) => setSelectedUnit(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                    required
                  >
                    {selectedActivity ? (
                      Array.from(
                        new Set([
                          selectedActivity.default_unit,
                          ...(selectedActivity.supported_units || []),
                        ])
                      ).map((u) => (
                        <option key={u} value={u}>
                          {u} {u === selectedActivity.default_unit ? '(Canonical Standard)' : ''}
                        </option>
                      ))
                    ) : (
                      <option value="">Select activity first</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Conversion Preview Indicator */}
              {conversionPreview && (
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center space-x-2">
                  <Scale className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-slate-400">Canonical Standardized Value:</span>
                  <strong className="text-emerald-400 font-mono">{conversionPreview}</strong>
                </div>
              )}

              {/* Row 4: Data Status & Measurement Method */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Data Quality Status <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={dataStatus}
                    onChange={(e) => setDataStatus(e.target.value as MeasurementDataStatus)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="measured">Measured (Meter / Weighbridge / Invoice)</option>
                    <option value="estimated">Estimated (Extrapolated / Calculated)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Measurement Method / Source <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={measurementMethod}
                    onChange={(e) => setMeasurementMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="utility_meter">Utility Primary Meter</option>
                    <option value="sub_meter">Dedicated Digital Sub-Meter</option>
                    <option value="invoice">Supplier Delivery Invoice / Bill</option>
                    <option value="weighbridge">Campus Weighbridge Scale</option>
                    <option value="logbook">Manual Run Logbook</option>
                    <option value="run_hours_log">Generator Run-Hours Telemetry</option>
                  </select>
                </div>
              </div>

              {/* Row 5: Reading Identifier & Source Reference */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Reading Identifier <span className="text-slate-500">(Default: official_daily_total)</span>
                  </label>
                  <input
                    type="text"
                    value={readingIdentifier}
                    onChange={(e) => setReadingIdentifier(e.target.value)}
                    placeholder="official_daily_total or trip_1 / submeter_a"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Source Reference / Invoice No.
                  </label>
                  <input
                    type="text"
                    value={sourceReference}
                    onChange={(e) => setSourceReference(e.target.value)}
                    placeholder="e.g. MTR-EB-042 or INV-LPG-8821"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* E-waste or Transfer Destination Details (if applicable) */}
              {(selectedActivity?.category === 'ewaste' || selectedActivity?.is_transfer_activity) && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Recycler / Destination Details
                  </label>
                  <input
                    type="text"
                    value={destinationDetails}
                    onChange={(e) => setDestinationDetails(e.target.value)}
                    placeholder="e.g. GreenE-Waste Authorized Dismantler, Coimbatore"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {/* Row 6: Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Audit Notes / Operational Observations
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional context, meter shift handover, or operational anomalies..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setQuantity('');
                    setNotes('');
                    setError(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                >
                  Reset Form
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || blockAssignments.length === 0}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving to Database...' : 'Submit Daily Record'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Activity Specs & Policy Info Card */}
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                <Info className="w-4 h-4 text-emerald-400" />
                <span>Selected Activity Specifications</span>
              </h3>

              {selectedActivity ? (
                <div className="space-y-2 text-xs text-slate-400">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                    <span className="text-slate-500 block text-[10px] uppercase">Title & Code</span>
                    <strong className="text-slate-200">{selectedActivity.name}</strong> ({selectedActivity.code})
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                    <span className="text-slate-500 block text-[10px] uppercase">Canonical Unit</span>
                    <span className="text-emerald-400 font-mono font-medium">{selectedActivity.default_unit}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                    <span className="text-slate-500 block text-[10px] uppercase">Supported Input Units</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Array.from(
                        new Set([
                          selectedActivity.default_unit,
                          ...(selectedActivity.supported_units || []),
                        ])
                      ).map((u) => (
                        <span
                          key={u}
                          className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]"
                        >
                          {u}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="text-[11px] leading-relaxed text-slate-500 pt-1">
                    {selectedActivity.description}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Select an activity to view conversion constraints.</p>
              )}
            </div>

            {/* Strict Policy Reminder */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-400 space-y-2">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
                Audit Integrity Guards
              </span>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
                <li>One official daily total per facility & activity per date.</li>
                <li>Hostel food waste is recorded at origin hostels.</li>
                <li>Waste transfer manifests do not duplicate generation.</li>
                <li>No carbon emission calculations in Phase 3.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DAILY HISTORY & AUDIT LOG */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* History Filters Bar */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
            {/* Filter: Block */}
            <div>
              <label className="block text-slate-400 mb-1">Filter by Block</label>
              <select
                value={historyFilterBlock}
                onChange={(e) => setHistoryFilterBlock(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
              >
                <option value="">All 27 Campus Blocks</option>
                {blocks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter: Activity */}
            <div>
              <label className="block text-slate-400 mb-1">Filter by Activity</label>
              <select
                value={historyFilterActivity}
                onChange={(e) => setHistoryFilterActivity(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
              >
                <option value="">All Activities</option>
                {allActivities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter: Data Status */}
            <div>
              <label className="block text-slate-400 mb-1">Data Quality Status</label>
              <select
                value={historyFilterStatus}
                onChange={(e) => setHistoryFilterStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
              >
                <option value="">All Statuses</option>
                <option value="measured">Measured Only</option>
                <option value="estimated">Estimated Only</option>
              </select>
            </div>

            {/* Filter: Date Range Start */}
            <div>
              <label className="block text-slate-400 mb-1">From Date</label>
              <input
                type="date"
                value={historyStartDate}
                onChange={(e) => setHistoryStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
              />
            </div>

            {/* Filter: Date Range End */}
            <div>
              <label className="block text-slate-400 mb-1">To Date</label>
              <input
                type="date"
                value={historyEndDate}
                onChange={(e) => setHistoryEndDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
              />
            </div>
          </div>

          {/* Records Table */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Facility Block</th>
                    <th className="px-4 py-3 font-semibold">Activity</th>
                    <th className="px-4 py-3 font-semibold">Reported Quantity</th>
                    <th className="px-4 py-3 font-semibold">Standardized Equivalent</th>
                    <th className="px-4 py-3 font-semibold">Status / Method</th>
                    <th className="px-4 py-3 font-semibold">Version</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/60">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-slate-300">{r.reporting_date}</td>
                      <td className="px-4 py-3 text-slate-200 font-medium">
                        {r.block_name || r.block_id}
                        {r.block_code && (
                          <span className="ml-1 text-[10px] text-slate-500 font-mono">({r.block_code})</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-200 font-medium">{r.activity_name || r.activity_id}</span>
                        {r.is_transfer && (
                          <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            Transfer
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-300">
                        {r.quantity.toLocaleString()} {r.unit}
                      </td>
                      <td className="px-4 py-3 font-mono text-emerald-400 font-semibold">
                        {r.standardized_quantity.toLocaleString()} {r.standardized_unit}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                            r.data_status === 'measured'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {r.data_status.toUpperCase()}
                        </span>
                        <span className="block text-[10px] text-slate-500 mt-0.5">
                          {r.measurement_method.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-center">v{r.version}</td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <button
                          onClick={() => openEditModal(r)}
                          className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                          title="Edit/Revise Record"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingRecord(r)}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {records.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                        No activity records found matching filters. Submit a record above to establish history.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Record */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-slate-100 flex items-center space-x-2">
                <Pencil className="w-4 h-4 text-emerald-400" />
                <span>Revise Activity Record</span>
              </h3>
              <button onClick={() => setEditingRecord(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">
                  Quantity ({editingRecord.activity_name})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Unit</label>
                <input
                  type="text"
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Data Quality Status</label>
                <select
                  value={editDataStatus}
                  onChange={(e) => setEditDataStatus(e.target.value as MeasurementDataStatus)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                >
                  <option value="measured">Measured</option>
                  <option value="estimated">Estimated</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Audit Revision Reason / Notes</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Document reason for adjustment..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                >
                  Save Revision (v{editingRecord.version + 1})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {deletingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-xl p-6 space-y-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-base font-semibold text-slate-100">Delete Record</h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to delete measurement of {deletingRecord.quantity} {deletingRecord.unit} on{' '}
                {deletingRecord.reporting_date}?
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingRecord(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
