import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2,
  Plus,
  Search,
  RotateCcw,
  Pencil,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Users,
  Maximize2,
  MapPin,
  School,
  X,
} from 'lucide-react';
import { apiClient } from '../api/client';
import {
  CampusBlock,
  BlockCategory,
  CategoryStat,
  Campus,
  BlockCreatePayload,
  BlockUpdatePayload,
} from '../types';

const CATEGORY_CONFIG: Record<
  BlockCategory,
  { label: string; badgeClass: string; borderClass: string }
> = {
  academic: {
    label: 'Academic',
    badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    borderClass: 'border-blue-500/30',
  },
  hostel: {
    label: 'Hostels',
    badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    borderClass: 'border-purple-500/30',
  },
  faculty_quarters: {
    label: 'Faculty Quarters',
    badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    borderClass: 'border-indigo-500/30',
  },
  kitchen_canteen: {
    label: 'Kitchens & Canteens',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    borderClass: 'border-amber-500/30',
  },
  transportation: {
    label: 'Transportation',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    borderClass: 'border-emerald-500/30',
  },
  sewage_treatment: {
    label: 'Sewage Treatment',
    badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    borderClass: 'border-cyan-500/30',
  },
  other_facility: {
    label: 'Other Facilities',
    badgeClass: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
    borderClass: 'border-slate-500/30',
  },
};

const CATEGORIES_ORDER: BlockCategory[] = [
  'academic',
  'hostel',
  'faculty_quarters',
  'kitchen_canteen',
  'transportation',
  'sewage_treatment',
  'other_facility',
];

export const CampusBlocksPage: React.FC = () => {
  const [activeCampus, setActiveCampus] = useState<Campus | null>(null);
  const [blocks, setBlocks] = useState<CampusBlock[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [editingBlock, setEditingBlock] = useState<CampusBlock | null>(null);
  const [deletingBlock, setDeletingBlock] = useState<CampusBlock | null>(null);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form inputs
  const [formName, setFormName] = useState<string>('');
  const [formCode, setFormCode] = useState<string>('');
  const [formCategory, setFormCategory] = useState<BlockCategory>('academic');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formFloorArea, setFormFloorArea] = useState<string>('');
  const [formCapacity, setFormCapacity] = useState<string>('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch campuses
      const campusList = await apiClient.getCampuses();

      let targetCampus = campusList.find((c) => c.code === 'CBE') || campusList[0] || null;

      // If no campus exists yet, trigger seed automatically to establish canonical inventory
      if (!targetCampus) {
        await apiClient.seedInventory();
        const updatedList = await apiClient.getCampuses();
        targetCampus = updatedList.find((c) => c.code === 'CBE') || updatedList[0] || null;
      }

      setActiveCampus(targetCampus);

      if (targetCampus) {
        // 2. Fetch blocks for the active campus
        const blockListResponse = await apiClient.getBlocks({
          campus_id: targetCampus.id,
        });
        setBlocks(blockListResponse.items);
        setCategoryStats(blockListResponse.category_summary);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load campus inventory.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Flash success messages
  const showSuccess = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  // Seeding trigger
  const handleSeedCanonical = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.seedInventory();
      showSuccess(
        `Canonical inventory refreshed: ${res.blocks_specification_count} blocks in ${res.campus.name}.`
      );
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Seeding failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setFormName('');
    setFormCode('');
    setFormCategory('academic');
    setFormDescription('');
    setFormFloorArea('');
    setFormCapacity('');
    setFormError(null);
    setIsCreateOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (b: CampusBlock) => {
    setEditingBlock(b);
    setFormName(b.name);
    setFormCode(b.code);
    setFormCategory(b.category);
    setFormDescription(b.description || '');
    setFormFloorArea(b.floor_area_sqm ? String(b.floor_area_sqm) : '');
    setFormCapacity(b.occupant_capacity ? String(b.occupant_capacity) : '');
    setFormError(null);
  };

  // Submit Create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCampus) return;
    if (!formName.trim() || !formCode.trim()) {
      setFormError('Please enter both Block Title and Unique Code.');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);
    try {
      const payload: BlockCreatePayload = {
        campus_id: activeCampus.id,
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        category: formCategory,
        description: formDescription.trim() || undefined,
        floor_area_sqm: formFloorArea ? parseFloat(formFloorArea) : undefined,
        occupant_capacity: formCapacity ? parseInt(formCapacity, 10) : undefined,
        is_active: true,
      };

      await apiClient.createBlock(payload);
      setIsCreateOpen(false);
      showSuccess(`Block "${payload.name}" added successfully.`);
      await loadData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to register block.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBlock) return;
    if (!formName.trim() || !formCode.trim()) {
      setFormError('Please enter both Block Title and Unique Code.');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);
    try {
      const payload: BlockUpdatePayload = {
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        category: formCategory,
        description: formDescription.trim() || undefined,
        floor_area_sqm: formFloorArea ? parseFloat(formFloorArea) : undefined,
        occupant_capacity: formCapacity ? parseInt(formCapacity, 10) : undefined,
      };

      await apiClient.updateBlock(editingBlock.id, payload);
      setEditingBlock(null);
      showSuccess(`Block "${payload.name}" updated successfully.`);
      await loadData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to update block.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Submit Delete
  const handleDeleteConfirm = async () => {
    if (!deletingBlock) return;
    setFormSubmitting(true);
    try {
      await apiClient.deleteBlock(deletingBlock.id);
      showSuccess(`Block "${deletingBlock.name}" removed from inventory.`);
      setDeletingBlock(null);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete block.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Filtered blocks based on category and search query
  const filteredBlocks = useMemo(() => {
    return blocks.filter((b) => {
      const matchesCategory =
        selectedCategory === 'all' || b.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        b.name.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        (b.description && b.description.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [blocks, selectedCategory, searchQuery]);

  // Overall campus summary figures
  const totalFloorArea = useMemo(() => {
    return blocks.reduce((acc, b) => acc + (b.floor_area_sqm || 0), 0);
  }, [blocks]);

  const totalOccupantCapacity = useMemo(() => {
    return blocks.reduce((acc, b) => acc + (b.occupant_capacity || 0), 0);
  }, [blocks]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <School className="w-4 h-4" />
            <span>Amrita Vishwa Vidyapeetham</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">Coimbatore Campus (AVV-CBE)</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-3">
            <span>Campus & Block Inventory</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              Phase 2 Active
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Physical boundary tracking, facility categorization, built-up gross floor area, and occupancy metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSeedCanonical}
            disabled={isLoading}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-colors"
            title="Idempotently ensure all 27 canonical Coimbatore blocks exist"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Canonical (27)</span>
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Block</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadData}
            className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 rounded text-rose-300 font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Campus KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Blocks</span>
            <Building2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">{blocks.length}</div>
          <div className="text-xs text-slate-500 mt-1">27 Canonical Facilities</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Built-up Floor Area</span>
            <Maximize2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {totalFloorArea > 0 ? `${(totalFloorArea / 1000).toFixed(1)}k m²` : '—'}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {totalFloorArea.toLocaleString()} m² Gross Area
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Occupant Capacity</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {totalOccupantCapacity > 0 ? totalOccupantCapacity.toLocaleString() : '—'}
          </div>
          <div className="text-xs text-slate-500 mt-1">Design Student & Staff Capacity</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Campus Site</span>
            <MapPin className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-base font-semibold text-slate-100 truncate">
            {activeCampus?.location ? 'Ettimadai, CBE' : 'Coimbatore Campus'}
          </div>
          <div className="text-xs text-slate-500 mt-1">7 Facility Categories</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center space-x-1.5 ${
              selectedCategory === 'all'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span>All Facilities</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-950/40 text-[10px]">
              {blocks.length}
            </span>
          </button>

          {CATEGORIES_ORDER.map((catKey) => {
            const meta = CATEGORY_CONFIG[catKey];
            const stat = categoryStats.find((s) => s.category === catKey);
            const count = stat ? stat.count : 0;
            const isSelected = selectedCategory === catKey;

            return (
              <button
                key={catKey}
                onClick={() => setSelectedCategory(catKey)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span>{meta.label}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-950/40 text-[10px]">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search blocks by name, code (e.g. AB1, Gargi, STP) or description..."
              className="w-full pl-9 pr-8 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {(selectedCategory !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="px-3 py-2 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium whitespace-nowrap transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="p-5 rounded-xl bg-slate-900 border border-slate-800 animate-pulse space-y-3"
            >
              <div className="h-4 bg-slate-800 rounded w-1/3" />
              <div className="h-6 bg-slate-800 rounded w-3/4" />
              <div className="h-3 bg-slate-800 rounded w-full" />
              <div className="h-3 bg-slate-800 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Blocks Grid */}
      {!isLoading && filteredBlocks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBlocks.map((b) => {
            const catMeta = CATEGORY_CONFIG[b.category] || {
              label: b.category,
              badgeClass: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
              borderClass: 'border-slate-800',
            };

            return (
              <div
                key={b.id}
                className={`p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group shadow-sm`}
              >
                <div>
                  {/* Category and Code Header */}
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${catMeta.badgeClass}`}
                    >
                      {catMeta.label}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {b.code}
                    </span>
                  </div>

                  {/* Block Title */}
                  <h3 className="text-base font-semibold text-slate-100 group-hover:text-emerald-400 transition-colors">
                    {b.name}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                    {b.description || 'No detailed facility description provided.'}
                  </p>
                </div>

                {/* Metrics and Actions Bar */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center space-x-3">
                    {b.floor_area_sqm ? (
                      <span className="flex items-center space-x-1" title="Gross Built-up Floor Area">
                        <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>{b.floor_area_sqm.toLocaleString()} m²</span>
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}

                    {b.occupant_capacity ? (
                      <span className="flex items-center space-x-1" title="Occupant Capacity">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span>{b.occupant_capacity.toLocaleString()}</span>
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => openEditModal(b)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                      title="Edit Block"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingBlock(b)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Delete Block"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredBlocks.length === 0 && (
        <div className="p-12 text-center rounded-xl bg-slate-900 border border-slate-800">
          <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No Facilities Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery
              ? `No campus blocks match "${searchQuery}". Try adjusting your keywords or clearing the filter.`
              : 'No facilities match the selected category.'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-medium"
            >
              Clear Filters
            </button>
            <button
              onClick={handleSeedCanonical}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium"
            >
              Seed Canonical 27 Blocks
            </button>
          </div>
        </div>
      )}

      {/* Modal: Create Block */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-semibold text-slate-100">Add Campus Block</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Block Title <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Academic Block 5"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Unique Code <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="e.g. AB5"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs uppercase focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Operational Category <span className="text-rose-400">*</span>
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as BlockCategory)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                >
                  {CATEGORIES_ORDER.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_CONFIG[c].label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Gross Built-up Area (m²)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formFloorArea}
                    onChange={(e) => setFormFloorArea(e.target.value)}
                    placeholder="e.g. 14500"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Occupant Capacity
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(e.target.value)}
                    placeholder="e.g. 1200"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Facility Description
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Operational details, laboratories, equipment..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {formSubmitting ? 'Registering...' : 'Add Block'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Block */}
      {editingBlock && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Pencil className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-semibold text-slate-100">
                  Edit Block: {editingBlock.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingBlock(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Block Title <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Unique Code <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs uppercase focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Operational Category <span className="text-rose-400">*</span>
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as BlockCategory)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                >
                  {CATEGORIES_ORDER.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_CONFIG[c].label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Gross Built-up Area (m²)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formFloorArea}
                    onChange={(e) => setFormFloorArea(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Occupant Capacity
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Facility Description
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingBlock(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {formSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {deletingBlock && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-xl overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-semibold text-slate-100">Confirm Deletion</h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to remove <strong className="text-slate-200">{deletingBlock.name}</strong> ({deletingBlock.code}) from campus inventory?
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingBlock(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={formSubmitting}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {formSubmitting ? 'Removing...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
