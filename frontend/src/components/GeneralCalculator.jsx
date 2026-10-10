import React, { useState, useEffect, useMemo } from 'react';
import { 
  Zap, Flame, Bus, Droplets, Trash2, Leaf, 
  RotateCcw, Sparkles, Printer, Info, CheckCircle2, 
  AlertCircle, ArrowRight, Target, Car, Smartphone,
  FileText, X, ChevronDown, Check, TrendingDown, Sun
} from 'lucide-react';
import { api } from '../api';

const PRESETS = [
  {
    id: 'cafeteria',
    name: '1-Week Cafeteria Rush',
    icon: '☕',
    desc: 'High commercial LPG, dining hall power, and organic food scraps',
    data: {
      grid_electricity_kwh: 550,
      solar_offset_kwh: 50,
      lpg_kg: 85,
      diesel_liters: 0,
      bus_km: 0,
      car_km: 0,
      two_wheeler_km: 0,
      ev_km: 0,
      fuel_petrol_liters: 0,
      fuel_diesel_liters: 0,
      water_m3: 35,
      food_waste_kg: 140,
      food_waste_pathway: 'landfill',
      paper_waste_kg: 15,
      paper_waste_pathway: 'recycled',
      plastic_waste_kg: 12,
      plastic_waste_pathway: 'landfill',
      dry_waste_kg: 25
    }
  },
  {
    id: 'hostel',
    name: '100-Bed Student Hostel (1 Month)',
    icon: '🏢',
    desc: 'High residential grid electricity, domestic water, and student solid waste',
    data: {
      grid_electricity_kwh: 3800,
      solar_offset_kwh: 600,
      lpg_kg: 20,
      diesel_liters: 30,
      bus_km: 0,
      car_km: 80,
      two_wheeler_km: 350,
      ev_km: 0,
      fuel_petrol_liters: 0,
      fuel_diesel_liters: 0,
      water_m3: 160,
      food_waste_kg: 40,
      food_waste_pathway: 'compost',
      paper_waste_kg: 35,
      paper_waste_pathway: 'recycled',
      plastic_waste_kg: 45,
      plastic_waste_pathway: 'recycled',
      dry_waste_kg: 50
    }
  },
  {
    id: 'lab',
    name: 'Academic Computer Lab (1 Day)',
    icon: '💻',
    desc: 'Pure electricity from workstations, servers, and air-conditioning',
    data: {
      grid_electricity_kwh: 280,
      solar_offset_kwh: 40,
      lpg_kg: 0,
      diesel_liters: 0,
      bus_km: 0,
      car_km: 0,
      two_wheeler_km: 0,
      ev_km: 0,
      fuel_petrol_liters: 0,
      fuel_diesel_liters: 0,
      water_m3: 2,
      food_waste_kg: 0,
      food_waste_pathway: 'landfill',
      paper_waste_kg: 8,
      paper_waste_pathway: 'recycled',
      plastic_waste_kg: 2,
      plastic_waste_pathway: 'recycled',
      dry_waste_kg: 5
    }
  },
  {
    id: 'fleet',
    name: 'Campus Transit Fleet (Daily)',
    icon: '🚌',
    desc: 'Campus diesel buses, faculty cars, and student two-wheelers',
    data: {
      grid_electricity_kwh: 40,
      solar_offset_kwh: 0,
      lpg_kg: 0,
      diesel_liters: 0,
      bus_km: 160,
      car_km: 120,
      two_wheeler_km: 250,
      ev_km: 35,
      fuel_petrol_liters: 15,
      fuel_diesel_liters: 45,
      water_m3: 5,
      food_waste_kg: 0,
      food_waste_pathway: 'landfill',
      paper_waste_kg: 2,
      paper_waste_pathway: 'recycled',
      plastic_waste_kg: 1,
      plastic_waste_pathway: 'landfill',
      dry_waste_kg: 4
    }
  }
];

const INITIAL_FORM = {
  grid_electricity_kwh: 1200,
  solar_offset_kwh: 150,
  lpg_kg: 60,
  diesel_liters: 25,
  bus_km: 80,
  car_km: 60,
  two_wheeler_km: 150,
  ev_km: 20,
  fuel_petrol_liters: 0,
  fuel_diesel_liters: 0,
  water_m3: 40,
  food_waste_kg: 90,
  food_waste_pathway: 'landfill',
  paper_waste_kg: 25,
  paper_waste_pathway: 'landfill',
  plastic_waste_kg: 15,
  plastic_waste_pathway: 'landfill',
  dry_waste_kg: 30
};

// Official UN SDG Colors & Badges
const SDG_BADGES = {
  6: { title: 'Clean Water & Sanitation', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  7: { title: 'Affordable & Clean Energy', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  9: { title: 'Industry, Innovation & Infra', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  11: { title: 'Sustainable Cities & Communities', color: 'bg-amber-600/20 text-amber-200 border-amber-600/30' },
  12: { title: 'Responsible Consumption', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  13: { title: 'Climate Action', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' }
};

export default function GeneralCalculator() {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [results, setResults] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Unit Toggles
  const [lpgUnit, setLpgUnit] = useState('kg'); // 'kg' or 'cylinders' (19kg)
  const [waterUnit, setWaterUnit] = useState('m3'); // 'm3' or 'liters'
  const [transportMode, setTransportMode] = useState('distance'); // 'distance' or 'fuel'

  // Modals
  const [showMethodologyModal, setShowMethodologyModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Trigger calculation when form data changes
  const runCalculation = async (dataToCalculate) => {
    try {
      setIsCalculating(true);
      const res = await api.calculateGeneralFootprint(dataToCalculate);
      setResults(res);
    } catch (err) {
      console.error("Calculation failed:", err);
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    runCalculation(formData);
  }, [formData]);

  const handleInputChange = (field, value) => {
    const numValue = Math.max(0, parseFloat(value) || 0);
    setFormData(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const handlePathwayChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const applyPreset = (preset) => {
    setFormData(preset.data);
  };

  const handleReset = () => {
    const emptyForm = Object.keys(INITIAL_FORM).reduce((acc, key) => {
      acc[key] = typeof INITIAL_FORM[key] === 'string' ? 'landfill' : 0;
      return acc;
    }, {});
    setFormData(emptyForm);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Campus Presets */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Component 1
              </span>
              <h1 className="text-2xl font-black text-white tracking-tight">
                General Carbon Footprint Calculator
              </h1>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Deterministic GHG accounting for ad-hoc campus activities with integrated <span className="text-emerald-400 font-semibold">UN SDG Recommendations</span>.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowMethodologyModal(true)}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600/60 flex items-center space-x-2 transition"
            >
              <Info className="w-4 h-4 text-emerald-400" />
              <span>Formulas & Factors</span>
            </button>
            <button
              onClick={() => setShowReportModal(true)}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 flex items-center space-x-2 transition"
            >
              <FileText className="w-4 h-4" />
              <span>Export Audit Report</span>
            </button>
          </div>
        </div>

        {/* Quick Presets Bar */}
        <div className="mt-6 pt-5 border-t border-slate-700/60">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>One-Click Campus Presets:</span>
            </span>
            <button
              onClick={handleReset}
              className="text-xs text-slate-400 hover:text-rose-400 flex items-center space-x-1 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Inputs</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className="text-left p-3 rounded-xl bg-slate-800/70 hover:bg-slate-700/90 border border-slate-700/80 hover:border-emerald-500/50 transition group"
              >
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-base">{preset.icon}</span>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-300 truncate">
                    {preset.name}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1">{preset.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Main Dual-Panel Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT PANEL: Multi-Activity Inputs (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Card A: Electricity */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Electricity Consumption</h3>
                  <p className="text-xs text-slate-400">Grid power & on-site renewable offset</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                Scope 2
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Grid Electricity Consumed (kWh)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={formData.grid_electricity_kwh}
                    onChange={(e) => handleInputChange('grid_electricity_kwh', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 transition"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-medium">kWh</span>
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">EF: 0.716 kgCO₂e/kWh</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Rooftop Solar Offset (kWh)</span>
                  <Sun className="w-3.5 h-3.5 text-amber-400 inline" />
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={formData.solar_offset_kwh}
                    onChange={(e) => handleInputChange('solar_offset_kwh', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-emerald-400 focus:outline-none focus:border-emerald-400 transition"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-medium">kWh</span>
                </div>
                <span className="text-[11px] text-emerald-400/80 mt-1 block">Deducts directly from grid total</span>
              </div>
            </div>
          </div>

          {/* Card B: Thermal Fuels & Generators */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Thermal Fuels & Gensets</h3>
                  <p className="text-xs text-slate-400">Commercial cooking gas & backup diesel power</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                Scope 1
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {/* LPG with Unit Converter */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Commercial LPG
                  </label>
                  <div className="flex items-center space-x-1 bg-slate-900 p-0.5 rounded-lg border border-slate-700 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setLpgUnit('kg')}
                      className={`px-1.5 py-0.5 rounded ${lpgUnit === 'kg' ? 'bg-orange-600 text-white font-bold' : 'text-slate-400'}`}
                    >
                      kg
                    </button>
                    <button
                      type="button"
                      onClick={() => setLpgUnit('cylinders')}
                      className={`px-1.5 py-0.5 rounded ${lpgUnit === 'cylinders' ? 'bg-orange-600 text-white font-bold' : 'text-slate-400'}`}
                    >
                      19kg Cyl
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={lpgUnit === 'kg' ? formData.lpg_kg : (formData.lpg_kg / 19).toFixed(1)}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      handleInputChange('lpg_kg', lpgUnit === 'kg' ? val : val * 19);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-400 transition"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-medium">
                    {lpgUnit === 'kg' ? 'kg' : 'Cylinders'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">EF: 2.983 kgCO₂e/kg (DEFRA)</span>
              </div>

              {/* Diesel Generator */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Diesel Generator Usage
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={formData.diesel_liters}
                    onChange={(e) => handleInputChange('diesel_liters', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-400 transition"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-medium">Liters</span>
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">EF: 2.680 kgCO₂e/L (DEFRA)</span>
              </div>
            </div>
          </div>

          {/* Card C: Transportation & Fleet */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Bus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Campus Mobility & Transportation</h3>
                  <p className="text-xs text-slate-400">Campus buses, visitor cars, two-wheelers, and EVs</p>
                </div>
              </div>
              
              {/* Distance vs Fuel Mode Switcher */}
              <div className="flex items-center space-x-1 bg-slate-900 p-0.5 rounded-lg border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setTransportMode('distance')}
                  className={`px-2 py-1 rounded-md font-semibold ${transportMode === 'distance' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Distance (km)
                </button>
                <button
                  type="button"
                  onClick={() => setTransportMode('fuel')}
                  className={`px-2 py-1 rounded-md font-semibold ${transportMode === 'fuel' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Direct Fuel (L)
                </button>
              </div>
            </div>

            {transportMode === 'distance' ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Buses (km)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.bus_km}
                    onChange={(e) => handleInputChange('bus_km', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-400"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">0.85 kg/km</span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Cars (km)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.car_km}
                    onChange={(e) => handleInputChange('car_km', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-400"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">0.17 kg/km</span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">2-Wheeler (km)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.two_wheeler_km}
                    onChange={(e) => handleInputChange('two_wheeler_km', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-400"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">0.035 kg/km</span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">EVs (km)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.ev_km}
                    onChange={(e) => handleInputChange('ev_km', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-emerald-400 focus:outline-none focus:border-emerald-400"
                  />
                  <span className="text-[10px] text-emerald-500/80 mt-1 block">0.053 kg/km</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Fleet Petrol Consumed (Liters)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.fuel_petrol_liters}
                    onChange={(e) => handleInputChange('fuel_petrol_liters', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-400"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">EF: 2.310 kgCO₂e/L</span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Fleet Diesel Consumed (Liters)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.fuel_diesel_liters}
                    onChange={(e) => handleInputChange('fuel_diesel_liters', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-400"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">EF: 2.680 kgCO₂e/L</span>
                </div>
              </div>
            )}
          </div>

          {/* Card D: Water & Wastewater */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Water Consumption & Wastewater</h3>
                  <p className="text-xs text-slate-400">Pumping, filtration, distribution, and wastewater</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                Scope 3
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Water Volume
                  </label>
                  <div className="flex items-center space-x-1 bg-slate-900 p-0.5 rounded-lg border border-slate-700 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setWaterUnit('m3')}
                      className={`px-1.5 py-0.5 rounded ${waterUnit === 'm3' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400'}`}
                    >
                      m³ (kL)
                    </button>
                    <button
                      type="button"
                      onClick={() => setWaterUnit('liters')}
                      className={`px-1.5 py-0.5 rounded ${waterUnit === 'liters' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400'}`}
                    >
                      Liters
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={waterUnit === 'm3' ? formData.water_m3 : formData.water_m3 * 1000}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      handleInputChange('water_m3', waterUnit === 'm3' ? val : val / 1000);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 transition"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-medium">
                    {waterUnit === 'm3' ? 'm³' : 'Liters'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">EF: 0.344 kgCO₂e/m³ (Pumping & treatment)</span>
              </div>

              <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700/60 flex flex-col justify-center">
                <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                  <Target className="w-3.5 h-3.5 text-cyan-400" />
                  <span>UN SDG 6 Focus:</span>
                </span>
                <p className="text-[11px] text-slate-400 mt-1">
                  1 m³ = 1,000 Liters. Captures indirect carbon emitted by borewell pumps and municipality treatment plants.
                </p>
              </div>
            </div>
          </div>

          {/* Card E: Segregated Waste Streams & Disposal Pathways */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Waste Generation & Disposal Pathways</h3>
                  <p className="text-xs text-slate-400">Segregated streams with circular disposal alternatives</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                Scope 3
              </span>
            </div>

            <div className="space-y-4 mt-4">
              
              {/* Stream 1: Food Waste */}
              <div className="p-3.5 bg-slate-900/70 rounded-xl border border-slate-700/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold text-slate-200">🥗 Food & Organic Waste (kg)</span>
                  
                  {/* Disposal Pathway Selector */}
                  <div className="flex items-center space-x-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-[10px]">
                    <button
                      type="button"
                      onClick={() => handlePathwayChange('food_waste_pathway', 'landfill')}
                      className={`px-2 py-0.5 rounded ${formData.food_waste_pathway === 'landfill' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400'}`}
                    >
                      Landfill (1.25)
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePathwayChange('food_waste_pathway', 'compost')}
                      className={`px-2 py-0.5 rounded ${formData.food_waste_pathway === 'compost' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400'}`}
                    >
                      Compost (0.10)
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePathwayChange('food_waste_pathway', 'biogas')}
                      className={`px-2 py-0.5 rounded ${formData.food_waste_pathway === 'biogas' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400'}`}
                    >
                      Biogas (-0.45)
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={formData.food_waste_kg}
                    onChange={(e) => handleInputChange('food_waste_kg', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-400"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-500">kg</span>
                </div>
              </div>

              {/* Stream 2 & 3: Paper & Plastic */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                {/* Paper */}
                <div className="p-3 bg-slate-900/70 rounded-xl border border-slate-700/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-200">📄 Paper Waste</span>
                    <div className="flex items-center space-x-1 bg-slate-800 p-0.5 rounded border border-slate-700 text-[10px]">
                      <button
                        type="button"
                        onClick={() => handlePathwayChange('paper_waste_pathway', 'landfill')}
                        className={`px-1.5 py-0.5 rounded ${formData.paper_waste_pathway === 'landfill' ? 'bg-rose-600 text-white' : 'text-slate-400'}`}
                      >
                        Landfill
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePathwayChange('paper_waste_pathway', 'recycled')}
                        className={`px-1.5 py-0.5 rounded ${formData.paper_waste_pathway === 'recycled' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
                      >
                        Recycled
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={formData.paper_waste_kg}
                    onChange={(e) => handleInputChange('paper_waste_kg', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-rose-400"
                  />
                </div>

                {/* Plastic */}
                <div className="p-3 bg-slate-900/70 rounded-xl border border-slate-700/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-200">🥤 Plastic Waste</span>
                    <div className="flex items-center space-x-1 bg-slate-800 p-0.5 rounded border border-slate-700 text-[10px]">
                      <button
                        type="button"
                        onClick={() => handlePathwayChange('plastic_waste_pathway', 'landfill')}
                        className={`px-1.5 py-0.5 rounded ${formData.plastic_waste_pathway === 'landfill' ? 'bg-rose-600 text-white' : 'text-slate-400'}`}
                      >
                        Landfill
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePathwayChange('plastic_waste_pathway', 'recycled')}
                        className={`px-1.5 py-0.5 rounded ${formData.plastic_waste_pathway === 'recycled' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
                      >
                        Recycled
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={formData.plastic_waste_kg}
                    onChange={(e) => handleInputChange('plastic_waste_kg', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-rose-400"
                  />
                </div>
              </div>

              {/* Stream 4: Dry Mixed Waste */}
              <div className="p-3 bg-slate-900/70 rounded-xl border border-slate-700/60 flex items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">📦 Dry / Mixed Municipal Solid Waste</span>
                  <span className="text-[11px] text-slate-500">General sweepings, broken stationery, and packaging (0.55 kgCO₂e/kg)</span>
                </div>
                <div className="w-32">
                  <input
                    type="number"
                    min="0"
                    value={formData.dry_waste_kg}
                    onChange={(e) => handleInputChange('dry_waste_kg', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-white text-right focus:outline-none focus:border-rose-400"
                  />
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* RIGHT PANEL: Live Carbon Console & SDG Recommendations (5 Cols) */}
        <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-20">
          
          {/* Main Hero Metric Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border-2 border-emerald-500/40 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-44 h-44 bg-emerald-500/15 rounded-full blur-2xl" />

            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                <Leaf className="w-4 h-4" />
                <span>Calculated Total Footprint</span>
              </span>
              {isCalculating && (
                <span className="text-[11px] text-slate-400 animate-pulse">Recalculating...</span>
              )}
            </div>

            <div className="flex items-baseline space-x-3">
              <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                {results?.total_emissions_kg?.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) || '0.0'}
              </span>
              <span className="text-base font-bold text-slate-300">kg CO₂e</span>
            </div>

            <div className="text-xs text-slate-400 mt-1 font-medium">
              = <span className="text-emerald-300 font-bold">{results?.total_emissions_tco2e || '0.000'}</span> metric tonnes CO₂e (tCO₂e)
            </div>

            {/* Scope 1, 2, 3 Badges */}
            <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-slate-800">
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-center">
                <span className="text-[10px] uppercase font-bold text-orange-400 block">Scope 1 (Direct)</span>
                <span className="text-xs font-extrabold text-white mt-0.5 block">
                  {results?.scope_breakdown?.scope_1_kg || 0} kg
                </span>
                <span className="text-[10px] text-slate-400">
                  {results?.scope_breakdown?.scope_1_pct || 0}%
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-center">
                <span className="text-[10px] uppercase font-bold text-amber-400 block">Scope 2 (Power)</span>
                <span className="text-xs font-extrabold text-white mt-0.5 block">
                  {results?.scope_breakdown?.scope_2_kg || 0} kg
                </span>
                <span className="text-[10px] text-slate-400">
                  {results?.scope_breakdown?.scope_2_pct || 0}%
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-center">
                <span className="text-[10px] uppercase font-bold text-cyan-400 block">Scope 3 (Supply/Waste)</span>
                <span className="text-xs font-extrabold text-white mt-0.5 block">
                  {results?.scope_breakdown?.scope_3_kg || 0} kg
                </span>
                <span className="text-[10px] text-slate-400">
                  {results?.scope_breakdown?.scope_3_pct || 0}%
                </span>
              </div>
            </div>

            {/* Primary Culprit */}
            {results?.top_contributor && results.top_contributor !== 'None' && (
              <div className="mt-4 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs text-amber-200">
                  Highest contributor: <strong className="text-white">{results.top_contributor}</strong> ({(results.category_percentages?.[results.top_contributor] || 0)}% of total)
                </span>
              </div>
            )}
          </div>

          {/* Activity Breakdown Progress Bars */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center justify-between">
              <span>Activity Emissions Share</span>
              <span className="text-[10px] text-slate-500">Real-time</span>
            </h4>

            <div className="space-y-3">
              {results?.category_totals && Object.entries(results.category_totals).map(([category, val]) => {
                const pct = results.category_percentages?.[category] || 0;
                return (
                  <div key={category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">{category}</span>
                      <span className="text-slate-400 font-bold">{val} kg ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tangible Equivalency Benchmarks */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
              Real-World Equivalencies
            </h4>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-center">
                <span className="text-xl block mb-1">🌲</span>
                <span className="text-xs font-extrabold text-white block">
                  ~{results?.equivalencies?.trees_needed_annual || 0}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight">
                  Trees required for 1 year
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-center">
                <span className="text-xl block mb-1">🚗</span>
                <span className="text-xs font-extrabold text-white block">
                  ~{results?.equivalencies?.car_km_equivalent?.toLocaleString() || 0} km
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight">
                  Petrol car distance
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-center">
                <span className="text-xl block mb-1">📱</span>
                <span className="text-xs font-extrabold text-white block">
                  ~{results?.equivalencies?.smartphones_charged?.toLocaleString() || 0}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight">
                  Smartphone charges
                </span>
              </div>
            </div>
          </div>

          {/* INTEGRATED UN SDG RECOMMENDATIONS */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-extrabold text-white tracking-tight">
                  Integrated UN SDG Recommendations
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                AI Decarbonization
              </span>
            </div>

            {results?.sdg_recommendations && results.sdg_recommendations.length > 0 ? (
              <div className="space-y-3">
                {results.sdg_recommendations.map((rec, idx) => {
                  const sdgBadge = SDG_BADGES[rec.primary_sdg] || SDG_BADGES[13];
                  return (
                    <div 
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-800/90 border border-slate-700/80 hover:border-emerald-500/40 transition space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${sdgBadge.color}`}>
                              SDG {rec.primary_sdg}
                            </span>
                            <span className="text-xs font-bold text-white">{rec.title}</span>
                          </div>
                          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                            {rec.description}
                          </p>
                        </div>
                      </div>

                      {/* Quantified Reduction Banner */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-700/60 text-xs">
                        <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                          <TrendingDown className="w-3.5 h-3.5" />
                          <span>Avoids ~{rec.potential_reduction_kg} kg CO₂e ({rec.potential_reduction_pct}%)</span>
                        </div>
                        <span className="text-[10px] text-slate-400 italic">
                          {rec.action_type}
                        </span>
                      </div>

                      {/* Feasibility Note */}
                      <div className="text-[10px] text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-300 font-semibold">Feasibility: </span>
                        {rec.feasibility}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-4">
                Enter higher activity values or select a preset to generate targeted UN SDG recommendations.
              </p>
            )}
          </div>

        </div>

      </div>

      {/* 3. Methodology & Emission Factors Modal */}
      {showMethodologyModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Info className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Calculation Methodology & Emission Factors</h3>
              </div>
              <button 
                onClick={() => setShowMethodologyModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                <span className="font-bold text-emerald-400 block mb-1">Standard Formula (GHG Protocol Corporate Standard):</span>
                <p className="font-mono text-slate-200">Emissions (kg CO₂e) = Activity Data (A) × Emission Factor (EF)</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  All numerical outputs are strictly deterministic. Net Grid Electricity = max(0, Grid kWh - Solar kWh).
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white mb-2">Approved Certified Factors Used in Component 1:</h4>
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-800/60 text-[11px] text-slate-400">
                      <tr>
                        <th className="p-2">Activity Stream</th>
                        <th className="p-2">Factor Value</th>
                        <th className="p-2">Scope</th>
                        <th className="p-2">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-[11px]">
                      <tr>
                        <td className="p-2">Grid Electricity</td>
                        <td className="p-2 font-mono text-emerald-400">0.716 kgCO₂e/kWh</td>
                        <td className="p-2">Scope 2</td>
                        <td className="p-2">Central Electricity Authority (CEA Baseline)</td>
                      </tr>
                      <tr>
                        <td className="p-2">Commercial LPG</td>
                        <td className="p-2 font-mono text-emerald-400">2.983 kgCO₂e/kg</td>
                        <td className="p-2">Scope 1</td>
                        <td className="p-2">DEFRA UK 2024 / IPCC</td>
                      </tr>
                      <tr>
                        <td className="p-2">Diesel Stationary</td>
                        <td className="p-2 font-mono text-emerald-400">2.680 kgCO₂e/L</td>
                        <td className="p-2">Scope 1</td>
                        <td className="p-2">DEFRA UK 2024</td>
                      </tr>
                      <tr>
                        <td className="p-2">Transit Bus</td>
                        <td className="p-2 font-mono text-emerald-400">0.850 kgCO₂e/km</td>
                        <td className="p-2">Scope 1</td>
                        <td className="p-2">DEFRA Fleet Factors</td>
                      </tr>
                      <tr>
                        <td className="p-2">Municipal Water</td>
                        <td className="p-2 font-mono text-emerald-400">0.344 kgCO₂e/m³</td>
                        <td className="p-2">Scope 3</td>
                        <td className="p-2">Water-Energy Nexus Study</td>
                      </tr>
                      <tr>
                        <td className="p-2">Food Waste (Landfill)</td>
                        <td className="p-2 font-mono text-emerald-400">1.250 kgCO₂e/kg</td>
                        <td className="p-2">Scope 3</td>
                        <td className="p-2">IPCC Methane Generation Default</td>
                      </tr>
                      <tr>
                        <td className="p-2">Food Waste (Compost)</td>
                        <td className="p-2 font-mono text-emerald-400">0.100 kgCO₂e/kg</td>
                        <td className="p-2">Scope 3</td>
                        <td className="p-2">Aerobic Treatment Offset</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowMethodologyModal(false)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-xs transition"
              >
                Close Transparency Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Audit-Ready Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Institutional Carbon Accounting Audit Report</h3>
                  <p className="text-[11px] text-slate-400">CampusCarbon AI · Ad-hoc Activity Carbon Quantification</p>
                </div>
              </div>
              <button 
                onClick={() => setShowReportModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable summary */}
            <div id="printable-audit-report" className="space-y-4 text-xs text-slate-300">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Total Emissions:</span>
                  <span className="text-sm font-extrabold text-white block mt-0.5">
                    {results?.total_emissions_kg} kg CO₂e
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">In Metric Tonnes:</span>
                  <span className="text-sm font-extrabold text-emerald-400 block mt-0.5">
                    {results?.total_emissions_tco2e} tCO₂e
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Primary Culprit:</span>
                  <span className="text-sm font-extrabold text-amber-400 block mt-0.5">
                    {results?.top_contributor}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Date Generated:</span>
                  <span className="text-xs font-semibold text-slate-300 block mt-0.5">
                    {new Date().toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Itemized Table */}
              <div>
                <h4 className="font-bold text-white mb-2">Itemized Activity Inventory:</h4>
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-800/60 text-[11px] text-slate-400">
                      <tr>
                        <th className="p-2">Item / Stream</th>
                        <th className="p-2">Activity Value</th>
                        <th className="p-2">Scope</th>
                        <th className="p-2">Factor</th>
                        <th className="p-2 text-right">Emissions (kg CO₂e)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-[11px]">
                      {results?.itemized_breakdown?.map((item, i) => (
                        <tr key={i}>
                          <td className="p-2 font-medium text-slate-200">{item.item}</td>
                          <td className="p-2 font-mono text-slate-300">{item.activity_value} {item.unit}</td>
                          <td className="p-2 text-slate-400">{item.scope}</td>
                          <td className="p-2 font-mono text-slate-400">{item.emission_factor} {item.factor_unit}</td>
                          <td className="p-2 font-mono font-bold text-white text-right">{item.emissions_kg}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recommendations Summary */}
              {results?.sdg_recommendations && results.sdg_recommendations.length > 0 && (
                <div>
                  <h4 className="font-bold text-white mb-2">Mapped UN SDG Actions:</h4>
                  <div className="space-y-2">
                    {results.sdg_recommendations.map((r, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-[11px]">
                        <div className="flex justify-between font-bold text-slate-200">
                          <span>SDG {r.primary_sdg}: {r.title}</span>
                          <span className="text-emerald-400">Avoids {r.potential_reduction_kg} kg CO₂e</span>
                        </div>
                        <p className="text-slate-400 mt-1">{r.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
              <span className="text-[11px] text-slate-500">Audit Reference: CC-AI-GEN-{Date.now().toString().slice(-6)}</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold text-xs flex items-center space-x-1.5 transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-xs transition"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
