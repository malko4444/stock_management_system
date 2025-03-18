import React, { useState } from 'react';
import { db } from '../../firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function AddTheCustomer() {
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");
    const [errors, setErrors] = useState({});
    
    const adminId = localStorage.getItem("adminId");

    const validateForm = () => {
        let tempErrors = {};
        if (!customerName.trim()) tempErrors.name = "Name is required";
        if (!customerPhone.trim()) {
            tempErrors.phone = "Phone number is required";
        } else if (!/^\d{11}$/.test(customerPhone)) {
            tempErrors.phone = "Please enter a valid 10-digit phone number";
        }
        if (!customerAddress.trim()) tempErrors.address = "Address is required";
        
        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    const addCustomer = async () => {
        if (!validateForm()) {
            toast.error("Please fill all required fields correctly");
            return;
        }

        try {
            const customerData = {
                name: customerName.trim(),
                phone: customerPhone.trim(),
                address: customerAddress.trim(),
                createdAt: new Date(),
                adminId: adminId
            };
            
            const docRef = await addDoc(collection(db, "customers"), customerData);
            toast.success("Customer added successfully!");
            
            // Clear the form
            setCustomerName("");
            setCustomerPhone("");
            setCustomerAddress("");
            setErrors({});
            
        } catch (error) {
            console.error("Error adding customer: ", error);
            toast.error("Failed to add customer");
        }
    };

    return (
        <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg mt-10">
            <h1 className="text-2xl font-bold text-center mb-6">Add New Client</h1>
            <div className="space-y-4">
                <div>
                    <input 
                        value={customerName} 
                        onChange={(e) => setCustomerName(e.target.value)} 
                        type="text" 
                        placeholder="Name" 
                        className={`w-full p-2 border rounded-md ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>

                <div>
                    <input 
                        type="text" 
                        value={customerPhone} 
                        onChange={(e) => setCustomerPhone(e.target.value)} 
                        placeholder="Contact" 
                        className={`w-full p-2 border rounded-md ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                </div>

                <div>
                    <input 
                        type="text" 
                        value={customerAddress} 
                        onChange={(e) => setCustomerAddress(e.target.value)} 
                        placeholder="Address" 
                        className={`w-full p-2 border rounded-md ${errors.address ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
                </div>

                <button 
                    onClick={addCustomer}
                    className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
                >
                    Add Customer
                </button>
            </div>
        </div>
    );
}

export default AddTheCustomer;