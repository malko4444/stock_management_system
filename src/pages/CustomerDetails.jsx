import { collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import React, { useState, useEffect, useContext } from 'react';
import { db } from '../../firebaseConfig';
import { customerDataDataContext } from './CustomerContext';
import { Link } from 'react-router-dom';
import InventoryProducts from '../components/InventoryProducts';
import { NavBar } from '../components/NavBar';

function CustomerDetails() {
    const [customers, setCustomers] = useState([]);
    const [customerRecords, setCustomerRecords] = useState({});
    const [customerBalances, setCustomerBalances] = useState({});
    const [isDeleting, setIsDeleting] = useState(false);
    const { setCustomerData, setCustomerId } = useContext(customerDataDataContext);
    const adminId = localStorage.getItem("adminId");

    const calculateBalance = (records) => {
        return records.reduce((balance, record) => {
            if (record.type === 'send') {
                return balance + record.total_amount;
            } else if (record.type === 'receive') {
                return balance - record.amount;
            }
            return balance;
        }, 0);
    };

    const fetchCustomersAndRecords = async () => {
        try {
            const customerQuery = query(
                collection(db, "customers"),
                where("adminId", "==", adminId)
            );
            const customerSnapshot = await getDocs(customerQuery);
            const customersList = customerSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setCustomers(customersList);
            setCustomerData(customersList);

            for (const customer of customersList) {
                const recordQuery = query(
                    collection(db, "customerRecord"),
                    where("customer_id", "==", customer.id),
                    where("admin_id", "==", adminId)
                );
                const recordSnapshot = await getDocs(recordQuery);
                const records = recordSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                setCustomerRecords(prev => ({
                    ...prev,
                    [customer.id]: records
                }));

                const balance = calculateBalance(records);
                setCustomerBalances(prev => ({
                    ...prev,
                    [customer.id]: balance
                }));
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    useEffect(() => {
        fetchCustomersAndRecords();
    }, []);

    const addRecord = (id) => {
        setCustomerId(id);
    };

    const deleteCustomerAndRecords = async (customerId) => {
        try {
            const isConfirmed = window.confirm(
                "Are you sure you want to delete this customer and all their records? This action cannot be undone."
            );
            
            if (!isConfirmed) return;

            // Delete all customer records
            const recordsQuery = query(
                collection(db, "customerRecord"),
                where("customer_id", "==", customerId),
                where("admin_id", "==", adminId)
            );
            const recordsSnapshot = await getDocs(recordsQuery);
            
            const deletePromises = recordsSnapshot.docs.map(doc => 
                deleteDoc(doc.ref)
            );
            await Promise.all(deletePromises);

            // Delete customer document
            await deleteDoc(doc(db, "customers", customerId));

            // Update local state
            setCustomers(prev => prev.filter(c => c.id !== customerId));
            setCustomerRecords(prev => {
                const newRecords = { ...prev };
                delete newRecords[customerId];
                return newRecords;
            });
            setCustomerBalances(prev => {
                const newBalances = { ...prev };
                delete newBalances[customerId];
                return newBalances;
            });

            alert("Customer and all records deleted successfully!");
        } catch (error) {
            console.error("Error deleting customer and records:", error);
            alert("Error deleting customer. Please try again.");
        }
    };

    const deleteAllRecords = async () => {
        try {
            const isConfirmed = window.confirm(
                "⚠️ WARNING: This will delete ALL customers and their records! This action cannot be undone. Are you sure?"
            );
            
            if (!isConfirmed) return;

            setIsDeleting(true);

            // Get all customers for this admin
            const customerQuery = query(
                collection(db, "customers"),
                where("adminId", "==", adminId)
            );
            const customerSnapshot = await getDocs(customerQuery);

            // Delete each customer and their records
            for (const customerDoc of customerSnapshot.docs) {
                const recordsQuery = query(
                    collection(db, "customerRecord"),
                    where("customer_id", "==", customerDoc.id),
                    where("admin_id", "==", adminId)
                );
                const recordsSnapshot = await getDocs(recordsQuery);
                
                const recordDeletePromises = recordsSnapshot.docs.map(doc => 
                    deleteDoc(doc.ref)
                );
                await Promise.all(recordDeletePromises);

                await deleteDoc(doc(db, "customers", customerDoc.id));
            }

            // Clear local state
            setCustomers([]);
            setCustomerRecords({});
            setCustomerBalances({});
            setCustomerData([]);
            setIsDeleting(false);

            alert("All customers and their records have been deleted successfully!");
        } catch (error) {
            console.error("Error deleting data:", error);
            alert("Error deleting data. Please try again.");
            setIsDeleting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <NavBar/>
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-900">Customers List</h2>
                    {/* <button
                        onClick={deleteAllRecords}
                        disabled={isDeleting}
                        className={`px-4 py-2 rounded text-white ${
                            isDeleting 
                                ? 'bg-gray-400 cursor-not-allowed' 
                                : 'bg-red-600 hover:bg-red-700'
                        } transition-colors`}
                    >
                        {isDeleting ? 'Deleting...' : 'Delete All Records'}
                    </button> */}
                </div>

                {isDeleting && (
                    <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="mt-2 text-gray-600">Deleting all records...</p>
                    </div>
                )}

                <div className="space-y-8">
                    {customers.map(customer => (
                        <div key={customer.id} className="bg-white rounded-lg shadow-lg p-6">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-2xl font-semibold text-gray-800">
                                        {customer.name}
                                    </h3>
                                    <p className="text-gray-600">{customer.phone}</p>
                                    <div className="mt-2">
                                        <span className={`text-lg font-medium ${
                                            customerBalances[customer.id] > 0 
                                                ? 'text-red-600' 
                                                : 'text-green-600'
                                        }`}>
                                            Balance: Rs {customerBalances[customer.id] || 0}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-x-4">
                                    <Link to="/addRecord">
                                        <button
                                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                                            onClick={() => addRecord(customer.id)}
                                        >
                                            Add Record
                                        </button>
                                    </Link>
                                    <button 
                                        onClick={() => deleteCustomerAndRecords(customer.id)}
                                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                                    >
                                        Delete Customer & record
                                    </button>
                                </div>
                            </div>

                            {customerRecords[customer.id]?.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                    Date
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                    Type
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                    Details
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                    Payment Method
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                    Amount
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                    Balance
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {customerRecords[customer.id]
                                                .sort((a, b) => b.created_at?.toDate() - a.created_at?.toDate())
                                                .map((record, index) => {
                                                    const runningBalance = customerRecords[customer.id]
                                                        .slice(0, customerRecords[customer.id].length - index)
                                                        .reduce((bal, rec) => {
                                                            if (rec.type === 'send') {
                                                                return bal + rec.total_amount;
                                                            } else {
                                                                return bal - rec.amount;
                                                            }
                                                        }, 0);

                                                    return (
                                                        <tr key={record.id}>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                {record.created_at?.toDate().toLocaleDateString()}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                                    record.type === 'send' 
                                                                        ? 'bg-red-100 text-red-800' 
                                                                        : 'bg-green-100 text-green-800'
                                                                }`}>
                                                                    {record.type === 'send' ? 'Product Sent' : 'Payment Received'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                {record.type === 'send' 
                                                                    ? `${record.product_name} x ${record.quantity}` 
                                                                    : 'Payment'
                                                                }
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                {record.type === 'receive' && (
                                                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                                        record.payment_method === 'cash' 
                                                                            ? 'bg-yellow-100 text-yellow-800'
                                                                            : record.payment_method === 'jazzcash'
                                                                            ? 'bg-purple-100 text-purple-800'
                                                                            : record.payment_method === 'easypaisa'
                                                                            ? 'bg-blue-100 text-blue-800'
                                                                            : 'bg-gray-100 text-gray-800'
                                                                    }`}>
                                                                        {record.payment_method?.toUpperCase() || 'N/A'}
                                                                    </span>
                                                                )}
                                                                {record.type === 'send' && '-'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                Rs {record.type === 'send' ? record.total_amount : record.amount}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className={runningBalance > 0 ? 'text-red-600' : 'text-green-600'}>
                                                                   Rs {runningBalance}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-4">No records found for this customer</p>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            <div className='hidden'>
            <InventoryProducts className=""/>
            </div>
        </div>
    );
}

export default CustomerDetails;