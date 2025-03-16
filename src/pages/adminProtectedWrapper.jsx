import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AdminDataContext } from './AdminContext';

function AdminProtectedWrapper({ children }) {
    const adminId = localStorage.getItem('adminId');
    
    // Check if admin is authenticated
    if (!adminId) {
        // Redirect to login if not authenticated
        return <Navigate to="/login" replace />;
    }
    
    // Render children if authenticated
    return children;
}

export default AdminProtectedWrapper;