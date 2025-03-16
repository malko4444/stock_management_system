import React, { useContext, useState } from 'react'
import { customerDataDataContext } from './CustomerContext'
import { db } from '../../firebaseConfig'
import { collection, addDoc } from 'firebase/firestore'

function AddCustomerRecord() {
    const {customerData, customerId} = useContext(customerDataDataContext)
    const [formData, setFormData] = useState({
        productName: '',
        soldPrice: '',
        quantity: '',
        totalPrice: '',
        date: '',
        paymentMethod: ''
    })

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleSubmit = async () => {
        try {
            const recordData = {
                ...formData,
                customerId,
                createdAt: new Date()
            }
            
            await addDoc(collection(db, "customerRecords"), recordData)
            // Clear form after successful submission
            setFormData({
                productName: '',
                soldPrice: '',
                quantity: '',
                totalPrice: '',
                date: '',
                paymentMethod: ''
            })
        } catch (error) {
            console.error("Error adding record: ", error)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                    Add Customer Record
                </h1>
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <input 
                            type="text" 
                            name="productName"
                            value={formData.productName}
                            onChange={handleInputChange}
                            placeholder="Product Name"
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-3 bg-gray-50"
                        />
                        <input 
                            type="number" 
                            name="soldPrice"
                            value={formData.soldPrice}
                            onChange={handleInputChange}
                            placeholder="Sold Price"
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-3 bg-gray-50"
                        />
                        <input 
                            type="number" 
                            name="quantity"
                            value={formData.quantity}
                            onChange={handleInputChange}
                            placeholder="Sold Quantity"
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-3 bg-gray-50"
                        />
                        <input 
                            type="number" 
                            name="totalPrice"
                            value={formData.totalPrice}
                            onChange={handleInputChange}
                            placeholder="Total Price"
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-3 bg-gray-50"
                        />
                        <input 
                            type="date" 
                            name="date"
                            value={formData.date}
                            onChange={handleInputChange}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-3 bg-gray-50"
                        />
                        <select 
                            name="paymentMethod"
                            value={formData.paymentMethod}
                            onChange={handleInputChange}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-3 bg-gray-50"
                        >
                            <option value="" disabled>Select Payment Method</option>
                            <option value="cash">Cash</option>
                            <option value="bank">Bank Account</option>
                            <option value="jazzcash">Jazz Cash</option>
                        </select>
                    </div>
                    <div className="flex justify-center mt-8">
                        <button 
                            onClick={handleSubmit}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg shadow-md transition duration-200 ease-in-out transform hover:scale-105 hover:shadow-lg"
                        >
                            Add Record
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AddCustomerRecord