import React, { useState, useEffect } from 'react'
import { db } from '../../firebaseConfig';
import { collection, addDoc} from 'firebase/firestore';

function AddTheCustomer() {
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");
    

    

    const addCustomer = async () => {
        try {
            const customerData = {
                name: customerName,
                phone: customerPhone,
                address: customerAddress,
                createdAt: new Date()
            }
            
            const docRef = await addDoc(collection(db, "customers"), customerData);
            console.log("Customer added successfully with ID: ", docRef.id);
            
            // Clear the form
            setCustomerName("");
            setCustomerPhone("");
            setCustomerAddress("");
            
            // Fetch updated customers list
            
            
        } catch (error) {
            console.error("Error adding customer: ", error);
        }
    }
        

    return (
        <div>
            <h1>Add the client</h1>
            <div>
                <input 
                    value={customerName} 
                    onChange={(e) => setCustomerName(e.target.value)} 
                    type="text" 
                    placeholder="Name" 
                />
                <input 
                    type="text" 
                    value={customerPhone} 
                    onChange={(e) => setCustomerPhone(e.target.value)} 
                    placeholder="Contact" 
                />
                <input 
                    type="text" 
                    value={customerAddress} 
                    onChange={(e) => setCustomerAddress(e.target.value)} 
                    placeholder="Address" 
                />

                <button onClick={addCustomer}>Add</button>
            </div>

           
        </div>
    )
}

export default AddTheCustomer