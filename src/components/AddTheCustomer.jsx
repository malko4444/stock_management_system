import React, { useState, useEffect, useCallback, useContext } from 'react';
import { customersApi, deletedRecordsApi } from '../services/firebaseApi';
import { LoanContext } from '../contexts/LoanContext';
import { Pencil, Trash2, Plus, X, ChevronRight, FileText } from 'lucide-react';
import AddRecordModal from './AddRecordModal';

const CustomerFormFields = ({ formData, errors, handleInputChange }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
    <div>
      <label className="block text-xs font-bold text-[#108587] mb-1 uppercase tracking-tight">Name *</label>
      <input
        name="name"
        value={formData.name}
        onChange={handleInputChange}
        type="text"
        className={`w-full p-2 text-sm border rounded-lg ${errors.name ? 'border-red-500' : 'border-[#20dbdf]'} focus:outline-none focus:ring-2 focus:ring-[#108587]/20 transition-all outline-none`}
        autoFocus
      />
      {errors.name && <p className="text-red-500 text-[10px] mt-1 font-medium">{errors.name}</p>}
    </div>

    <div>
      <label className="block text-xs font-bold text-[#108587] mb-1 uppercase tracking-tight">Phone *</label>
      <input
        name="phone"
        type="text"
        value={formData.phone}
        onChange={handleInputChange}
        className={`w-full p-2 text-sm border rounded-lg ${errors.phone ? 'border-red-500' : 'border-[#20dbdf]'} focus:outline-none focus:ring-2 focus:ring-[#108587]/20 transition-all outline-none`}
      />
      {errors.phone && <p className="text-red-500 text-[10px] mt-1 font-medium">{errors.phone}</p>}
    </div>

    <div className="md:col-span-2">
      <label className="block text-xs font-bold text-[#108587] mb-1 uppercase tracking-tight">Address *</label>
      <input
        name="address"
        type="text"
        value={formData.address}
        onChange={handleInputChange}
        className={`w-full p-2 text-sm border rounded-lg ${errors.address ? 'border-red-500' : 'border-[#20dbdf]'} focus:outline-none focus:ring-2 focus:ring-[#108587]/20 transition-all outline-none`}
      />
      {errors.address && <p className="text-red-500 text-[10px] mt-1 font-medium">{errors.address}</p>}
    </div>

    <div className="md:col-span-2">
      <label className="block text-xs font-bold text-[#108587] mb-1 uppercase tracking-tight">Email (Optional)</label>
      <input
        name="email"
        type="email"
        value={formData.email}
        onChange={handleInputChange}
        placeholder="customer@example.com"
        className={`w-full p-2 text-sm border rounded-lg ${errors.email ? 'border-red-500' : 'border-[#20dbdf]'} focus:outline-none focus:ring-2 focus:ring-[#108587]/20 transition-all outline-none`}
      />
      {errors.email && <p className="text-red-500 text-[10px] mt-1 font-medium">{errors.email}</p>}
    </div>
  </div>
);

const CustomerModal = ({
  modalType,
  showModal,
  formData,
  errors,
  handleInputChange,
  handleSubmit,
  resetForm
}) => {
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') resetForm();
            if (event.key === 'Enter') {
                event.preventDefault();
                handleSubmit();
            }
        };
        if (showModal) document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [showModal, resetForm, handleSubmit]);

    if (!showModal) return null;

    return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={resetForm} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-[#E8F8F9] p-6 sm:p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#108587]">
                {modalType === "add" ? "Add New Customer" : "Edit Customer"}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-700 p-1"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <CustomerFormFields
              formData={formData}
              errors={errors}
              handleInputChange={handleInputChange}
            />

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={resetForm}
                className="px-5 py-2 text-sm text-gray-500 font-bold rounded-lg hover:bg-gray-100 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-6 py-2 bg-[#108587] text-white text-sm rounded-xl hover:bg-[#0e7274] font-bold transition-all shadow-md shadow-[#108587]/20 cursor-pointer"
              >
                {modalType === "add" ? "Save Customer" : "Update Customer"}
              </button>
            </div>
        </div>
      </div>
    </>
  );
};

const DeleteConfirmationModal = ({
  showDeleteModal,
  customerToDelete,
  setShowDeleteModal,
  handleDeleteConfirm
}) => {
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') setShowDeleteModal(false);
            if (event.key === 'Enter') {
                event.preventDefault(); 
                handleDeleteConfirm();
            }
        };
        if (showDeleteModal) document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [showDeleteModal, setShowDeleteModal, handleDeleteConfirm]);

    if (!showDeleteModal) return null;

    return (
      <div 
        className="fixed inset-0 z-[2000] overflow-y-auto bg-black/40 backdrop-blur-md pointer-events-auto"
        onClick={() => setShowDeleteModal(false)}
      >
        <div className="min-h-full flex items-center justify-center p-4">
          <div 
            className="w-full max-w-sm bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-[#E8F8F9] p-8 text-center animate-scale-up pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-[#DC2626] mx-auto mb-6 shadow-sm border border-red-100/50">
               <Trash2 size={32} strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-bold mb-2 text-[#108587]">
              Delete Customer?
            </h3>
            <p className="text-xs font-semibold text-gray-500 mb-8 leading-relaxed">
              Are you sure you want to delete <span className="text-gray-900 font-bold">{customerToDelete?.name}</span>? 
              This will permanently remove their profile and all linked records.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleDeleteConfirm}
                className="w-full py-3.5 bg-gradient-to-br from-[#DC2626] to-[#ef4444] text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-red-500/10 transition-all cursor-pointer active:scale-95 hover:scale-[1.02]"
              >
                Yes, Delete Customer
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="w-full py-3.5 bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-slate-100 transition-all cursor-pointer active:scale-95 border border-slate-200/50"
              >
                Keep Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    );
};

export default function CustomersList({ searchTerm = '' }) {
    const [formData, setFormData] = useState({ name: "", phone: "", address: "", email: "" });
    const [errors, setErrors] = useState({});
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState("add");
    const [currentCustomerId, setCurrentCustomerId] = useState(null);
    const { customers, fetchCustomers } = useContext(LoanContext);
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState(null);
    const [recordModalCustomer, setRecordModalCustomer] = useState(null); // Customer to add record for
    
    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;
    const adminId = localStorage.getItem("adminId");

    const fetchInitialData = useCallback(() => {
        if (adminId && customers.length === 0) fetchCustomers(adminId);
    }, [adminId, fetchCustomers, customers.length]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    useEffect(() => {
        if (searchTerm) {
            const filtered = customers.filter(c =>
                c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.phone.includes(searchTerm) ||
                (c.address || "").toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredCustomers(filtered);
            setCurrentPage(1);
        } else {
            setFilteredCustomers(customers);
        }
    }, [searchTerm, customers]);

    const resetForm = useCallback(() => {
        setFormData({ name: "", phone: "", address: "", email: "" });
        setErrors({});
        setShowModal(false);
        setCurrentCustomerId(null);
    }, []);

    const validateForm = () => {
        let tempErrors = {};
        if (!formData.name.trim()) tempErrors.name = "Name is required";
        if (!formData.phone.trim()) {
            tempErrors.phone = "Phone number is required";
        }
        if (!formData.address.trim()) tempErrors.address = "Address is required";
        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleSubmit = useCallback(async () => {
        if (!validateForm()) return;

        try {
            const customerData = {
                name: formData.name.trim(),
                phone: formData.phone.trim(),
                address: formData.address.trim(),
                email: formData.email.trim(),
                adminId,
            };

            if (modalType === "add") {
                await customersApi.add({ ...customerData, balance: 0, createdAt: new Date() });
            } else {
                await customersApi.update(currentCustomerId, customerData);
            }
            resetForm();
        } catch (error) {
            console.error("Error saving customer: ", error);
        }
    }, [formData, modalType, currentCustomerId, adminId, resetForm]);

    const handleEdit = (e, customer) => {
        e.stopPropagation(); // prevent row click navigation
        setFormData({
            name: customer.name,
            phone: customer.phone,
            address: customer.address || "",
            email: customer.email || ""
        });
        setCurrentCustomerId(customer.id);
        setModalType("edit");
        setShowModal(true);
    };

    const handleDeleteClick = (e, customer) => {
        e.stopPropagation();
        setCustomerToDelete(customer);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = useCallback(async () => {
        if (!customerToDelete) return;
        try {
            await deletedRecordsApi.add({
                type: 'customer',
                admin_id: adminId,
                name: customerToDelete.name,
                phone: customerToDelete.phone,
            });
            await customersApi.delete(customerToDelete.id);
            // The realtime listener handles UI refresh
        } catch (error) {
            console.error("Error deleting customer: ", error);
        }
        setShowDeleteModal(false);
    }, [customerToDelete, adminId]);

    const viewCustomerDetails = (customerId) => {
        const event = new CustomEvent('navigateTo', { detail: { component: 'customer-details', customerId } });
        window.dispatchEvent(event);
    };

    const openAddRecord = (e, customer) => {
      e.stopPropagation();
      setRecordModalCustomer(customer);
    };

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentCustomers = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-2">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
                  <p className="text-secondary text-sm mt-1">Manage your customers and their dues.</p>
                </div>
                <button
                    onClick={() => { setModalType("add"); setShowModal(true); }}
                    className="flex items-center gap-2 bg-gradient-to-br from-[#108587] to-[#14a3a6]  text-white px-4 py-2 rounded-lg hover:bg-[#0e7274] transition-colors shadow-sm cursor-pointer"
                >
                    <Plus size={18} />
                    Add Customer
                </button>
            </div>

            {/* Customers Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1 flex flex-col">
                {filteredCustomers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 h-64">
                        <div className="w-16 h-16 bg-[#E8F8F9] rounded-full flex items-center justify-center mb-4">
                            <FileText className="text-[#108587]" size={24} />
                        </div>
                        <p className="text-gray-500 font-medium mb-4">No customers found.</p>
                        {customers.length === 0 && (
                          <button
                              onClick={() => { setModalType("add"); setShowModal(true); }}
                              className="text-[#108587] hover:underline font-medium"
                          >
                              Add your first customer
                          </button>
                        )}
                    </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="py-4 px-6 font-semibold text-gray-700 text-sm">Name</th>
                                    <th className="py-4 px-6 font-semibold text-gray-700 text-sm">Phone / Contact</th>
                                    <th className="py-4 px-6 font-semibold text-gray-700 text-sm">Current Dues</th>
                                    <th className="py-4 px-6 font-semibold text-gray-700 text-sm text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentCustomers.map((customer) => {
                                  const balance = Number(customer.balance || 0);
                                  return (
                                    <tr
                                        key={customer.id}
                                        onClick={() => viewCustomerDetails(customer.id)}
                                        className="border-b border-gray-100 hover:bg-[#F9FCFC] cursor-pointer transition-colors group"
                                    >
                                        <td className="py-4 px-6">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#108587] to-[#17BCBE] flex items-center justify-center text-white font-bold mr-4 text-sm shadow-sm">
                                                    {customer.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                  <span className="font-semibold text-gray-900 block">{customer.name}</span>
                                                  <span className="text-xs text-gray-500 block truncate max-w-[150px]">{customer.address || "No address"}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-gray-600 font-medium">
                                            {customer.phone}
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium ${
                                                balance > 0
                                                    ? 'bg-red-50 text-red-700 border border-red-100'
                                                    : balance < 0
                                                        ? 'bg-green-50 text-green-700 border border-green-100'
                                                        : 'bg-gray-50 text-gray-600 border border-gray-200'
                                            }`}>
                                                Rs {balance.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex gap-2 items-center justify-end">
                                                <button
                                                  onClick={(e) => openAddRecord(e, customer)}
                                                  className="bg-[#108587] text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-[#0e7274] transition-all shadow-sm cursor-pointer"
                                                >
                                                  Add Record
                                                </button>
                                                <button
                                                    onClick={(e) => handleEdit(e, customer)}
                                                    className="p-1.5 rounded-lg text-gray-400 hover:text-[#108587] hover:bg-[#E8F8F9] transition-colors"
                                                    title="Edit profile"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteClick(e, customer)}
                                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                                <ChevronRight className="text-gray-300 group-hover:text-[#108587] transition-colors ml-2" size={20} />
                                            </div>
                                        </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                        </table>
                    </div>
                  </>
                )}
            </div>

            {/* Pagination Controls */}
            {filteredCustomers.length > itemsPerPage && (
                <div className="flex justify-between items-center py-2 text-sm text-gray-500">
                    <span>Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredCustomers.length)} of {filteredCustomers.length}</span>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:bg-gray-100 cursor-pointer"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:bg-gray-100 cursor-pointer"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            <CustomerModal
                modalType={modalType}
                showModal={showModal}
                formData={formData}
                errors={errors}
                handleInputChange={handleInputChange}
                handleSubmit={handleSubmit}
                resetForm={resetForm}
            />

            <DeleteConfirmationModal
                showDeleteModal={showDeleteModal}
                customerToDelete={customerToDelete}
                setShowDeleteModal={setShowDeleteModal}
                handleDeleteConfirm={handleDeleteConfirm}
            />

            {/* Add Record Modal Popup */}
            {recordModalCustomer && (
              <AddRecordModal
                isOpen={!!recordModalCustomer}
                onClose={() => setRecordModalCustomer(null)}
                customerId={recordModalCustomer.id}
                customerName={recordModalCustomer.name}
              />
            )}
        </div>
    );
}