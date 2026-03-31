import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { LoanContext } from '../contexts/LoanContext';

function AdminProtectedWrapper({ children }) {
    const { user, authLoading } = useContext(LoanContext);
    
    // While checking auth status, show a loader or nothing to avoid blink
    if (authLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#108587]"></div>
            </div>
        );
    }
    
    // Check if admin is authenticated
    if (!user) {
        // Redirect to login if not authenticated
        return <Navigate to="/login" replace />;
    }
    
    // Render children if authenticated
    return children;
}

export default AdminProtectedWrapper;