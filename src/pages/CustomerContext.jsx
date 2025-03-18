import React, { createContext, useState } from 'react'

export const customerDataDataContext = createContext()

export default function CustomerContext({ children }) {
    const [customerData, setCustomerData] = useState('')
    const[customerId, setCustomerId] = useState('')
    const[inventoryItem,setInventoryItem] = useState("")
    
    console.log("the user data in the context ",customerData,customerId);
    
    
    // const user = ' shehzad  '
    return (
        <div>
            <customerDataDataContext.Provider value={{customerData, setCustomerData, customerId, setCustomerId ,inventoryItem,setInventoryItem}}>
                {children}
            </customerDataDataContext.Provider>
        </div>
    )
}
