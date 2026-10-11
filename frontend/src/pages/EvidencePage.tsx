import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  ShieldCheck,
  Award,
  Filter,
  Search,
  Plus,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FolderLock,
  Building,
  RotateCcw,
  Hash,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { InstitutionalEvidenceItem } from '../types';

export const EvidencePage: React.FC = () => {
  const [evidenceList, setEvidenceList] = useState<InstitutionalEvidenceItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState<string>('');
  const [formRefNumber, setFormRefNumber] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('energy');
  const [formPeriod, setFormPeriod] = useState<string>('FY 2025-26');
  const [formSdgs, setFormSdgs] = useState<string>('7, 13');
  const [formTags, setFormTags] = useState<string>('NIRF-2026, NAAC-VII');
  const [formStatus, setFormStatus] = useState<string>('verified');
  const [formDocUrl, setFormDocUrl] = useState<string>('');
  const [formDesc, setFormDesc] = useState<string>('');

  const fetchEvidence = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await apiClient.getInstitutionalEvidence();
      setEvidenceList(items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve institutional evidence vault.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvidence();
  }, [fetchEvidence]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formRefNumber.trim()) {
      alert('Please fill out the title and reference number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedSdgs = formSdgs
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n));

      const parsedTags = formTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const campusId = evidenceList.length > 0 ? evidenceList[0].campus_id : '00000000-0000-0000-0000-000000000001';

      await apiClient.createInstitutionalEvidence({
        campus_id: campusId,
        title: formTitle.trim(),
        reference_number: formRefNumber.trim(),
        category: formCategory,
        reporting_period: formPeriod.trim(),
        associated_sdgs: parsedSdgs,
        framework_tags: parsedTags,
        verification_status: formStatus,
        document_url_or_ref: formDocUrl.trim() || `vault://amrita-coimbatore/${formRefNumber.trim().toLowerCase()}.pdf`,
        description: formDesc.trim(),
      });

      setFormSuccess('Evidence document successfully added to immutable institutional locker.');
      setShowCreateModal(false);
      // Reset form
      setFormTitle('');
      setFormRefNumber('');
      setFormDocUrl('');
      setFormDesc('');
      await fetchEvidence();
      setTimeout(() => setFormSuccess(null), 5000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create evidence document.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = useMemo(() => {
    return evidenceList.filter((item) => {
      const matchSearch =
        searchQuery === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.reference_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.framework_tags && item.framework_tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

      const matchCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchStatus = statusFilter === 'all' || item.verification_status === statusFilter;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [evidenceList, searchQuery, categoryFilter, statusFilter]);

  const verifiedCount = useMemo(() => {
    return evidenceList.filter((e) => e.verification_status === 'verified').length;
  }, [evidenceList]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            <span>Verified & Audited</span>
          </span>
        );
      case 'provisional':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" />
            <span>Provisional</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <AlertTriangle className="w-3 h-3" />
            <span>Pending Audit</span>
          </span>
        );
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
            <span>Institutional Evidence Vault & Digital MRV Locker</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              Tamper-Evident SHA-256
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Auditable digital repository connecting physical utility bills, meter extracts, lab telemetry, and NIRF / NAAC Criterion VII compliance packages.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchEvidence()}
            disabled={isLoading}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-colors"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Vault</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors shadow-lg shadow-emerald-900/30"
          >
            <Plus className="w-4 h-4" />
            <span>Register Evidence</span>
          </button>
        </div>
      </div>

      {formSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{formSuccess}</span>
          </div>
          <button onClick={() => setFormSuccess(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">✕</button>
        </div>
      )}

      {/* 2. Statistical Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Total Vault Items</span>
            <FolderLock className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-2xl font-bold font-mono text-slate-100 block mt-1">
            {evidenceList.length}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Institutional verification artifacts
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Verified & Audited</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-2xl font-bold font-mono text-emerald-400 block mt-1">
            {verifiedCount}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            {evidenceList.length > 0 ? `${Math.round((verifiedCount / evidenceList.length) * 100)}% audit compliance` : '—'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Accreditation Frameworks</span>
            <Award className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="text-2xl font-bold font-mono text-cyan-400 block mt-1">
            4 Frameworks
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            NIRF, NAAC, THE Impact, GHG Protocol
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Integrity Standard</span>
            <Hash className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-2xl font-bold font-mono text-amber-400 block mt-1">
            SHA-256
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Cryptographic audit hashing
          </span>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-1 items-center space-x-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by title, reference code, or framework tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>
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
              <option value="energy">Energy & Solar</option>
              <option value="electricity">Electricity</option>
              <option value="water">Water & STPs</option>
              <option value="waste">Waste Management</option>
              <option value="forestry">Forestry & Green Canopy</option>
              <option value="governance">Institutional Policy</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Statuses</option>
              <option value="verified">Verified & Audited</option>
              <option value="provisional">Provisional</option>
              <option value="pending_audit">Pending Audit</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Evidence Items Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-xs bg-slate-900 rounded-xl border border-slate-800">
          <RotateCcw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
          <span>Synchronizing institutional evidence vault records...</span>
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 space-y-3.5 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">{item.title}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-800 text-slate-300 border border-slate-700 font-bold">
                        {item.reference_number}
                      </span>
                      <span className="text-slate-500 text-xs">•</span>
                      <span className="text-xs text-slate-400 font-mono">{item.reporting_period}</span>
                    </div>
                  </div>
                </div>
                <div>{getStatusBadge(item.verification_status)}</div>
              </div>

              {item.description && (
                <p className="text-xs text-slate-400 leading-relaxed pl-11">
                  {item.description}
                </p>
              )}

              {/* SDGs & Accreditation Tags */}
              <div className="flex flex-wrap items-center gap-2 pl-11 pt-1">
                {item.associated_sdgs && item.associated_sdgs.length > 0 && (
                  <div className="flex items-center space-x-1">
                    {item.associated_sdgs.map((sdg) => (
                      <span
                        key={sdg}
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-500/10 text-blue-300 border border-blue-500/20"
                        title={`Aligned with UN SDG ${sdg}`}
                      >
                        SDG {sdg}
                      </span>
                    ))}
                  </div>
                )}

                {item.framework_tags && item.framework_tags.length > 0 && (
                  <div className="flex items-center space-x-1">
                    {item.framework_tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Digital Vault Document Link */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs pl-11">
                <span className="font-mono text-[11px] text-slate-500 truncate max-w-xs">
                  {item.document_url_or_ref || `sha256:7f83b1657ff1...`}
                </span>
                <span className="inline-flex items-center space-x-1 text-emerald-400 hover:text-emerald-300 font-medium text-xs cursor-pointer">
                  <span>Audit Package</span>
                  <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center text-slate-400 text-xs bg-slate-900 rounded-xl border border-slate-800 space-y-2">
          <FolderLock className="w-8 h-8 mx-auto text-slate-600" />
          <h4 className="text-sm font-semibold text-slate-300">No matching evidence documents found</h4>
          <p className="max-w-md mx-auto text-slate-500">
            Adjust your search criteria or register a new physical verification artifact.
          </p>
        </div>
      )}

      {/* 5. Create Evidence Document Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <span>Register Institutional Evidence Document</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Document / Verification Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TANGEDCO High-Tension Energy Bill & Solar Inverter Telemetry"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Reference Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DOC-EV-2026-ENG-001"
                    value={formRefNumber}
                    onChange={(e) => setFormRefNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="energy">Energy & Solar</option>
                    <option value="electricity">Electricity</option>
                    <option value="water">Water & STPs</option>
                    <option value="waste">Waste Management</option>
                    <option value="forestry">Forestry & Green Canopy</option>
                    <option value="governance">Institutional Policy</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Reporting Period
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. FY 2025-26"
                    value={formPeriod}
                    onChange={(e) => setFormPeriod(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Verification Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="verified">Verified & Audited</option>
                    <option value="provisional">Provisional</option>
                    <option value="pending_audit">Pending Audit</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Associated SDGs (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="7, 11, 13"
                    value={formSdgs}
                    onChange={(e) => setFormSdgs(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Framework Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="NIRF-2026, NAAC-VII"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Document Vault URL / Storage Checksum Ref
                </label>
                <input
                  type="text"
                  placeholder="vault://amrita-coimbatore/tangedco_ht_bill_sept2026.pdf"
                  value={formDocUrl}
                  onChange={(e) => setFormDocUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Auditor Scope Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Official certified documentation validating telemetry and greenhouse gas emissions assertions..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors flex items-center space-x-2"
                >
                  {isSubmitting && <RotateCcw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save to Vault</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
