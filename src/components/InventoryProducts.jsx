import React, { useState, useEffect, useContext } from 'react';
import { db } from "../../firebaseConfig";
import { collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { AdminDataContext } from '../pages/AdminContext';
import { Link } from 'react-router';
import { customerDataDataContext } from '../pages/CustomerContext';

function InventoryProducts({ onInventoryUpdate }) {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const { setUpdatedData } = useContext(AdminDataContext);
    const { customerData, setCustomerData, customerId, setCustomerId,inventoryItem,setInventoryItem } = useContext(customerDataDataContext);
      
    const adminId = localStorage.getItem("adminId");

    const fetchInventory = async () => {
        try {
            // Create a query to filter by adminId
            const q = query(
                collection(db, "inventory"), 
                where("adminId", "==", adminId)
            );
            
            const querySnapshot = await getDocs(q);
            const inventoryList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            setInventory(inventoryList);
            setInventoryItem(inventoryList)
            console.log("Filtered inventory for admin: ant the", inventoryList);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching inventory: ", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInventory();
    }, []);

    const deleteProductFromInventory = async (productId) => {
        try {
            const isConfirmed = window.confirm("Are you sure you want to delete this product?");
            if (!isConfirmed) return;

            await deleteDoc(doc(db, "inventory", productId));
            setInventory(prevInventory => 
                prevInventory.filter(item => item.id !== productId)
            );
            console.log("Product deleted successfully!");
        } catch (error) {
            console.error("Error deleting product: ", error);
        }
    };

    const editHandler = (item) => {
        setUpdatedData(item);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                    Inventory Products
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {inventory.map((item) => (
                        <div 
                            key={item.id}
                            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300"
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                        {item.productName}
                                    </h3>
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                        In Stock
                                    </span>
                                </div>
                                <div className="mt-4 space-y-2">
                                    <div className="flex justify-between text-gray-600">
                                        <span>Quantity:</span>
                                        <span className="font-medium">{item.quantity}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Price:</span>
                                        <span className="font-medium">₹{item.price}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Added:</span>
                                        <span className="font-medium">
                                            {item.createdAt?.toDate().toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end space-x-3">
                                    <Link to="/inventoryItem">
                                    <button 
                                        onClick={() => editHandler(item)} 
                                        className="px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
                                    >
                                        Edit
                                    </button></Link>
                                    <button 
                                        onClick={() => deleteProductFromInventory(item.id)} 
                                        className="px-4 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default InventoryProducts;

