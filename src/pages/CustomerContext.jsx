import React, { createContext, useState } from 'react'

export const customerDataDataContext = createContext()

export default function CustomerContext({ children }) {
    const [customerData, setCustomerData] = useState('')
    const[customerId, setCustomerId] = useState('')
    console.log("the user data in the context ",customerData,customerId);
    
    
    // const user = ' shehzad  '
    return (
        <div>
            <customerDataDataContext.Provider value={{customerData, setCustomerData, customerId, setCustomerId}}>
                {children}
            </customerDataDataContext.Provider>
        </div>
    )
}
