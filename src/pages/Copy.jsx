import { collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import React, { useState, useEffect, useContext } from 'react';
import { db } from '../../firebaseConfig';
import { customerDataDataContext } from './CustomerContext';
import { Link } from 'react-router-dom';
import { NavBar } from '../components/NavBar';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { format, subMonths, startOfYear, parseISO } from 'date-fns';

function CustomerDetails() {
    const [customers, setCustomers] = useState([]);
    const [customerRecords, setCustomerRecords] = useState({});
    const [customerBalances, setCustomerBalances] = useState({});
    const [isDeleting, setIsDeleting] = useState(false);
    const [filterPeriod, setFilterPeriod] = useState('all');
    const { setCustomerData, setCustomerId } = useContext(customerDataDataContext);
    const adminId = localStorage.getItem("adminId");

    // Calculate current balance (including payments)
    const calculateCurrentBalance = (records) => {
        return records.reduce((balance, record) => {
            if (record.type === 'send') {
                return balance + record.total_amount;
            } else if (record.type === 'receive') {
                return balance - record.amount;
            }
            return balance;
        }, 0);
    };

    // Calculate running balance (shows both sent and received)
    const calculateRunningBalance = (records, currentIndex) => {
        return records
            .slice(0, currentIndex + 1)
            .reduce((balance, record) => {
                if (record.type === 'send') {
                    return balance + record.total_amount;
                } else if (record.type === 'receive') {
                    return balance - record.amount;
                }
                return balance;
            }, 0);
    };

    // Filter records by date
    const filterRecords = (records, period) => {
        const now = new Date();
        return records.filter(record => {
            const recordDate = record.created_at.toDate();
            switch(period) {
                case 'month':
                    return format(recordDate, 'MM-yyyy') === format(now, 'MM-yyyy');
                case 'sixMonths':
                    return recordDate >= subMonths(now, 6);
                case 'year':
                    return recordDate >= startOfYear(now);
                default:
                    return true;
            }
        });
    };

    // Generate PDF report
    const generatePDF = async (customer, records) => {
        try {
            const { jsPDF } = await import('jspdf');
            const { autoTable } = await import('jspdf-autotable');
            
            const doc = new jsPDF();
            const filteredRecords = filterRecords(records, filterPeriod);

            // Add header
            doc.setFontSize(18);
            doc.text(`Customer Report - ${customer.name}`, 14, 15);
            doc.setFontSize(12);
            doc.text(`Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 25);
            doc.text(`Phone: ${customer.phone}`, 14, 35);
            doc.text(`Balance: Rs ${customerBalances[customer.id] || 0}`, 14, 45);

            const tableData = filteredRecords.map((record, index) => [
                format(record.created_at.toDate(), 'dd/MM/yyyy'),
                record.type === 'send' ? 'Product Sent' : 'Payment Received',
                record.type === 'send' ? `${record.product_name} x ${record.quantity}` : 'Payment',
                record.type === 'receive' ? record.payment_method?.toUpperCase() : '-',
                `Rs ${record.type === 'send' ? record.total_amount : record.amount}`,
                `Rs ${calculateRunningBalance(filteredRecords, index)}`
            ]);

            autoTable(doc, {
                head: [['Date', 'Type', 'Details', 'Payment Method', 'Amount', 'Balance']],
                body: tableData,
                startY: 55
            });

            doc.save(`${customer.name}_report_${format(new Date(), 'dd-MM-yyyy')}.pdf`);
            toast.success('Report downloaded successfully!');
        } catch (error) {
            console.error('Error generating PDF:', error);
            toast.error('Failed to generate report');
        }
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

                const currentBalance = calculateCurrentBalance(records);
                setCustomerBalances(prev => ({
                    ...prev,
                    [customer.id]: currentBalance
                }));
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to fetch customer data");
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

            await deleteDoc(doc(db, "customers", customerId));

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

            toast.success("Customer and all records deleted successfully!");
        } catch (error) {
            console.error("Error deleting customer and records:", error);
            toast.error("Error deleting customer. Please try again.");
        }
    };

    const deleteAllRecords = async () => {
        try {
            const isConfirmed = window.confirm(
                "⚠️ WARNING: This will delete ALL customers and their records! This action cannot be undone. Are you sure?"
            );

            if (!isConfirmed) return;

            setIsDeleting(true);

            const customerQuery = query(
                collection(db, "customers"),
                where("adminId", "==", adminId)
            );
            const customerSnapshot = await getDocs(customerQuery);

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

            setCustomers([]);
            setCustomerRecords({});
            setCustomerBalances({});
            setCustomerData([]);
            setIsDeleting(false);

            toast.success("All customers and their records have been deleted successfully!");
        } catch (error) {
            console.error("Error deleting data:", error);
            toast.error("Error deleting data. Please try again.");
            setIsDeleting(false);
        }
    };

    // ... keep your existing fetchCustomersAndRecords, useEffect, addRecord, deleteCustomerAndRecords, and deleteAllRecords functions ...

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <NavBar />
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-900">Customers List</h2>
                    <button
                        onClick={deleteAllRecords}
                        disabled={isDeleting}
                        className={`px-4 py-2 rounded text-white ${
                            isDeleting 
                                ? 'bg-gray-400 cursor-not-allowed' 
                                : 'bg-red-600 hover:bg-red-700'
                        } transition-colors`}
                    >
                        {isDeleting ? 'Deleting...' : 'Delete All Records'}
                    </button>
                </div>

                {/* ... keep your existing isDeleting indicator ... */}

                <div className="space-y-8">
                    {customers.map(customer => (
                        <div key={customer.id} className="bg-white rounded-lg shadow-lg p-6">
                            <div className="flex justify-between items-center mb-6">
                                {/* ... keep your existing customer header ... */}
                                <div className="flex items-center space-x-4">
                                    <select 
                                        value={filterPeriod}
                                        onChange={(e) => setFilterPeriod(e.target.value)}
                                        className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="all">All Records</option>
                                        <option value="month">This Month</option>
                                        <option value="sixMonths">Last 6 Months</option>
                                        <option value="year">This Year</option>
                                    </select>
                                    
                                    <button
                                        onClick={() => generatePDF(customer, customerRecords[customer.id])}
                                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                                    >
                                        Download Report
                                    </button>

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
                                        Delete Customer & Records
                                    </button>
                                </div>
                            </div>

                            {customerRecords[customer.id]?.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        {/* ... keep your existing table headers ... */}
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {filterRecords(customerRecords[customer.id], filterPeriod)
                                                .sort((a, b) => b.created_at?.toDate() - a.created_at?.toDate())
                                                .map((record, index, array) => {
                                                    const runningBalance = calculateRunningBalance(array.slice().reverse(), array.length - 1 - index);
                                                    
                                                    return (
                                                        <tr key={record.id}>
                                                            {/* ... keep your existing row cells ... */}
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className={`${runningBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
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
        </div>
    );
}

export default CustomerDetails;