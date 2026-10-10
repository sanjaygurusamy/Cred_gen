import React, { useState } from 'react';
import { X, Award, CheckCircle2 } from 'lucide-react';
import { api } from '../api';

export default function ImplementationModal({
  recommendation,
  onClose,
  onSuccess
}) {
  const [title, setTitle] = useState(recommendation?.title || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [capitalCost, setCapitalCost] = useState('');
  const [operationalCost, setOperationalCost] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await api.recordImplementation({
        campus_id: recommendation.campus_id,
        recommendation_id: recommendation.id,
        element_id: recommendation.element_id,
        title: title.trim(),
        implementation_date: new Date(date).toISOString(),
        capital_cost: capitalCost !== '' ? parseFloat(capitalCost) : null,
        operational_cost_annual: operationalCost !== '' ? parseFloat(operationalCost) : null,
        notes: notes.trim()
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      alert(`Failed to record implementation: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
              <Award className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Record Implemented Intervention
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Intervention Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-200 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Implementation Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-200 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Capital Cost ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={capitalCost}
                onChange={(e) => setCapitalCost(e.target.value)}
                placeholder="Optional"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-200 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Annual Maint. Cost ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={operationalCost}
                onChange={(e) => setOperationalCost(e.target.value)}
                placeholder="Optional"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-200 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Commissioning Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Completed by external gas equipment vendor; passed pressure safety testing."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-200 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 flex items-center space-x-1.5 shadow-lg shadow-teal-500/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Recording...' : 'Confirm Implementation'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
