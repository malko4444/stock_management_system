import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// import { BrowserRouter } from "react-router";
import { App } from './App';
import CustomerContext from './pages/CustomerContext';
import AdminContext from './pages/AdminContext';
import FinancialProvider from './contexts/FinancialContext';

createRoot(document.getElementById('root')).render(
  
  <AdminContext>
    <FinancialProvider>
      <CustomerContext>
        <App />
      </CustomerContext>
    </FinancialProvider>
  </AdminContext>
)
