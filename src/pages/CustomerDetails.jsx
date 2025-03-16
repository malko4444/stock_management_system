import { collection, getDocs } from 'firebase/firestore';
import React, { useState, useEffect, useContext } from 'react';
import { db } from '../../firebaseConfig';
import { customerDataDataContext } from './CustomerContext';

function CustomerDetails() {
    const [customers, setCustomers] = useState([]);
const{customerData, setCustomerData,customerId, setCustomerId} = useContext(customerDataDataContext);
    const fetchCustomers = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "customers"));
            const customersList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setCustomers(customersList);
            console.log("the customers ", customersList);
            setCustomerData(customersList)

            
        } catch (error) {
            console.error("Error fetching customers: ", error);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);
    const addRecord = (id) => {
        console.log("the id is ", id);
        setCustomerId(id);
    }


    return (
        <div>
            <div>
                <h2>Customers List</h2>
                <ul>
                    {customers.map(customer => (
                        <li key={customer.id}>
                            <strong>{customer.name}</strong> - 
                            {/* Phone: {customer.phone}, 
                            Address: {customer.address} */}
                            <button 
                                className='py-2 px-3 bg-red-400 rounded text-2xl mb-3' 
                                onClick={() => addRecord(customer.id)}
                            > 
                                add a record
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}

export default CustomerDetails