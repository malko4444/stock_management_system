import React, { useState, useEffect, useCallback, useContext } from 'react';
import { customersApi, deletedRecordsApi, accountReceivableApi } from '../services/firebaseApi';
import { FinancialContext } from '../contexts/FinancialContext';
import { Pencil, Trash2, Plus, X } from 'lucide-react';

const CustomerFormFields = ({ formData, errors, handleInputChange }) => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium text-[#108587] mb-1">Name *</label>
      <input
        name="name"
        value={formData.name}
        onChange={handleInputChange}
        type="text"
        className={`w-full p-2 border rounded-md ${errors.name ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-1 focus:ring-[#108587]`}
        autoFocus
      />
      {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
    </div>

    <div>
      <label className="block text-sm font-medium text-[#108587] mb-1">Phone *</label>
      <input
        name="phone"
        type="text"
        value={formData.phone}
        onChange={handleInputChange}
        className={`w-full p-2 border rounded-md ${errors.phone ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-1 focus:ring-[#108587]`}
      />
      {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
    </div>

    <div>
      <label className="block text-[#108587] text-sm font-medium mb-1">Address *</label>
      <input
        name="address"
        type="text"
        value={formData.address}
        onChange={handleInputChange}
        className={`w-full p-2 border rounded-md ${errors.address ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-1 focus:ring-[#108587]`}
      />
      {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
    </div>

    <div>
      <label className="block text-sm font-medium text-[#108587] mb-1">Current Balance *</label>
      <input
        name="balance"
        type="text"
        value={formData.balance}
        onChange={handleInputChange}
        className={`w-full p-2 border rounded-md ${errors.balance ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-1 focus:ring-[#108587]`}
      />
      {errors.balance && <p className="text-red-500 text-sm mt-1">{errors.balance}</p>}
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
    // Add a useEffect for handling escape key to close the modal
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                resetForm();
            }
        };

        if (showModal) {
            document.addEventListener('keydown', handleKeyDown);
        } else {
            document.removeEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [showModal, resetForm]);

    // Add a useEffect for handling Enter key to submit the form
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); // Prevent default form submission behavior
                handleSubmit();
            }
        };

        if (showModal) {
            document.addEventListener('keydown', handleKeyDown);
        } else {
            document.removeEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [showModal, handleSubmit]); 

    return (
  showModal && (
    <>
      <div
        className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-xs z-40"
        onClick={resetForm}
      ></div>
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div
          className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
          onClick={(e) => e.stopPropagation()}
          tabIndex={0}
        >
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-[#108587]">
                {modalType === "add" ? "Add New Customer" : "Edit Customer"}
              </h2>
              <button
                onClick={resetForm}
                className="text-[#108587] hover:text-gray-700 focus:outline-none cursor-pointer"
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

            <div className="flex justify-end space-x-3 mt-8">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-[#DC2626] rounded-md bg-[#FFE7E7] hover:bg-[#fddada] transition-colors focus:outline-none focus:ring-1 focus:ring-[#DC2626] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-[#C9FEFF] text-[#108587] rounded-md hover:bg-[#bdfbfd] transition-colors focus:outline-none focus:ring-1 focus:ring-[#108587] cursor-pointer"
              >
                {modalType === "add" ? "Add Customer" : "Update Customer"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
)};

const DeleteConfirmationModal = ({
  showDeleteModal,
  customerToDelete,
  setShowDeleteModal,
  handleDeleteConfirm
}) => {
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setShowDeleteModal(false);
            }
        };

        if (showDeleteModal) {
            document.addEventListener('keydown', handleKeyDown);
        } else {
            document.removeEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [showDeleteModal, setShowDeleteModal]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); 
                handleDeleteConfirm();
            }
        };

        if (showDeleteModal) {
            document.addEventListener('keydown', handleKeyDown);
        } else {
            document.removeEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [showDeleteModal, handleDeleteConfirm]);

    return (
  showDeleteModal && (
    <>
      <div
        className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm z-40"
        onClick={() => setShowDeleteModal(false)}
      ></div>
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div
          className="bg-white rounded-lg shadow-xl w-[340px] max-w-md mx-4 p-5"
          onClick={(e) => e.stopPropagation()}
          tabIndex={0}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-[#108587]">Confirm Deletion</h2>
            <button
              onClick={() => setShowDeleteModal(false)}
              className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400 rounded cursor-pointer"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete customer "{customerToDelete?.name}"? This action cannot be undone.
          </p>
          <div className="flex justify-center space-x-3">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 bg-[#C9FEFF] text-[#108587] rounded-md cursor-pointer hover:bg-[#bdfbfd] transition-colors focus:outline-none focus:ring-1 focus:ring-[#108587]"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="px-4 py-2 text-[#DC2626] rounded-md bg-[#FFE7E7] cursor-pointer hover:bg-[#fddada] transition-colors focus:outline-none focus:ring-1 focus:ring-[#DC2626]"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </>
  )
)};

const AddCustomerButton = ({ onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 bg-[#108587] text-white px-4 py-2 rounded-md hover:bg-[#0e7274] transition-colors cursor-pointer"
  >
    <Plus size={18} />
    Add Customer
  </button>
);

function AddTheCustomer({ searchTerm = '' }) {
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        address: "",
        balance: ""
    });
    const [errors, setErrors] = useState({});
    const [toast, setToast] = useState({ show: false, message: "" });
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState("add");
    const [currentCustomerId, setCurrentCustomerId] = useState(null);
    const [customers, setCustomers] = useState([]);
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState(null);
    const adminId = localStorage.getItem("adminId");
    const FinancialCtx = useContext(FinancialContext);

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(5);

    const showToast = (message) => {
        setToast({ show: true, message });
        setTimeout(() => {
            setToast({ show: false, message: "" });
        }, 3000);
    };

    const fetchCustomers = useCallback(async () => {
        try {
            const customersList = await customersApi.getByAdmin(adminId);
            setCustomers(customersList);
        } catch (error) {
            console.error("Error fetching customers: ", error);
        } finally {
            setLoading(false);
        }
    }, [adminId]);

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]);

    useEffect(() => {
        if (searchTerm) {
            const filtered = customers.filter(customer =>
                customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                customer.phone.includes(searchTerm) ||
                customer.address.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredCustomers(filtered);
            setCurrentPage(1);
        } else {
            setFilteredCustomers(customers);
        }
    }, [searchTerm, customers]);

    // Wrap functions used in useEffect dependencies with useCallback
    const resetForm = useCallback(() => {
        setFormData({
            name: "",
            phone: "",
            address: "",
            balance: ""
        });
        setErrors({});
        setShowModal(false);
        setCurrentCustomerId(null);
    }, []);

    const validateForm = () => {
        let tempErrors = {};
        if (!formData.name.trim()) tempErrors.name = "Name is required";
        if (!formData.phone.trim()) {
            tempErrors.phone = "Phone number is required";
        } else if (!/^\d{10,11}$/.test(formData.phone)) {
            tempErrors.phone = "Please enter a valid phone number (10-11 digits)";
        }
        if (!formData.address.trim()) tempErrors.address = "Address is required";
        if (!formData.balance.trim()) tempErrors.balance = "Balance is required";

        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    }, []);

    const handleSubmit = useCallback(async () => {
        if (!validateForm()) return;

        try {
            const customerData = {
                name: formData.name.trim(),
                phone: formData.phone.trim(),
                address: formData.address.trim(),
                balance: formData.balance.trim(),
                adminId,
            };

            if (modalType === "add") {
                await customersApi.add({ ...customerData, createdAt: new Date() });
                showToast("Customer added successfully");
            } else {
                await customersApi.update(currentCustomerId, customerData);
                // sync name across receivables
                try {
                    await FinancialCtx.syncCustomerName({ admin_id: adminId, customer_id: currentCustomerId, customer_name: customerData.name });
                } catch (e) {}
                showToast("Customer updated successfully");
            }
            resetForm();
            fetchCustomers();
        } catch (error) {
            console.error("Error saving customer: ", error);
        }
    }, [formData, modalType, currentCustomerId, adminId, resetForm, fetchCustomers]);

    const handleEdit = (customer) => {
        setFormData({
            name: customer.name,
            phone: customer.phone,
            address: customer.address,
            balance: customer.balance
        });
        setCurrentCustomerId(customer.id);
        setModalType("edit");
        setShowModal(true);
    };

    const handleDeleteClick = (customer) => {
        setCustomerToDelete(customer);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = useCallback(async () => {
        if (!customerToDelete) return;
        try {
            // Prevent deletion if there are pending receivables
            const recs = await accountReceivableApi.getByCustomerAndAdmin(adminId, customerToDelete.id);
            const pendingSum = (recs || []).filter(r => r.status === 'pending').reduce((s, r) => s + (Number(r.amount) || 0), 0);
            if (pendingSum > 0) {
                showToast("Cannot delete customer with outstanding receivables. Please clear receivables first.");
                setShowDeleteModal(false);
                return;
            }

            await deletedRecordsApi.add({
                type: 'customer',
                admin_id: adminId,
                name: customerToDelete.name,
                phone: customerToDelete.phone,
            });
            await customersApi.delete(customerToDelete.id);
            fetchCustomers();
            showToast("Customer deleted successfully");
        } catch (error) {
            console.error("Error deleting customer: ", error);
            showToast("Error deleting customer");
        }
        setShowDeleteModal(false);
    }, [customerToDelete, adminId, fetchCustomers]);

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentCustomers = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const nextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(prev => prev + 1);
        }
    };

    const prevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(prev => prev - 1);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (customers.length === 0) {
        return (
            <div className="min-h-[960px] w-full pb-102 bg-[#fcfcfc] flex flex-col items-center justify-center">
                <h1 className="text-2xl font-semibold text-[#108587] mb-4">No Customers Found</h1>
                <AddCustomerButton onClick={() => {
                    setModalType("add");
                    setShowModal(true);
                }} />
                <CustomerModal
                    modalType={modalType}
                    showModal={showModal}
                    formData={formData}
                    errors={errors}
                    handleInputChange={handleInputChange}
                    handleSubmit={handleSubmit}
                    resetForm={resetForm}
                />
            </div>
        );
    }

    return (
        <div className="min-h-[960px] w-full pb-8 bg-[#fcfcfc] flex flex-col">
            {/* Customer Section Header */}
            <div className="px-6 flex items-center justify-between h-[87px]">
                <h1 className="text-2xl font-semibold text-[#108587]">Customers</h1>
                <AddCustomerButton onClick={() => {
                    setModalType("add");
                    setShowModal(true);
                }} />
            </div>

            {/* Customers Table */}
            <div className="min-w-[1005px] overflow-hidden mx-auto mt-4 bg-white rounded-lg shadow-md">
                {filteredCustomers.length === 0 && customers.length > 0 ? (
                    <div className="w-full py-12 flex flex-col items-center justify-center space-y-5">
                        <p className="text-gray-500 text-lg">No customers found matching your search</p>
                        <AddCustomerButton onClick={() => {
                            setModalType("add");
                            setShowModal(true);
                        }} />
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[#24dfe6] bg-[#E8F8F9]">
                                <th className="text-left pl-11 py-3 font-medium text-[#108587]">Name</th>
                                <th className="text-left pl-6 py-3 font-medium text-[#108587]">Phone #</th>
                                <th className="text-left pl-6 py-3 font-medium text-[#108587]">Address</th>
                                <th className="text-left pl-6 py-3 font-medium text-[#108587]">Current Balance</th>
                                <th className="text-left pl-8 py-3 font-medium text-[#108587]">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentCustomers.map((customer) => (
                                <tr
                                    key={customer.id}
                                    className="border-b border-gray-200 hover:bg-gradient-to-t from-[#cbcccc3d] to-[#fdfeff] transition-colors duration-150"
                                    style={{ height: '45px' }}
                                >
                                    <td className="py-2 pl-10 pr-6 text-gray-900 font-medium">
                                        <div className="flex items-center">
                                            <div className="h-8 w-8 rounded-full bg-[#108587] flex items-center justify-center text-white font-semibold mr-3">
                                                {customer.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span>{customer.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-6 text-gray-600">
                                        <a href={`tel:${customer.phone}`} className="hover:text-[#108587] hover:underline">
                                            {customer.phone}
                                        </a>
                                    </td>
                                    <td className="py-3 px-6 text-gray-600 max-w-xs truncate">
                                        {customer.address}
                                    </td>
                                    <td className="py-3 px-6 font-medium">
                                        <span className={`px-2 py-1 rounded-full text-xs ${
                                            customer.balance > 0
                                                ? 'bg-green-100 text-green-800'
                                                : customer.balance < 0
                                                    ? 'bg-red-100 text-red-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {customer.balance || '0.00'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-6">
                                        <div className="flex gap-3 items-center">
                                            <button
                                                onClick={() => handleEdit(customer)}
                                                className="p-2 rounded-full hover:bg-[#c9f7fccb] text-[#108587] hover:text-[#0e7274] transition-colors cursor-pointer"
                                                aria-label="Edit customer"
                                            >
                                                <Pencil size={18} strokeWidth={1.5} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(customer)}
                                                className="p-2 rounded-full hover:bg-[#ffd1d1c2] text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                                                aria-label="Delete customer"
                                            >
                                                <Trash2 size={18} strokeWidth={1.5} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination Controls */}
            {filteredCustomers.length > itemsPerPage && (
                <div className="flex justify-center items-center mt-4 space-x-2">
                    <button
                        onClick={prevPage}
                        disabled={currentPage === 1}
                        className="px-4 py-2 bg-[#C9FEFF] text-[#108587] rounded-md hover:bg-[#bdfbfd] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        Previous
                    </button>
                    <span className="text-gray-700">Page {currentPage} of {totalPages}</span>
                    <button
                        onClick={nextPage}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 bg-[#C9FEFF] text-[#108587] rounded-md hover:bg-[#bdfbfd] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        Next
                    </button>
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

            {/* Toast Notification */}
            {toast.show && (
                <div className="fixed z-50 bottom-4 right-4 bg-[#108587] text-white px-4 py-2 rounded-md shadow-lg animate-fade-in">
                    {toast.message}
                </div>
            )}
        </div>
    );
}

export default AddTheCustomer;