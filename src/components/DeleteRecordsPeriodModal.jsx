import React, { useState } from 'react';
import { X, Trash2, Calendar, AlertTriangle, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: '3months', label: 'Last 3 Months' },
  { value: '6months', label: 'Last 6 Months' },
  { value: 'all', label: 'All Time' },
  { value: 'custom', label: 'Custom Range...' },
];

export default function DeleteRecordsPeriodModal({ isOpen, onClose, onConfirm, customerName }) {
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  // Use local time for default inputs to avoid off-by-one errors
  const [customDates, setCustomDates] = useState({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedPeriod === 'custom') {
      onConfirm(selectedPeriod, customDates);
    } else {
      onConfirm(selectedPeriod);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] overflow-y-auto bg-black/40 backdrop-blur-md pointer-events-auto" onClick={onClose}>
      <div className="min-h-full flex items-center justify-center p-4">
        <div 
          className="bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] w-full max-w-md overflow-hidden relative border border-[#E8F8F9] p-7 pt-10 pointer-events-auto transform transition-all animate-scale-up"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>

          <div className="flex flex-col">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center border border-red-100/50 shadow-sm">
                <Trash2 className="text-[#DC2626]" size={28} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#108587]">Clear Records</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">History for {customerName}</p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-[#108587] uppercase tracking-wider ml-1">
                  Select Time Period
                </label>
                <div className="relative group">
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="w-full appearance-none bg-slate-50 border border-[#20dbdf] text-gray-900 text-sm font-semibold rounded-xl focus:ring-4 focus:ring-[#108587]/5 focus:border-[#108587] block p-4 pr-12 transition-all outline-none cursor-pointer hover:bg-slate-100/50"
                  >
                    {PERIOD_OPTIONS.map((period) => (
                      <option key={period.value} value={period.value}>
                        {period.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-[#108587]">
                    <ChevronDown size={20} />
                  </div>
                </div>
              </div>

              {selectedPeriod === 'custom' && (
                <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Start Date</label>
                    <input
                      type="date"
                      value={customDates.startDate}
                      onChange={(e) => setCustomDates(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full bg-slate-50 border border-[#20dbdf]/50 text-gray-900 text-xs font-semibold rounded-xl p-3 outline-none focus:border-[#108587] transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">End Date</label>
                    <input
                      type="date"
                      value={customDates.endDate}
                      onChange={(e) => setCustomDates(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full bg-slate-50 border border-[#20dbdf]/50 text-gray-900 text-xs font-semibold rounded-xl p-3 outline-none focus:border-[#108587] transition-all"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-amber-50 border border-amber-100/50 rounded-2xl p-4 mb-8 flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="text-amber-600" size={18} />
              </div>
              <p className="text-[11px] text-amber-800 font-semibold leading-relaxed">
                Selected records will be permanently erased. Customer balance will be synchronized automatically based on remaining data.
              </p>
            </div>

            <div className="flex w-full gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-3.5 bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-slate-100 transition-all cursor-pointer border border-slate-200/50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-3.5 bg-gradient-to-br from-[#DC2626] to-[#ef4444] text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-red-500/10 transition-all cursor-pointer active:scale-95 hover:scale-[1.02]"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
