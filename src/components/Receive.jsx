import React, { useContext, useState, useEffect } from 'react';
import { customerDataDataContext } from '../pages/CustomerContext';
import { db } from '../../firebaseConfig';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { toast } from 'react-toastify';

function Receive() {
  const [receivedAmount, setReceivedAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [totalBalance, setTotalBalance] = useState(0);
  const [errors, setErrors] = useState({});
  const { customerId } = useContext(customerDataDataContext);
  const adminId = localStorage.getItem("adminId");

  useEffect(() => {
    const fetchBalance = async () => {
      if (!customerId) return;
      
      try {
        const recordsQuery = query(
          collection(db, "customerRecord"),
          where("customer_id", "==", customerId),
          where("admin_id", "==", adminId)
        );
        
        const recordsSnapshot = await getDocs(recordsQuery);
        let balance = 0;

        recordsSnapshot.docs.forEach(doc => {
          const record = doc.data();
          if (record.type === 'send') {
            balance += record.total_amount;
          } else if (record.type === 'receive') {
            balance -= record.amount;
          }
        });

        setTotalBalance(balance);
      } catch (error) {
        console.error("Error:", error);
        toast.error('Failed to fetch balance');
      }
    };

    fetchBalance();
  }, [customerId, adminId]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!receivedAmount) {
      newErrors.amount = 'Amount is required';
    } else if (Number(receivedAmount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!paymentMethod) {
      newErrors.paymentMethod = 'Please select a payment method';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleReceivePayment = async () => {
    if (!validateForm()) return;

    try {
      const data = {
        customer_id: customerId,
        admin_id: adminId,
        amount: Number(receivedAmount),
        payment_method: paymentMethod,
        created_at: new Date(),
        type: 'receive',
        previous_balance: totalBalance,
        remaining_balance: totalBalance - Number(receivedAmount)
      };

      await addDoc(collection(db, "customerRecord"), data);
      
      setTotalBalance(prev => prev - Number(receivedAmount));
      setReceivedAmount('');
      setPaymentMethod('');
      setErrors({});
      
      toast.success('Payment recorded successfully!');
    } catch (error) {
      console.error("Error:", error);
      toast.error('Failed to record payment');
    }
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto p-6 bg-white rounded-xl shadow-md">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="text-lg font-medium text-blue-900">Current Balance</h4>
        <p className="text-2xl font-bold text-blue-800 mt-1">₹{totalBalance}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Payment Amount
        </label>
        <input
          type="number"
          value={receivedAmount}
          onChange={(e) => {
            setReceivedAmount(e.target.value);
            if (errors.amount) {
              setErrors(prev => ({ ...prev, amount: '' }));
            }
          }}
          className={`block w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.amount ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter amount"
        />
        {errors.amount && (
          <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Payment Method
        </label>
        <select
          value={paymentMethod}
          onChange={(e) => {
            setPaymentMethod(e.target.value);
            if (errors.paymentMethod) {
              setErrors(prev => ({ ...prev, paymentMethod: '' }));
            }
          }}
          className={`block w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.paymentMethod ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">Select payment method</option>
          <option value="cash">Cash</option>
          <option value="jazzcash">JazzCash</option>
          <option value="easypaisa">EasyPaisa</option>
          <option value="bank">Bank Transfer</option>
        </select>
        {errors.paymentMethod && (
          <p className="mt-1 text-sm text-red-600">{errors.paymentMethod}</p>
        )}
      </div>

      {receivedAmount && paymentMethod && (
        <div className="bg-blue-50 p-4 rounded-lg space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-blue-800">Payment Method:</span>
            <span className="font-medium text-blue-900">{paymentMethod.toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-blue-800">New Balance:</span>
            <span className="font-medium text-blue-900">₹{totalBalance - Number(receivedAmount)}</span>
          </div>
        </div>
      )}

      <button
        onClick={handleReceivePayment}
        disabled={!receivedAmount || !paymentMethod}
        className="w-full px-4 py-3 text-white bg-green-600 rounded-lg hover:bg-green-700 
                 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
                 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Record Payment
      </button>
    </div>
  );
}

export default Receive;