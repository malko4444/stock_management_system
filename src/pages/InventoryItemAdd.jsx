import React, { useContext, useEffect, useState, useRef } from 'react';
import { inventoryApi } from '../services/firebaseApi';
import InventoryProducts from '../components/InventoryProducts';
import { AdminDataContext } from './AdminContext';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function InventoryItemAdd({ embedded = false }) {
    const { updatedData, setUpdatedData } = useContext(AdminDataContext);
    const [productName, setProductName] = useState('');
    const [quantity, setQuantity] = useState('');
    const [price, setPrice] = useState('');
    const [vendorName, setVendorName] = useState('');
    const [onAccount, setOnAccount] = useState(false);
    const adminId = localStorage.getItem('adminId');
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
        setTimeout(() => window.location.reload(), 3000);
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
                    vendor_name: vendorName || null,
                    on_account: !!onAccount,
                });
                toast.success('Inventory added successfully!');
            } else {
                await inventoryApi.update(updatedData.id, {
                    productName,
                    quantity: qty,
                    price: unitPrice,
                    vendor_name: vendorName || updatedData.vendor_name,
                    on_account: !!onAccount,
                });

                toast.success('Inventory updated successfully!');
            }
            if (inventoryProductsRef.current?.fetchInventory) {
                await inventoryProductsRef.current.fetchInventory();
            }
            resetForm();
        } catch (error) {
            console.error('Error saving inventory:', error);
            toast.error(updatedData ? 'Failed to update inventory' : 'Failed to add inventory');
        }
    };

    return (
        <>
            <div className={embedded ? "min-h-0 flex flex-col items-center py-2 md:py-2" : "min-h-screen bg-gray-100 flex flex-col items-center py-12"}>
                <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl border border-[#E8F8F9] p-6 sm:p-8 mb-6">
                    <h2 className="text-xl font-bold text-[#108587] mb-6">Add Inventory Batch</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-[#108587] mb-1 uppercase tracking-tight">Product Name *</label>
                            <input 
                                value={productName} 
                                onChange={(e) => setProductName(e.target.value)} 
                                placeholder="Enter product name..."
                                className="w-full border border-[#20dbdf] rounded-lg px-4 py-2 text-sm focus:ring-4 focus:ring-[#108587]/10 focus:border-[#108587] transition-all outline-none" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[#108587] mb-1 uppercase tracking-tight">Quantity *</label>
                            <input 
                                type="number" 
                                value={quantity} 
                                onChange={(e) => setQuantity(e.target.value)} 
                                placeholder="0"
                                className="w-full border border-[#20dbdf] rounded-lg px-4 py-2 text-sm focus:ring-4 focus:ring-[#108587]/10 focus:border-[#108587] transition-all outline-none" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[#108587] mb-1 uppercase tracking-tight">Unit Price (Rs)</label>
                            <input 
                                type="number" 
                                value={price} 
                                onChange={(e) => setPrice(e.target.value)} 
                                placeholder="0"
                                className="w-full border border-[#20dbdf] rounded-lg px-4 py-2 text-sm focus:ring-4 focus:ring-[#108587]/10 focus:border-[#108587] transition-all outline-none" 
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-[#108587] mb-1 uppercase tracking-tight">Vendor (Optional)</label>
                            <input 
                                value={vendorName} 
                                onChange={(e) => setVendorName(e.target.value)} 
                                placeholder="Supplier name..."
                                className="w-full border border-[#20dbdf] rounded-lg px-4 py-2 text-sm focus:ring-4 focus:ring-[#108587]/10 focus:border-[#108587] transition-all outline-none" 
                            />
                        </div>
                        <div className="md:col-span-2 flex items-center gap-3 py-2">
                            <input 
                                id="onAccount" 
                                type="checkbox" 
                                checked={onAccount} 
                                onChange={(e) => setOnAccount(e.target.checked)}
                                className="w-4 h-4 text-[#108587] border border-[#20dbdf] rounded-lg focus:ring-[#108587] cursor-pointer" 
                            />
                            <label htmlFor="onAccount" className="text-sm font-medium text-gray-600 cursor-pointer">Purchase On Account</label>
                        </div>
                        <div className="md:col-span-2 flex justify-end pt-4 mt-2 border-t border-gray-50">
                            <button 
                                onClick={addInventoryItem} 
                                className="px-8 py-2.5 bg-[#108587] text-white text-sm font-bold rounded-lg hover:bg-[#0e7274] shadow-lg shadow-[#108587]/20 transition-all active:scale-95 cursor-pointer"
                            >
                                {updatedData ? "Update Inventory" : "Save Inventory"}
                            </button>
                        </div>
                    </div>
                </div>

                <InventoryProducts ref={inventoryProductsRef} />
            </div>
        </>
    );
}

export default InventoryItemAdd;