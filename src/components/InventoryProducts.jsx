import React, { useState, useEffect, useContext } from 'react';
import { inventoryApi, deletedRecordsApi } from '../services/firebaseApi';
import { AdminDataContext } from '../pages/AdminContext';
import { customerDataDataContext } from '../pages/CustomerContext';
import Card from './Card';
import { Pencil, CirclePlus, X } from 'lucide-react';
import { LoanContext } from '../contexts/LoanContext';
import { toast } from 'react-toastify';

function InventoryProducts({ searchTerm }) {
    const { setUpdatedData } = useContext(AdminDataContext);
    const { setInventoryItem } = useContext(customerDataDataContext);
    const { inventory } = useContext(LoanContext);
    const [loadingState, setLoadingState] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [newItem, setNewItem] = useState({ productName: '', quantity: '', price: '', createdAt: new Date() });

    const adminId = localStorage.getItem("adminId");

    const filteredInventory = (typeof searchTerm === 'string' ? inventory.filter(item =>
        item.productName?.toLowerCase().includes(searchTerm.toLowerCase())
    ) : inventory);

    useEffect(() => {
        if (inventory) {
            setInventoryItem(inventory);
        }
    }, [inventory, setInventoryItem]);

    const deleteProductFromInventory = async (productId) => {
        try {
            const item = inventory.find((i) => i.id === productId);
            if (item) {
                await deletedRecordsApi.add({
                    type: 'inventory',
                    admin_id: adminId,
                    productName: item.productName,
                    quantity: item.quantity ?? 0,
                    rate: item.price ?? 0,
                    totalAmount: (item.quantity ?? 0) * (item.price ?? 0),
                });
            }
            await inventoryApi.delete(productId);
            toast.success('Product deleted successfully');
        } catch (error) {
            console.error("Error deleting product: ", error);
            toast.error('Failed to delete product');
        }
    };

    const editHandler = (item) => {
        setUpdatedData(item);
        setShowForm(true);
        setNewItem({ ...item, price: item.price ?? '' });
    };

    const handleAddItem = async () => {
        if (!newItem.productName?.trim() || !newItem.quantity) {
            toast.error('Please enter both product name and quantity');
            return;
        }

        try {
            const qty = Number(newItem.quantity);
            const pr = newItem.price === '' || newItem.price == null ? 0 : Number(newItem.price);

            if (newItem.id) {
                await inventoryApi.update(newItem.id, {
                    productName: newItem.productName.trim(),
                    quantity: qty,
                    price: pr,
                });
                toast.success('Product updated successfully');
            } else {
                await inventoryApi.add({
                    productName: newItem.productName.trim(),
                    quantity: qty,
                    price: pr,
                    adminId,
                });
                toast.success('Product added successfully');
            }
            setNewItem({ productName: '', quantity: '', price: '', createdAt: new Date() });
            setShowForm(false);
        } catch (error) {
            console.error("Error adding/updating item: ", error);
            toast.error('Failed to save product');
        }
    };
    

    if (loadingState) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-[960px] w-full pb-8 bg-slate-50 flex flex-col">
            <div className="flex items-center justify-between p-6">
                <div>
                    <h2 className="text-[21px] font-bold text-[#108587] tracking-tight">
                        Inventory Products
                    </h2>
                    <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-0.5">Manage your stock records</p>
                </div>
                <button
                    onClick={() => {
                        setShowForm(true);
                        setNewItem({ productName: '', quantity: '', price: '', createdAt: new Date() });
                    }}
                    className="group px-6 py-2.5 bg-[#108587] text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-[#108587]/20 hover:scale-[1.05] transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                >
                    <CirclePlus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                    <span>Add Item</span>
                </button>
            </div>

            {showForm && (
                <>
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-md z-[1000] transition-all duration-300"
                        onClick={() => setShowForm(false)}
                    />
                    <div className="fixed inset-0 flex items-center justify-center z-[1001] p-4 pointer-events-none">
                        <div
                            className="w-full max-w-sm mx-auto bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-[#E8F8F9] overflow-hidden pointer-events-auto transform transition-all animate-scale-up"
                        >
                            <div className="bg-gradient-to-r from-[#108587]/5 to-transparent px-8 py-6 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="text-xl font-bold flex gap-3 text-[#108587] items-center">
                                    {newItem.id ? (
                                        <>
                                            <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center border border-[#108587]/10">
                                                <Pencil className="w-4 h-4" />
                                            </div>
                                            <span>Edit Product</span>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center border border-[#108587]/10">
                                                <CirclePlus className="w-5 h-5" />
                                            </div>
                                            <span>Add New Product</span>
                                        </>
                                    )}
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-8 space-y-5">
                                <div className="group">
                                    <h2 className="mb-3 text-[10px] font-bold text-[#108587] uppercase tracking-widest">Product Name *</h2>
                                    <input
                                        type="text"
                                        value={newItem.productName}
                                        onChange={(e) => setNewItem({ ...newItem, productName: e.target.value })}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                                        placeholder="Enter product name..."
                                        className="w-full bg-slate-50 border border-[#20dbdf] rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:ring-4 focus:ring-[#108587]/5 focus:border-[#108587] transition-all outline-none placeholder:text-gray-300"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="group">
                                        <h2 className="mb-3 text-[10px] font-bold text-[#108587] uppercase tracking-widest">Quantity *</h2>
                                        <input
                                            type="number"
                                            value={newItem.quantity}
                                            onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                                            placeholder="0"
                                            className="w-full bg-slate-50 border border-[#20dbdf] rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:ring-4 focus:ring-[#108587]/5 focus:border-[#108587] transition-all outline-none placeholder:text-gray-300"
                                        />
                                    </div>
                                    <div className="group">
                                        <h2 className="mb-3 text-[10px] font-bold text-[#108587] uppercase tracking-widest">Price per unit</h2>
                                        <input
                                            type="number"
                                            value={newItem.price ?? ''}
                                            onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                                            placeholder="Rs 0"
                                            className="w-full bg-slate-50 border border-[#20dbdf] rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:ring-4 focus:ring-[#108587]/5 focus:border-[#108587] transition-all outline-none placeholder:text-gray-300"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-gray-50 mt-2">
                                    <button
                                        onClick={() => {
                                            setShowForm(false);
                                            setNewItem({ productName: '', quantity: '', price: '', createdAt: new Date() });
                                        }}
                                        className="flex-1 py-3 text-[#DC2626] bg-[#FFE7E7] hover:bg-[#fddada] transition-colors cursor-pointer rounded-lg text-xs font-semibold uppercase tracking-widest"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAddItem}
                                        className="flex-2 py-3 bg-gradient-to-br from-[#108587] to-[#14a3a6] text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-[#108587]/10 hover:scale-[1.02] hover:shadow-xl transition-all active:scale-95 cursor-pointer border border-[#14a3a6]/50"
                                    >
                                        {newItem.id ? 'Update' : 'Save'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 pb-4 px-4 overflow-y-auto">
                {filteredInventory.length > 0 ? (
                    filteredInventory.map((item) => (
                    <Card 
                        key={item.id}
                        item={item}
                        onEdit={editHandler}
                        onDelete={deleteProductFromInventory}
                    />
                    ))
                ) : (
                    <div className="col-span-full text-center py-8 text-gray-500 font-medium">
                    {searchTerm ? 'No products match your search' : 'No products available'}
                    </div>
                )}
            </div>
        </div>
    );
}

export default InventoryProducts;