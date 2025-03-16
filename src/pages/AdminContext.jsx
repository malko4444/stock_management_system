import React, { createContext, useState } from 'react';

export const AdminDataContext = createContext();

export default function AdminContextProvider({ children }) {
    const [id, setId] = useState(null);
    const[updatedData,setUpdatedData] = useState('')
    console.log("the user data in the context in the update",updatedData);
    
    
    // console.log("the admin id in the context  ", adminId);
    

    return (
        <AdminDataContext.Provider value={{ id, setId , updatedData, setUpdatedData}}>
            {children}
        </AdminDataContext.Provider>
    );
}
