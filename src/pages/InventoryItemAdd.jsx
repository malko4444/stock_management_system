import React, { useContext, useEffect, useState, useRef } from 'react';
import { inventoryApi } from '../services/firebaseApi';
import InventoryProducts from '../components/InventoryProducts';
import { AdminDataContext } from './AdminContext';
import { LoanContext } from '../contexts/LoanContext';
import { toast } from 'react-toastify';
import { PackagePlus, ClipboardList, Info, CircleHelp } from 'lucide-react';
import 'react-toastify/dist/ReactToastify.css';

function InventoryItemAdd({ embedded = false }) {
    const { updatedData, setUpdatedData } = useContext(AdminDataContext);
    const { user } = useContext(LoanContext);
    const [productName, setProductName] = useState('');
    const [quantity, setQuantity] = useState('');
    const [price, setPrice] = useState('');
    const adminId = user?.uid;
    const inventoryProductsRef = useRef(null);

    useEffect(() => {
        if (updatedData && Object.keys(updatedData).length > 0) {
            setProductName(updatedData.productName || '');
            setQuantity(updatedData.quantity ?? '');
            setPrice(updatedData.price ?? '');
        }
    }, [updatedData]);

    const resetForm = () => {
        setProductName('');
        setQuantity('');
        setPrice('');
        setUpdatedData(null);
    };

    const addInventoryItem = async () => {
        if (!productName || !quantity) {
            toast.error('Please fill all fields');
            return;
        }

        try {
            const qty = Number(quantity);
            const unitPrice = price === '' ? 0 : Number(price);

            if (!updatedData) {
                const newId = await inventoryApi.add({
                    productName,
                    quantity: qty,
                    price: unitPrice,
                    adminId,
                });
                toast.success('Inventory added successfully!');
            } else {
                await inventoryApi.update(updatedData.id, {
                    productName,
                    quantity: qty,
                    price: unitPrice,
                });

                toast.success('Inventory updated successfully!');
            }
            resetForm();
        } catch (error) {
            console.error('Error saving inventory:', error);
            toast.error(updatedData ? 'Failed to update inventory' : 'Failed to add inventory');
        }
    };

    return (
        <>
        <div className={embedded ? "w-full overflow-visible" : "min-h-screen w-full pb-20 bg-transparent flex flex-col items-center relative overflow-hidden"}>
            {!embedded && (
                <>
                    {/* Artistic Background Decor */}
                    <div className="absolute top-20 -left-20 w-80 h-80 bg-[#108587]/5 rounded-full blur-[100px] animate-float pointer-events-none" />
                    <div className="absolute bottom-20 -right-20 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] animate-pulse-slow pointer-events-none" />
                </>
            )}

            <div className={embedded ? "w-full" : "max-w-2xl w-full px-6 pt-10 relative z-10"}>
                <div className="glass-card rounded-3xl border border-white/60 hover:border-[#20dbdf]/30 shadow-[0_0_50px_rgba(0,0,0,0.12)] overflow-hidden transition-all duration-500">
                    <div className="bg-gradient-to-r from-[#108587]/10 to-transparent px-7 py-5 border-b border-white/40 flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#108587] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#108587]/20">
                            <PackagePlus size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Add Inventory Batch</h2>
                            <p className="text-gray-400 font-bold text-[9px] uppercase tracking-widest">Update stock records</p>
                        </div>
                    </div>

                    <div className="p-7 sm:p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                            <div className="md:col-span-2 group">
                                <label className="flex items-center gap-2 text-[10px] font-bold text-[#108587] mb-1.5 uppercase tracking-[0.2em] transition-colors">
                                    <ClipboardList size={12} />
                                    Product Name *
                                </label>
                                <input 
                                    value={productName} 
                                    onChange={(e) => setProductName(e.target.value)} 
                                    placeholder="e.g. Premium Cotton Finish"
                                    className="w-full bg-white/70 border border-[#20dbdf] rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:ring-4 focus:ring-[#108587]/5 focus:border-[#108587] transition-all outline-none placeholder:text-gray-300 shadow-sm" 
                                />
                            </div>

                            <div className="group">
                                <label className="flex items-center gap-2 text-[10px] font-bold text-[#108587] mb-1.5 uppercase tracking-[0.2em] transition-colors">
                                    <Info size={12} />
                                    Initial Quantity *
                                </label>
                                <input 
                                    type="number" 
                                    value={quantity} 
                                    onChange={(e) => setQuantity(e.target.value)} 
                                    placeholder="0"
                                    className="w-full bg-white/70 border border-[#20dbdf] rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:ring-4 focus:ring-[#108587]/5 focus:border-[#108587] transition-all outline-none shadow-sm" 
                                />
                            </div>

                            <div className="group">
                                <label className="flex items-center gap-2 text-[10px] font-bold text-[#108587] mb-1.5 uppercase tracking-[0.2em] transition-colors">
                                    Rs
                                    Base Unit Price
                                </label>
                                <input 
                                    type="number" 
                                    value={price} 
                                    onChange={(e) => setPrice(e.target.value)} 
                                    placeholder="0"
                                    className="w-full bg-white/70 border border-[#20dbdf] rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:ring-4 focus:ring-[#108587]/5 focus:border-[#108587] transition-all outline-none shadow-sm" 
                                />
                            </div>


                            <div className="md:col-span-2 flex justify-end pt-6 mt-2 border-t border-white/40">
                                <button 
                                    onClick={addInventoryItem} 
                                    className="px-8 py-3.5 bg-gradient-to-br from-[#108587] to-[#14a3a6] text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-xl shadow-[#108587]/20 hover:scale-[1.02] hover:shadow-2xl transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                                >
                                    <PackagePlus size={16} />
                                    {updatedData ? "Update Record" : "Save Batch"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {!embedded && (
                    <div className="mt-16 w-full">
                         <div className="flex items-center gap-4 mb-8 px-4">
                            <div className="h-px bg-white/40 flex-1"></div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Quick View Overview</span>
                            <div className="h-px bg-white/40 flex-1"></div>
                         </div>
                         <InventoryProducts ref={inventoryProductsRef} />
                    </div>
                )}
            </div>
        </div>
        </>
    );
}

export default InventoryItemAdd;