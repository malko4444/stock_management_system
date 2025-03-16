import React, { useContext, useEffect, useState, useRef } from 'react'
import { db } from '../../firebaseConfig'
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore'
import InventoryProducts from '../components/InventoryProducts'
import { AdminDataContext } from './AdminContext'

function InventoryItemAdd() {
    const { updatedData, setUpdatedData } = useContext(AdminDataContext)
    const [productName, setProductName] = useState('')
    const [quantity, setQuantity] = useState('')
    const [price, setPrice] = useState('')
    const adminId = localStorage.getItem('adminId')
    const inventoryProductsRef = useRef(null)

    useEffect(() => {
        if (updatedData && Object.keys(updatedData).length > 0) {
            setProductName(updatedData.productName || '')
            setQuantity(updatedData.quantity || '')
            setPrice(updatedData.price || '')
        }
    }, [updatedData])

    const resetForm = () => {
        setProductName('')
        setQuantity('')
        setPrice('')
        setUpdatedData(null)
    }

    const addInventoryItem = async () => {
        if (!productName || !quantity || !price) {
            alert('Please fill all fields');
            return;
        }

        if (!updatedData) {
            try {
                const inventoryData = {
                    productName,
                    quantity: Number(quantity),
                    price: Number(price),
                    adminId,
                    createdAt: new Date()
                }
                
                const docRef = await addDoc(collection(db, "inventory"), inventoryData)
                console.log("Inventory added successfully with ID: ", docRef.id)
                
                // Refresh the inventory list
                if (inventoryProductsRef.current?.fetchInventory) {
                    await inventoryProductsRef.current.fetchInventory()
                }
                
                resetForm()
            } catch (error) {
                console.error("Error adding inventory: ", error)
            }
        } else {
            try {
                const docRef = doc(db, "inventory", updatedData.id)
                const updatedInventory = {
                    productName,
                    quantity: Number(quantity),
                    price: Number(price),
                    updatedAt: new Date()
                }

                await updateDoc(docRef, updatedInventory)
                console.log("Document successfully updated!")
                
                // Refresh the inventory list
                if (inventoryProductsRef.current?.fetchInventory) {
                    await inventoryProductsRef.current.fetchInventory()
                }
                
                resetForm()
            } catch (error) {
                console.error("Error updating document: ", error)
            }
        }
    }

    return (
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
                    <input 
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="Price"
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
    )
}

export default InventoryItemAdd