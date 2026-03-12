import React, { useState, useEffect, useContext } from 'react';
import { inventoryApi, deletedRecordsApi } from '../services/firebaseApi';
import { AdminDataContext } from '../pages/AdminContext';
import { customerDataDataContext } from '../pages/CustomerContext';
import Card from './Card';
import { Pencil, CirclePlus } from 'lucide-react';

function InventoryProducts({ onInventoryUpdate, searchTerm }) {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [newItem, setNewItem] = useState({ productName: '', quantity: '', price: '', createdAt: new Date() });
    const [toast, setToast] = useState({ show: false, message: '' });
    const { setUpdatedData } = useContext(AdminDataContext);
    const { setInventoryItem } = useContext(customerDataDataContext);

    const adminId = localStorage.getItem("adminId");

    const showToast = (message) => {
        setToast({ show: true, message });
        setTimeout(() => setToast({ show: false, message: '' }), 3000);
    };

    const filteredInventory = (typeof searchTerm === 'string' ? inventory.filter(item =>
        item.productName?.toLowerCase().includes(searchTerm.toLowerCase())
    ) : inventory);

    const fetchInventory = async () => {
        try {
            const inventoryList = await inventoryApi.getByAdmin(adminId);
            setInventory(inventoryList);
            setInventoryItem(inventoryList);
        } catch (error) {
            console.error("Error fetching inventory: ", error);
            showToast('Failed to load inventory');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInventory();
    }, []);

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
            const next = inventory.filter((i) => i.id !== productId);
            setInventory(next);
            setInventoryItem(next);
            showToast('Product deleted successfully');
        } catch (error) {
            console.error("Error deleting product: ", error);
            showToast('Failed to delete product');
        }
    };

    const editHandler = (item) => {
        setUpdatedData(item);
        setShowForm(true);
        setNewItem({ ...item, price: item.price ?? '' });
    };

    const handleAddItem = async () => {
        if (!newItem.productName?.trim() || !newItem.quantity) {
            showToast('Please enter both product name and quantity');
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
                setInventory((prev) =>
                    prev.map((i) =>
                        i.id === newItem.id
                            ? { ...i, productName: newItem.productName.trim(), quantity: qty, price: pr }
                            : i
                    )
                );
                showToast('Product updated successfully');
            } else {
                const id = await inventoryApi.add({
                    productName: newItem.productName.trim(),
                    quantity: qty,
                    price: pr,
                    adminId,
                });
                setInventory((prev) => [
                    ...prev,
                    { id, productName: newItem.productName.trim(), quantity: qty, price: pr, adminId, createdAt: new Date() }
                ]);
                showToast('Product added successfully');
            }
            setNewItem({ productName: '', quantity: '', price: '', createdAt: new Date() });
            setShowForm(false);
            setInventoryItem(await inventoryApi.getByAdmin(adminId));
        } catch (error) {
            console.error("Error adding/updating item: ", error);
            showToast('Failed to save product');
        }
    };
    

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-[960px] w-full pb-8 bg-slate-50 flex flex-col">
            {toast.show && (
                <div className="fixed z-50 bottom-4 right-4 bg-[#108587] text-white px-4 py-2 rounded-md shadow-lg animate-fade-in">
                    {toast.message}
                </div>
            )}

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
                        className="fixed inset-0 bg-black/20 backdrop-blur-md z-40 transition-all duration-300"
                        onClick={() => setShowForm(false)}
                    />
                    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
                        <div
                            className="w-full max-w-md mx-auto bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-[#E8F8F9] overflow-hidden pointer-events-auto transform transition-all animate-scale-up"
                        >
                            <div className="bg-gradient-to-r from-[#108587]/5 to-transparent px-8 py-6 border-b border-gray-100">
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
                            </div>

                            <div className="p-8 space-y-5">
                                <div className="group">
                                    <h2 className="mb-3 text-[#108587] font-semibold">Product Name *</h2>
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
                                        <h2 className="mb-3 text-[#108587] font-semibold">Quantity *</h2>
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
                                        <h2 className="mb-3 text-[#108587] font-semibold">Price per unit</h2>
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
                                        className="flex-1 py-3 text-[#DC2626] font-bold text-xs uppercase tracking-widest rounded-xl bg-red-50 hover:bg-red-100 transition-all cursor-pointer active:scale-95"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAddItem}
                                        className="flex-2 py-3 bg-gradient-to-br from-[#108587] to-[#14a3a6] text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-[#108587]/10 hover:scale-[1.02] hover:shadow-xl transition-all active:scale-95 cursor-pointer"
                                    >
                                        {newItem.id ? 'Update' : 'Save'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 pb-4 px-4">
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
                    <div className="col-span-full text-center py-8 text-gray-500">
                    {searchTerm ? 'No products match your search' : 'No products available'}
                    </div>
                )}
            </div>
        </div>
    );
}

export default InventoryProducts;