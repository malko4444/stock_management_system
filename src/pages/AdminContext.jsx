import React, { createContext, useState } from 'react';

export const AdminDataContext = createContext();

export default function AdminContextProvider({ children }) {
    const [id, setId] = useState(null);
    const [updatedData, setUpdatedData] = useState(null);

    return (
        <AdminDataContext.Provider value={{ id, setId , updatedData, setUpdatedData}}>
            {children}
        </AdminDataContext.Provider>
    );
}
