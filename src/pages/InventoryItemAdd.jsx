import React, { useContext, useEffect, useState, useRef } from 'react';
import { inventoryApi } from '../services/firebaseApi';
import InventoryProducts from '../components/InventoryProducts';
import { AdminDataContext } from './AdminContext';
import { FinancialContext } from '../contexts/FinancialContext';
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
    const financial = React.useContext(FinancialContext);

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

                // Create payable entry if this was purchased 'on account'
                if (onAccount && financial?.createPayableForInventory) {
                    try {
                        await financial.createPayableForInventory({
                            admin_id: adminId,
                            inventory_id: newId,
                            vendor_id: null,
                            vendor_name: vendorName || 'Unknown Vendor',
                            description: `Inventory purchase: ${productName}`,
                            amount: qty * unitPrice,
                            created_at: new Date(),
                            status: 'pending',
                            meta: { quantity: qty }
                        });
                    } catch (e) {
                        console.error('Error creating payable for inventory:', e);
                    }
                }

                toast.success('Inventory added successfully!');
            } else {
                await inventoryApi.update(updatedData.id, {
                    productName,
                    quantity: qty,
                    price: unitPrice,
                    vendor_name: vendorName || updatedData.vendor_name,
                    on_account: !!onAccount,
                });

                // If price changed, update estimated value in payables for any open orders
                if (Number(updatedData.price) !== unitPrice && financial?.updatePayablesForInventoryPriceChange) {
                    try {
                        await financial.updatePayablesForInventoryPriceChange({ admin_id: adminId, inventory_id: updatedData.id, newUnitPrice: unitPrice });
                    } catch (e) {
                        console.error('Failed to update payables after price change:', e);
                    }
                }

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
                <div className="max-w-xl w-full bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-semibold text-[#108587] mb-4">Add Inventory Batch</h2>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Product Name</label>
                            <input value={productName} onChange={(e) => setProductName(e.target.value)} className="w-full border rounded px-3 py-2" />
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700">Quantity</label>
                                <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full border rounded px-3 py-2" />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700">Unit Price</label>
                                <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full border rounded px-3 py-2" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Vendor (optional)</label>
                            <input value={vendorName} onChange={(e) => setVendorName(e.target.value)} className="w-full border rounded px-3 py-2" />
                        </div>
                        <div className="flex items-center gap-2">
                            <input id="onAccount" type="checkbox" checked={onAccount} onChange={(e) => setOnAccount(e.target.checked)} />
                            <label htmlFor="onAccount" className="text-sm text-gray-700">Purchase On Account</label>
                        </div>
                        <div className="flex justify-end">
                            <button onClick={addInventoryItem} className="px-4 py-2 bg-[#108587] text-white rounded">Save</button>
                        </div>
                    </div>
                </div>

                <InventoryProducts ref={inventoryProductsRef} />
            </div>
        </>
    );
}

export default InventoryItemAdd;