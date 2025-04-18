import React, { useContext, useEffect, useState, useRef } from 'react';
import { db } from '../../firebaseConfig';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import InventoryProducts from '../components/InventoryProducts';
import { AdminDataContext } from './AdminContext';
import { NavBar } from '../components/NavBar';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function InventoryItemAdd() {
    const { updatedData, setUpdatedData } = useContext(AdminDataContext);
    const [productName, setProductName] = useState('');
    const [quantity, setQuantity] = useState('');
    const adminId = localStorage.getItem('adminId');
    const inventoryProductsRef = useRef(null);

    useEffect(() => {
        if (updatedData && Object.keys(updatedData).length > 0) {
            setProductName(updatedData.productName || '');
            setQuantity(updatedData.quantity || '');
        }
    }, [updatedData]);

    const resetForm = () => {
        setProductName('');
        setQuantity('');
        setUpdatedData(null);
        // refresh screen with 2 sec delay 
                setTimeout(() => {
                    window.location.reload();
                    }, 3000);
    };

    const addInventoryItem = async () => {
        if (!productName || !quantity) {
            toast.error('Please fill all fields');
            return;
        }

        if (!updatedData) {
            try {
                const inventoryData = {
                    productName,
                    quantity: Number(quantity),
                    adminId,
                    createdAt: new Date()
                };
                
                const docRef = await addDoc(collection(db, "inventory"), inventoryData);
                toast.success('Inventory added successfully!');
                
                // Refresh the inventory list
                if (inventoryProductsRef.current?.fetchInventory) {
                    await inventoryProductsRef.current.fetchInventory();
                }
                
                resetForm();
            } catch (error) {
                console.error("Error adding inventory: ", error);
                toast.error('Failed to add inventory');
            }
        } else {
            try {
                const docRef = doc(db, "inventory", updatedData.id);
                const updatedInventory = {
                    productName,
                    quantity: Number(quantity),
                    updatedAt: new Date()
                };

                await updateDoc(docRef, updatedInventory);
                toast.success('Inventory updated successfully!');
                
                
                // Refresh the inventory list
                if (inventoryProductsRef.current?.fetchInventory) {
                    await inventoryProductsRef.current.fetchInventory();
                }
                
                resetForm();
            } catch (error) {
                console.error("Error updating document: ", error);
                toast.error('Failed to update inventory');
            }
        }
    };

    return (
        <>
            <NavBar/>
            <div className="min-h-screen bg-gray-100 flex flex-col items-center py-12">
                <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
                    <h2 className="text-2xl font-bold mb-6 text-center">
                        {updatedData ? 'Update Inventory Item' : 'Add Inventory Item'}
                    </h2>
                    <div className="space-y-4">
                        <input 
                            type="text" 
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            placeholder="Product Name"
                            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input 
                            type="number" 
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="Quantity"
                            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button 
                            onClick={addInventoryItem}
                            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors"
                        >
                            {updatedData ? 'Update Item' : 'Add Item'}
                        </button>
                        {updatedData && (
                            <button 
                                onClick={resetForm}
                                className="w-full bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300 transition-colors"
                            >
                                Cancel Update
                            </button>
                        )}
                    </div>
                </div>
                <InventoryProducts ref={inventoryProductsRef} />
            </div>
        </>
    );
}

export default InventoryItemAdd;