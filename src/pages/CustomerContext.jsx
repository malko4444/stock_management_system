import React, { createContext, useState } from 'react'

export const customerDataDataContext = createContext()

export default function CustomerContext({ children }) {
    const [customerData, setCustomerData] = useState([]);
    const [customerId, setCustomerId] = useState("");
    const [inventoryItem, setInventoryItem] = useState([]);

    return (
        <customerDataDataContext.Provider
            value={{ customerData, setCustomerData, customerId, setCustomerId, inventoryItem, setInventoryItem }}
        >
            {children}
        </customerDataDataContext.Provider>
    );
}
