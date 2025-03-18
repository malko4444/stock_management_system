import React, { useContext, useState } from 'react';
import { customerDataDataContext } from '../pages/CustomerContext';
import { db } from '../../firebaseConfig';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { toast } from 'react-toastify';

function Send() {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [errors, setErrors] = useState({});
  const { customerId, inventoryItem } = useContext(customerDataDataContext);
  const adminId = localStorage.getItem("adminId");

  const validateForm = () => {
    const newErrors = {};
    
    if (!selectedProduct) {
      newErrors.product = 'Please select a product';
    }
    
    if (!quantity) {
      newErrors.quantity = 'Quantity is required';
    } else if (quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }

    const selectedProductData = inventoryItem.find(item => item.id === selectedProduct);
    if (selectedProductData && Number(quantity) > selectedProductData.quantity) {
      newErrors.quantity = 'Not enough stock available';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProductSelect = (e) => {
    const selected = inventoryItem.find(item => item.id === e.target.value);
    if (selected) {
      setSelectedProduct(selected.id);
      setPrice(selected.price.toString());
      setErrors(prev => ({ ...prev, product: '' }));
    }
  };

  const sendData = async () => {
    if (!validateForm()) return;

    try {
      const selectedProductData = inventoryItem.find(item => item.id === selectedProduct);
      
      const data = {
        customer_id: customerId,
        admin_id: adminId,
        product_name: selectedProductData.productName,
        quantity: Number(quantity),
        price: Number(price),
        product_id: selectedProduct,
        total_amount: Number(price) * Number(quantity),
        created_at: new Date(),
        type: 'send'
      };

      // Add to customerRecord
      await addDoc(collection(db, "customerRecord"), data);

      // Update inventory
      const newQuantity = selectedProductData.quantity - Number(quantity);
      await updateDoc(doc(db, "inventory", selectedProduct), {
        quantity: newQuantity
      });

      // Reset form
      setSelectedProduct('');
      setQuantity('');
      setPrice('');
      setErrors({});
      
      toast.success('Product sent successfully!');
    } catch (error) {
      console.error("Error:", error);
      toast.error('Failed to send product');
    }
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto p-6 bg-white rounded-xl shadow-md">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Select Product
        </label>
        <div className="relative">
          <select
            value={selectedProduct}
            onChange={handleProductSelect}
            className={`block w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.product ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Choose a product</option>
            {inventoryItem?.map((item) => (
              <option key={item.id} value={item.id} disabled={item.quantity === 0}>
                {item.productName} - Stock: {item.quantity} - ₹{item.price}
              </option>
            ))}
          </select>
          {errors.product && (
            <p className="mt-1 text-sm text-red-600">{errors.product}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Quantity
        </label>
        <input
          type="number"
          value={quantity}
          onChange={(e) => {
            setQuantity(e.target.value);
            if (errors.quantity) {
              setErrors(prev => ({ ...prev, quantity: '' }));
            }
          }}
          className={`block w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.quantity ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter quantity"
        />
        {errors.quantity && (
          <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Price per unit
        </label>
        <input
          type="number"
          value={price}
          readOnly
          className="block w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
          placeholder="Price will be set automatically"
        />
      </div>

      {selectedProduct && quantity && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900">Order Summary</h4>
          <div className="mt-2 space-y-1">
            <p className="text-sm text-blue-800">
              Product: {inventoryItem.find(item => item.id === selectedProduct)?.productName}
            </p>
            <p className="text-sm text-blue-800">
              Total Amount: ₹{Number(price) * Number(quantity || 0)}
            </p>
          </div>
        </div>
      )}

      <button
        onClick={sendData}
        disabled={!selectedProduct || !quantity}
        className="w-full px-4 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 
                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Send Product
      </button>
    </div>
  );
}

export default Send;