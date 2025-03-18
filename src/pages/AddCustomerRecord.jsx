import React, { useContext, useState } from 'react'
import Send from '../components/Send'
import Receive from '../components/Receive'
import { customerDataDataContext } from './CustomerContext';
import InventoryProducts from '../components/InventoryProducts';
import { NavBar } from '../components/NavBar';

function AddCustomerRecord() {
    const { customerData, customerId } = useContext(customerDataDataContext);
    const [activeComponent, setActiveComponent] = useState('send'); // Default to 'send'

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8 px-4">
          <NavBar/>
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                        Transaction Type
                    </h2>
                    
                    {/* Styled dropdown */}
                    <div className="relative w-full md:w-64 mx-auto">
                        <select
                            value={activeComponent}
                            onChange={(e) => setActiveComponent(e.target.value)}
                            className="block appearance-none w-full bg-white border border-gray-300 hover:border-gray-400 px-4 py-2 pr-8 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="send">Send Product</option>
                            <option value="receive">Receive Payment</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Component container with animation */}
                <div className="transition-all duration-300 ease-in-out">
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        {activeComponent === 'send' ? (
                            <div className="animate-fade-in">
                                <h3 className="text-xl font-semibold mb-4 text-gray-800">Send Product</h3>
                                <Send />
                            </div>
                        ) : (
                            <div className="animate-fade-in">
                                <h3 className="text-xl font-semibold mb-4 text-gray-800">Receive Payment</h3>
                                <Receive />
                            </div>
                        )}
                    </div>
                </div>

                {/* Customer Info Card */}
                {customerData && customerId && (
                    <div className="mt-6 bg-blue-50 rounded-lg shadow p-4">
                        <h4 className="text-lg font-medium text-blue-900 mb-2">Selected Customer</h4>
                        <p className="text-blue-800">
                            Name: {customerData.find(c => c.id === customerId)?.name}
                        </p>
                    </div>
                )}
            </div>
            <InventoryProducts/>
        </div>
    )
}

export default AddCustomerRecord