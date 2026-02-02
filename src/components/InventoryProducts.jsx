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

            <div className="flex items-center justify-between p-4">
                <h2 className="text-[21px] font-semibold text-[#108587]">
                    Inventory Products
                </h2>
                <button
                    onClick={() => {
                        setShowForm(true);
                        setNewItem({ productName: '', quantity: '', price: '', createdAt: new Date() });
                    }}
                    className="bg-[#108587] text-white text-xl font-semibold px-5 py-1 rounded-md cursor-pointer transition hover:bg-[#17BCBE]"
                >
                    +
                </button>
            </div>

            {showForm && (
                <>
                    <div
                        className="fixed inset-0 bg-transparent bg-opacity-10 backdrop-blur-xs z-40"
                        onClick={() => setShowForm(false)}
                    />
                    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
                        <div
                            className="w-full max-w-md mx-auto px-6 pt-13 border border-gray-300 rounded-lg shadow-xl bg-white pointer-events-auto"
                        >
                            <h3 className="text-2xl items-center font-semibold mb-8 flex gap-2 text-[#108587]">
                                {newItem.id ? (
                                    <>
                                        <Pencil className="w-6 h-6" />
                                        <span>Edit Product</span>
                                    </>
                                ) : (
                                    <>
                                        <CirclePlus className="w-5 h-5 text-[#108587]" />
                                        <span>Add New Product</span>
                                    </>
                                )}
                            </h3>
                            <h2 className='mb-3 text-[#108587] font-semibold '>Product Name</h2>
                            <input
                                type="text"
                                value={newItem.productName}
                                onChange={(e) => setNewItem({ ...newItem, productName: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                                className="w-full p-3 mb-2 border border-gray-300 rounded-md"
                            />
                            <h2 className='mb-3 text-[#108587] font-semibold '>Quantity</h2>
                            <input
                                type="number"
                                value={newItem.quantity}
                                onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                                className="w-full p-3 mb-2 border border-gray-300 rounded-md"
                            />
                            <h2 className='mb-3 text-[#108587] font-semibold '>Price per unit (optional)</h2>
                            <input
                                type="number"
                                value={newItem.price ?? ''}
                                onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                                className="w-full p-3 mb-6 border border-gray-300 rounded-md"
                            />
                            <div className="flex justify-end space-x-3 my-4">
                                <button
                                    onClick={() => {
                                        setShowForm(false);
                                        setNewItem({ productName: '', quantity: '', price: '', createdAt: new Date() });
                                    }}
                                    className="px-4 py-2 text-[#DC2626] rounded-md bg-[#FFE7E7] hover:bg-[#fddada] transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddItem}
                                    className="px-4 py-2 bg-[#C9FEFF] text-[#108587] rounded-md hover:bg-[#bdfbfd] transition-colors cursor-pointer"
                                >
                                    {newItem.id ? 'Update' : 'Save'}
                                </button>
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