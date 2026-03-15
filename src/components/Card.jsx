import React, { useState } from 'react';

const Card = ({ item, onEdit, onDelete }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const formatDate = (date) => {
    if (!date) return 'N/A';
    
    try {
      const jsDate = date?.toDate ? date.toDate() : new Date(date);
      return isNaN(jsDate.getTime()) 
        ? 'Invalid Date' 
        : jsDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  const handleEditClick = (e) => {
    e.stopPropagation(); 
    onEdit(item); 
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    onDelete(item.id);
    setShowDeleteConfirm(false);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <div className="group relative h-full">
        <div className="absolute inset-0 bg-gradient-to-br from-[#108587]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl -m-0.5 blur-xl" />
        <div className="glass-card w-full h-full rounded-2xl relative overflow-hidden transition-all duration-500 hover:translate-y-[-2px] hover:shadow-2xl border border-white/60 flex flex-col">
          <div className="p-6 flex-1 flex flex-col">
            {/* Header with product name and status */}
            <div className="flex justify-between items-start mb-6 gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-[#108587] truncate tracking-tight mb-0.5">
                  {item.productName}
                </h3>
                <div className="flex items-center gap-1.5 text-gray-400">
                    <span className="text-[9px] font-bold uppercase tracking-[0.15em] pl-0.5">Stock Item</span>
                </div>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider shrink-0 shadow-sm ${
                item.quantity > 0 
                  ? 'bg-emerald-50 text-[#108587] border border-[#108587]/10' 
                  : 'bg-red-50 text-red-600 border border-red-100'
              }`}>
                {item.quantity > 0 ? 'In Stock' : 'Out of Stock'}
              </span>
            </div>
            
            {/* Product details */}
            <div className="space-y-3 mb-8 flex-1">
              <div className="group/item flex justify-between items-center bg-white/50 p-1.5 rounded-xl bg-gradient-to-l from-[#108587]/5 to-[#108587]/20  transition-colors hover:bg-white/80">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-[#108587] rounded-lg flex items-center justify-center text-white">
                         <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                    </div>
                    <span className="text-[9px] font-bold text-[#108587] uppercase tracking-widest">Qty</span>
                </div>
                <span className="text-md font-bold text-[#108587] pr-1">
                  {Number(item.quantity).toLocaleString()} <span className="text-[10px] text-[#108587] font-medium ml-0.5">{item.quantity === 1 ? 'unit' : 'units'}</span>
                </span>
              </div>

              {item.price != null && Number(item.price) !== 0 && (
                <div className="group/item flex justify-between items-center bg-gradient-to-l from-[#108587]/5 to-[#108587]/20 p-1.5 rounded-xl  transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-[#108587] rounded-lg flex items-center justify-center text-white">
                         <span className="text-[10px] font-bold">Rs</span>
                    </div>
                    <span className="text-[9px] font-bold text-[#108587] uppercase tracking-widest">Price</span>
                  </div>
                  <span className="text-md font-bold text-[#108587] pr-1">Rs {Number(item.price).toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between items-center px-1.5 py-0.5">
                <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">Updated</span>
                <span className="text-[10px] font-semibold text-gray-400">
                  {formatDate(item.createdAt)}
                </span>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-2.5 mt-auto">
              <button
                onClick={handleEditClick}
                className="flex-1 py-2 bg-gradient-to-br from-[#108587] to-[#14a3a6] text-white font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-[#bdfbfd] transition-all cursor-pointer active:scale-95 shadow-sm shadow-[#108587]/5 flex items-center justify-center gap-2"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                Edit
              </button>
              <button
                onClick={handleDeleteClick}
                className="px-4 py-2.5 bg-gradient-to-br from-[#FFC0C0] to-[#FFE7E3] text-[#DC2626] font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-[#fddada] transition-all cursor-pointer active:scale-95 shadow-sm shadow-red-100/50 flex items-center justify-center"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 z-[2000] overflow-y-auto bg-black/40 backdrop-blur-md pointer-events-auto"
          onClick={cancelDelete}
        >
          <div className="min-h-full flex items-center justify-center p-4">
            <div 
              className="w-full max-w-sm bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-[#E8F8F9] p-8 text-center animate-scale-up pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-[#DC2626] mx-auto mb-6 shadow-sm border border-red-100/50">
                 <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                 </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 text-[#108587]">
                Are you sure?
              </h3>
              <p className="text-xs font-semibold text-gray-500 mb-8 leading-relaxed">
                This action cannot be undone. This product will be permanently removed from your active stock logs.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={confirmDelete}
                  className="w-full py-3.5 bg-gradient-to-br from-[#DC2626] to-[#ef4444] text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-red-500/10 transition-all cursor-pointer active:scale-95 hover:scale-[1.02]"
                >
                  Yes, Remove Item
                </button>
                <button
                  onClick={cancelDelete}
                  className="w-full py-3.5 bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-slate-100 transition-all cursor-pointer active:scale-95 border border-slate-200/50"
                >
                  Keep Product
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default React.memo(Card);