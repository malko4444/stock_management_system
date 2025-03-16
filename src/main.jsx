import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// import { BrowserRouter } from "react-router";
import { App } from './App';
import CustomerContext from './pages/CustomerContext';
import AdminContext from './pages/AdminContext';
// import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  
  <AdminContext>
    <CustomerContext>
    <App />
  </CustomerContext>

  </AdminContext>
)
