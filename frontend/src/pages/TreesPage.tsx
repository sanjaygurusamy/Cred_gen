import React, { useState, useEffect } from 'react';
import {
  Trees,
  Sprout,
  Leaf,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Info,
  Scale,
  RefreshCw,
  Trash2,
  Layers,
  HeartHandshake
} from 'lucide-react';
import { apiClient } from '../api/client';
import {
  GreenSpace,
  TreeInventory,
  PlantationRecord,
  SequestrationSummary,
  CampusBlock
} from '../types';

export const TreesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'plantations' | 'greenspaces' | 'sequestration'>('inventory');
  
  // Data state
  const [summary, setSummary] = useState<SequestrationSummary | null>(null);
  const [trees, setTrees] = useState<TreeInventory[]>([]);
  const [plantations, setPlantations] = useState<PlantationRecord[]>([]);
  const [greenSpaces, setGreenSpaces] = useState<GreenSpace[]>([]);
  const [blocks, setBlocks] = useState<CampusBlock[]>([]);
  
  // UI & Loading state
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHealth, setSelectedHealth] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Modals state
  const [showTreeModal, setShowTreeModal] = useState(false);
  const [showPlantationModal, setShowPlantationModal] = useState(false);
  const [showSpaceModal, setShowSpaceModal] = useState(false);

  // Form states
  const [treeForm, setTreeForm] = useState({
    species_name: '',
    common_name: '',
    tree_count: 1,
    planting_year: new Date().getFullYear() - 5,
    estimated_age_years: 5,
    health_status: 'Healthy',
    location_description: '',
    data_source: 'Campus Tree Census 2024',
    verification_status: 'Verified Field Census',
    sequestration_rate_kg_year: 22.0,
    green_space_id: '',
    block_id: ''
  });

  const [plantationForm, setPlantationForm] = useState({
    event_name: '',
    plantation_date: new Date().toISOString().split('T')[0],
    species_planted: '',
    saplings_planted: 25,
    saplings_surviving: 24,
    plantation_location: '',
    maintenance_notes: '',
    green_space_id: '',
    block_id: ''
  });

  const [spaceForm, setSpaceForm] = useState({
    name: '',
    code: '',
    plantation_type: 'Miyawaki Forest',
    area_sqm: 1000,
    area_unit: 'sqm',
    description: '',
    block_id: ''
  });

  // Fetch all data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [sumRes, treeRes, plantRes, spaceRes, blkRes] = await Promise.all([
        apiClient.getTreesSummary(),
        apiClient.getTreeInventory(),
        apiClient.getPlantationRecords(),
        apiClient.getGreenSpaces(),
        apiClient.getBlocks()
      ]);
      setSummary(sumRes);
      setTrees(treeRes);
      setPlantations(plantRes);
      setGreenSpaces(spaceRes);
      setBlocks(blkRes.items || []);
    } catch (err) {
      console.error('Failed to load trees & plantation data', err);
      showToast('Error loading trees and green spaces data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Handle Tree submission
  const handleCreateTree = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.createTreeInventory({
        ...treeForm,
        tree_count: Number(treeForm.tree_count),
        planting_year: treeForm.planting_year ? Number(treeForm.planting_year) : undefined,
        estimated_age_years: treeForm.estimated_age_years ? Number(treeForm.estimated_age_years) : undefined,
        sequestration_rate_kg_year: Number(treeForm.sequestration_rate_kg_year),
        green_space_id: treeForm.green_space_id || undefined,
        block_id: treeForm.block_id || undefined
      });
      showToast('Tree inventory entry recorded successfully!');
      setShowTreeModal(false);
      fetchData();
    } catch (err: any) {
      showToast(err.details?.detail || 'Failed to save tree entry');
    }
  };

  // Handle Tree deletion
  const handleDeleteTree = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from inventory?`)) return;
    try {
      await apiClient.deleteTreeInventory(id);
      showToast(`Removed "${name}" from tree inventory.`);
      fetchData();
    } catch (err) {
      showToast('Failed to delete tree inventory entry');
    }
  };

  // Handle Plantation submission
  const handleCreatePlantation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(plantationForm.saplings_surviving) > Number(plantationForm.saplings_planted)) {
      showToast('Surviving saplings cannot exceed planted saplings.');
      return;
    }
    try {
      await apiClient.createPlantationRecord({
        ...plantationForm,
        saplings_planted: Number(plantationForm.saplings_planted),
        saplings_surviving: Number(plantationForm.saplings_surviving),
        green_space_id: plantationForm.green_space_id || undefined,
        block_id: plantationForm.block_id || undefined
      });
      showToast('Plantation drive recorded successfully!');
      setShowPlantationModal(false);
      fetchData();
    } catch (err: any) {
      showToast(err.details?.detail || 'Failed to record plantation drive');
    }
  };

  // Handle Green Space submission
  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.createGreenSpace({
        ...spaceForm,
        area_sqm: Number(spaceForm.area_sqm),
        block_id: spaceForm.block_id || undefined
      });
      showToast('Green space zone registered successfully!');
      setShowSpaceModal(false);
      fetchData();
    } catch (err: any) {
      showToast(err.details?.detail || 'Failed to register green space');
    }
  };

  // Filtered trees
  const filteredTrees = trees.filter(t => {
    const matchesSearch = t.common_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.species_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (t.location_description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesHealth = selectedHealth === 'all' || t.health_status.toLowerCase() === selectedHealth.toLowerCase();
    return matchesSearch && matchesHealth;
  });

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500/40 text-emerald-300 px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 text-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden backdrop-blur-sm">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
              <Sprout className="w-4 h-4" />
              <span>Amrita Vishwa Vidyapeetham • Coimbatore Campus (AVV-CBE)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              Trees, Plantations & Carbon Sequestration
              <span className="text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                Eco-Campus Body
              </span>
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Campus tree census, green space inventory, plantation monitoring drives, and documented allometric carbon sequestration estimation.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-2 border border-slate-700 transition"
              title="Refresh tree and sequestration data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              <span>Sync Telemetry</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Standing Trees */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold tracking-wide uppercase">Standing Tree Census</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Trees className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {loading ? '—' : summary?.total_trees.toLocaleString() || '0'}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="text-emerald-400 font-medium">{summary?.total_species_count || 0} indigenous species</span>
            <span>catalogued</span>
          </div>
        </div>

        {/* Card 2: Annual Sequestration */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold tracking-wide uppercase">Annual CO₂e Absorption</span>
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400">
              <Leaf className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-teal-400 tracking-tight">
            {loading ? '—' : `${summary?.total_annual_sequestration_t_co2e.toFixed(2)} t CO₂e/yr`}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {summary?.total_annual_sequestration_kg_co2e.toLocaleString()} kg CO₂e (Reported separately)
          </div>
        </div>

        {/* Card 3: Green Space Area */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold tracking-wide uppercase">Green Canopy & Zones</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {loading ? '—' : `${summary?.total_green_space_area_sqm.toLocaleString()} m²`}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Across {summary?.total_green_spaces || 0} designated botanical & Miyawaki zones
          </div>
        </div>

        {/* Card 4: Plantation Survival Rate */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold tracking-wide uppercase">Sapling Survival Rate</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <HeartHandshake className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-indigo-400 tracking-tight">
            {loading ? '—' : `${summary?.average_survival_rate_percent.toFixed(1)}%`}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {summary?.total_saplings_surviving} of {summary?.total_saplings_planted} saplings thriving
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-800 flex items-center space-x-2 sm:space-x-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-3.5 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center space-x-2 transition ${
            activeTab === 'inventory'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trees className="w-4 h-4" />
          <span>Tree Inventory ({trees.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('plantations')}
          className={`pb-3.5 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center space-x-2 transition ${
            activeTab === 'plantations'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sprout className="w-4 h-4" />
          <span>Plantation Drives ({plantations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('greenspaces')}
          className={`pb-3.5 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center space-x-2 transition ${
            activeTab === 'greenspaces'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Green Spaces ({greenSpaces.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sequestration')}
          className={`pb-3.5 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center space-x-2 transition ${
            activeTab === 'sequestration'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Sequestration Methodology & Net Audit</span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: Tree Inventory */}
      {/* =================================================================== */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search species or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-64"
                />
              </div>

              <select
                value={selectedHealth}
                onChange={(e) => setSelectedHealth(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All Health Conditions</option>
                <option value="healthy">Healthy</option>
                <option value="fair">Fair</option>
                <option value="diseased">Diseased</option>
                <option value="dead/senescent">Dead / Senescent</option>
              </select>
            </div>

            <button
              onClick={() => setShowTreeModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-emerald-950 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Record Tree Stand</span>
            </button>
          </div>

          {/* Trees Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/50 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">Common Name & Species</th>
                    <th className="px-4 py-3.5 text-center">Tree Count</th>
                    <th className="px-4 py-3.5">Age / Planted</th>
                    <th className="px-4 py-3.5">Health Status</th>
                    <th className="px-4 py-3.5">Green Zone / Location</th>
                    <th className="px-4 py-3.5 text-right">Annual Absorption</th>
                    <th className="px-4 py-3.5">Audit Source</th>
                    <th className="px-4 py-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredTrees.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                        No tree inventory records match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredTrees.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-white">{t.common_name}</div>
                          <div className="text-[11px] text-slate-400 italic">{t.species_name}</div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="font-mono text-sm font-semibold text-emerald-400">
                            {t.tree_count}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-300">
                          {t.estimated_age_years ? `~${t.estimated_age_years} yrs` : '—'}
                          {t.planting_year && (
                            <span className="text-[11px] text-slate-500 block">({t.planting_year})</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${
                            t.health_status.toLowerCase() === 'healthy'
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                              : t.health_status.toLowerCase() === 'fair'
                              ? 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                          }`}>
                            {t.health_status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-300">
                          <div className="font-medium text-slate-200">{t.green_space_name || 'Campus Grounds'}</div>
                          {t.location_description && (
                            <div className="text-[11px] text-slate-500 truncate max-w-xs">{t.location_description}</div>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono">
                          <div className="font-semibold text-teal-400">{t.annual_sequestration_kg.toLocaleString()} kg</div>
                          <div className="text-[10px] text-slate-500">{t.annual_sequestration_t.toFixed(3)} t CO₂e/yr</div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-400">
                          <div className="text-[11px] text-slate-300">{t.data_source}</div>
                          <span className="inline-block text-[10px] text-slate-500 border border-slate-700/60 rounded px-1.5 py-0.2">
                            {t.verification_status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            onClick={() => handleDeleteTree(t.id, t.common_name)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                            title="Delete tree stand"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: Plantation Drives */}
      {/* =================================================================== */}
      {activeTab === 'plantations' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Historical sapling planting campaigns, monitoring frequency, and survival telemetry.
            </p>
            <button
              onClick={() => setShowPlantationModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-emerald-950 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Record Plantation Drive</span>
            </button>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/50 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">Plantation Event</th>
                    <th className="px-4 py-3.5">Date</th>
                    <th className="px-4 py-3.5">Species Planted</th>
                    <th className="px-4 py-3.5 text-center">Planted</th>
                    <th className="px-4 py-3.5 text-center">Surviving</th>
                    <th className="px-4 py-3.5">Survival Rate</th>
                    <th className="px-4 py-3.5">Location</th>
                    <th className="px-5 py-3.5">Maintenance Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {plantations.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-5 py-3.5 font-semibold text-white">
                        {p.event_name}
                      </td>
                      <td className="px-4 py-3.5 text-slate-300 font-mono">
                        {p.plantation_date}
                      </td>
                      <td className="px-4 py-3.5 text-slate-300">
                        {p.species_planted}
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono text-slate-400">
                        {p.saplings_planted}
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono font-semibold text-emerald-400">
                        {p.saplings_surviving}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full"
                              style={{ width: `${Math.min(p.survival_rate_percent, 100)}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs font-semibold text-emerald-400">
                            {p.survival_rate_percent.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-300">
                        {p.plantation_location}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 text-[11px] max-w-sm truncate">
                        {p.maintenance_notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: Green Spaces */}
      {/* =================================================================== */}
      {activeTab === 'greenspaces' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Campus designated botanical parks, high-density Miyawaki plots, and avenue plantations.
            </p>
            <button
              onClick={() => setShowSpaceModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-emerald-950 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Register Green Zone</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {greenSpaces.map((gs) => (
              <div key={gs.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      {gs.code}
                    </span>
                    <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                      {gs.plantation_type}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white tracking-tight mt-1">
                    {gs.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-3">
                    {gs.description || 'Designated campus ecological zone.'}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-slate-500 block text-[10px]">ZONE AREA</span>
                    <span className="font-semibold text-white">{gs.area_sqm?.toLocaleString() || '—'} m²</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">STANDING TREES</span>
                    <span className="font-semibold text-emerald-400">{gs.tree_count} trees</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block text-[10px]">SEQUESTRATION</span>
                    <span className="font-semibold text-teal-400">{(gs.annual_sequestration_kg ?? 0).toLocaleString()} kg/yr</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: Carbon Sequestration Methodology */}
      {/* =================================================================== */}
      {activeTab === 'sequestration' && (
        <div className="space-y-6">
          {/* Methodology Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                <Info className="w-4 h-4" />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-white">
                  Documented Allometric Sequestration Standard (IPCC 2006 & FSI)
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  In compliance with GHG accounting best practices, campus tree carbon sequestration is calculated using species-specific and allometric age models from the <strong>2006 IPCC Guidelines for National Greenhouse Gas Inventories (Volume 4: AFOLU, Chapter 4)</strong> and Forest Survey of India biomass standards.
                </p>
                <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-xs font-mono text-emerald-300 mt-2">
                  Annual Sequestration (kg CO₂e) = Tree Count × Allometric Rate (kg/tree/yr) × Health Factor (0.0 – 1.0)
                </div>
              </div>
            </div>

            {/* Health Multiplier table */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-950/40 border border-slate-800 rounded-lg p-3">
                <span className="text-slate-400 block text-[11px]">HEALTHY CANOPY</span>
                <span className="font-mono text-emerald-400 font-bold text-sm">1.0× Factor</span>
                <p className="text-[10px] text-slate-500 mt-0.5">Standard annual growth</p>
              </div>
              <div className="bg-slate-950/40 border border-slate-800 rounded-lg p-3">
                <span className="text-slate-400 block text-[11px]">FAIR / MODERATE</span>
                <span className="font-mono text-amber-400 font-bold text-sm">0.8× Factor</span>
                <p className="text-[10px] text-slate-500 mt-0.5">Partial canopy reduction</p>
              </div>
              <div className="bg-slate-950/40 border border-slate-800 rounded-lg p-3">
                <span className="text-slate-400 block text-[11px]">DISEASED STAND</span>
                <span className="font-mono text-rose-400 font-bold text-sm">0.4× Factor</span>
                <p className="text-[10px] text-slate-500 mt-0.5">Impaired growth</p>
              </div>
              <div className="bg-slate-950/40 border border-slate-800 rounded-lg p-3">
                <span className="text-slate-400 block text-[11px]">DEAD / SENESCENT</span>
                <span className="font-mono text-slate-400 font-bold text-sm">0.0× Factor</span>
                <p className="text-[10px] text-slate-500 mt-0.5">Zero net sequestration</p>
              </div>
            </div>
          </div>

          {/* Gross vs Sequestration Safeguard Notice */}
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-5 flex items-start space-x-3 text-xs text-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-amber-300">Accounting Boundary Safeguard: Gross Emissions vs. Estimated Sink</h4>
              <p className="text-slate-300 leading-relaxed">
                CampusCarbon AI strictly segregates <strong>Gross Scope 1, 2, and 3 Emissions</strong> from <strong>Biological Carbon Sequestration</strong>. Tree carbon absorption is not automatically subtracted from the official compliance inventory to avoid misleading net-zero claims without verified permanence covenants. Net figures are provided solely for scenario modeling and campus ecological reporting.
              </p>
            </div>
          </div>

          {/* Species Breakdown Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Species-Level Carbon Absorption Contribution
              </h3>
              <span className="text-xs font-mono text-teal-400 font-semibold">
                Total: {summary?.total_annual_sequestration_t_co2e.toFixed(3)} t CO₂e/yr
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/50 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3">Common Name</th>
                    <th className="px-4 py-3">Botanical Species</th>
                    <th className="px-4 py-3 text-center">Trees</th>
                    <th className="px-4 py-3 text-right">Absorption (kg/yr)</th>
                    <th className="px-4 py-3 text-right">Absorption (t/yr)</th>
                    <th className="px-5 py-3 text-right">% of Campus Sink</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {summary?.species_breakdown.map((s) => (
                    <tr key={s.common_name} className="hover:bg-slate-800/30 transition">
                      <td className="px-5 py-3 font-semibold text-white">{s.common_name}</td>
                      <td className="px-4 py-3 text-slate-400 italic">{s.species_name}</td>
                      <td className="px-4 py-3 text-center font-mono font-semibold text-emerald-400">{s.tree_count}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-200">{s.annual_sequestration_kg.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-teal-400">{s.annual_sequestration_t.toFixed(3)}</td>
                      <td className="px-5 py-3 text-right font-mono text-slate-400">
                        <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] text-emerald-400 font-bold">
                          {s.percentage_of_total.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: Add Tree Inventory */}
      {/* =================================================================== */}
      {showTreeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Trees className="w-4 h-4 text-emerald-400" />
              <span>Record Tree Inventory Stand</span>
            </h3>

            <form onSubmit={handleCreateTree} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Common Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Neem"
                    value={treeForm.common_name}
                    onChange={(e) => setTreeForm({ ...treeForm, common_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Species (Botanical) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Azadirachta indica"
                    value={treeForm.species_name}
                    onChange={(e) => setTreeForm({ ...treeForm, species_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Tree Count *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={treeForm.tree_count}
                    onChange={(e) => setTreeForm({ ...treeForm, tree_count: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Age (Years)</label>
                  <input
                    type="number"
                    min={0}
                    value={treeForm.estimated_age_years}
                    onChange={(e) => setTreeForm({ ...treeForm, estimated_age_years: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Health Status *</label>
                  <select
                    value={treeForm.health_status}
                    onChange={(e) => setTreeForm({ ...treeForm, health_status: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Healthy">Healthy (1.0x)</option>
                    <option value="Fair">Fair (0.8x)</option>
                    <option value="Diseased">Diseased (0.4x)</option>
                    <option value="Dead/Senescent">Dead/Senescent (0.0x)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Campus Block (Optional)</label>
                  <select
                    value={treeForm.block_id}
                    onChange={(e) => setTreeForm({ ...treeForm, block_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Campus Grounds / Open Zone</option>
                    {blocks.map((b) => (
                      <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Green Zone</label>
                  <select
                    value={treeForm.green_space_id}
                    onChange={(e) => setTreeForm({ ...treeForm, green_space_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">General Campus</option>
                    {greenSpaces.map((gs) => (
                      <option key={gs.id} value={gs.id}>{gs.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Location Details</label>
                <input
                  type="text"
                  placeholder="e.g. Adjacent to East Lawn"
                  value={treeForm.location_description}
                  onChange={(e) => setTreeForm({ ...treeForm, location_description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTreeModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition"
                >
                  Save Tree Stand
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: Record Plantation Drive */}
      {/* =================================================================== */}
      {showPlantationModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sprout className="w-4 h-4 text-emerald-400" />
              <span>Record Plantation Drive</span>
            </h3>

            <form onSubmit={handleCreatePlantation} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Drive / Event Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. World Environment Day Drive 2024"
                  value={plantationForm.event_name}
                  onChange={(e) => setPlantationForm({ ...plantationForm, event_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Plantation Date *</label>
                  <input
                    type="date"
                    required
                    value={plantationForm.plantation_date}
                    onChange={(e) => setPlantationForm({ ...plantationForm, plantation_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Species Planted *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Neem, Pongamia, Teak"
                    value={plantationForm.species_planted}
                    onChange={(e) => setPlantationForm({ ...plantationForm, species_planted: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Saplings Planted *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={plantationForm.saplings_planted}
                    onChange={(e) => setPlantationForm({ ...plantationForm, saplings_planted: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Currently Surviving *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={plantationForm.saplings_surviving}
                    onChange={(e) => setPlantationForm({ ...plantationForm, saplings_surviving: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Plantation Location *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Behind Vashishta Hostel / South Perimeter"
                  value={plantationForm.plantation_location}
                  onChange={(e) => setPlantationForm({ ...plantationForm, plantation_location: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Maintenance & Monitoring Notes</label>
                <textarea
                  rows={2}
                  placeholder="Irrigation schedule, soil health, protective fencing..."
                  value={plantationForm.maintenance_notes}
                  onChange={(e) => setPlantationForm({ ...plantationForm, maintenance_notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPlantationModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition"
                >
                  Save Plantation Drive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: Register Green Space Zone */}
      {/* =================================================================== */}
      {showSpaceModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Register Campus Green Zone</span>
            </h3>

            <form onSubmit={handleCreateSpace} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Zone Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. North Miyawaki Plot"
                    value={spaceForm.name}
                    onChange={(e) => setSpaceForm({ ...spaceForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Zone Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GS-MIYAWAKI-02"
                    value={spaceForm.code}
                    onChange={(e) => setSpaceForm({ ...spaceForm, code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Plantation Type *</label>
                  <select
                    value={spaceForm.plantation_type}
                    onChange={(e) => setSpaceForm({ ...spaceForm, plantation_type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Miyawaki Forest">Miyawaki Forest</option>
                    <option value="Herbal Garden">Herbal Garden</option>
                    <option value="Avenue Plantation">Avenue Plantation</option>
                    <option value="Botanical Garden">Botanical Garden</option>
                    <option value="Agroforestry">Agroforestry</option>
                    <option value="Lawn & Canopy">Lawn & Canopy</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Area (m²) *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={spaceForm.area_sqm}
                    onChange={(e) => setSpaceForm({ ...spaceForm, area_sqm: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Description / Location</label>
                <textarea
                  rows={2}
                  placeholder="Ecological features, soil type, irrigation..."
                  value={spaceForm.description}
                  onChange={(e) => setSpaceForm({ ...spaceForm, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSpaceModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition"
                >
                  Register Zone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
