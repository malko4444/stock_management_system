import React, { createContext, useCallback, useState, useEffect, useRef } from 'react';
import { customersApi, customerRecordsApi, auditApi } from '../services/firebaseApi';
import { toast } from 'react-toastify';

export const LoanContext = createContext();

/**
 * Simplified Loan System for Warehouse Owner
 * - Each customer has a dues/balance (amount they owe)
 * - Purchase order: increases customer dues
 * - Payment received: decreases customer dues
 * - All tracked in customerRecord with type: 'purchase' or 'payment'
 */
export default function LoanProvider({ children }) {
  const [customers, setCustomers] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  // Use refs to store unsubscribe functions to decouple them from the state/re-renders
  const unsubCustomersRef = useRef(null);
  const unsubRecordsRef = useRef(null);
  const isInitialFetchDone = useRef(false);

  // Fetch all data for current admin in REALTIME
  const fetchCustomers = useCallback(async (adminId) => {
    if (!adminId) return [];
    
    // Only show loading if it's the very first time
    if (!isInitialFetchDone.current) {
        setLoading(true);
    }
    
    // Clean up old listeners using refs
    if (unsubCustomersRef.current) unsubCustomersRef.current();
    if (unsubRecordsRef.current) unsubRecordsRef.current();

    try {
      // 1. Customers Listener
      const uCust = customersApi.listenByAdmin(adminId, (data) => {
        setCustomers(data);
        setLoading(false);
        isInitialFetchDone.current = true;
      });
      unsubCustomersRef.current = uCust;
      
      // 2. Records Listener (Global)
      const uRecs = customerRecordsApi.listenByAdmin(adminId, (data) => {
        setRecords(data);
      });
      unsubRecordsRef.current = uRecs;
      
      return await customersApi.getByAdmin(adminId);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
      return [];
    }
  }, []); // Re-renders no longer occur when listeners are set up

  // Clean up listeners on unmount
  useEffect(() => {
    // Auto-init if adminId is in localStorage
    const adminId = localStorage.getItem("adminId");
    if (adminId) {
        fetchCustomers(adminId);
    }

    return () => {
      if (unsubCustomersRef.current) unsubCustomersRef.current();
      if (unsubRecordsRef.current) unsubRecordsRef.current();
    };
  }, [fetchCustomers]);

  /**
   * Unified transaction submission handler
   * Handles both "Product Send" (ADDS to balance) and "Payment Receive" (SUBTRACTS from balance)
   * Ensures data integrity by updating both transaction record AND customer balance
   */
  const submitTransaction = useCallback(async ({
    transactionType, // "product_send" or "payment_receive"
    adminId,
    customerId,
    customerName,
    transactionDate,
    // For Product Send transactions
    productId = null,
    productName = null,
    quantity = null,
    pricePerUnit = null,
    // For Payment Receive transactions
    paymentAmount = null,
    paymentMethod = null,
    clearanceDate = null,
  }) => {
    try {
      // Validate inputs
      if (!transactionType || !adminId || !customerId || !customerName) {
        throw new Error('Missing required transaction fields');
      }

      const created_at = transactionDate ? new Date(transactionDate + 'T12:00:00') : new Date();
      
      // Determine transaction amount and type label
      let transactionAmount = 0;
      let typeLabel = '';
      let transactionPayload = {
        customer_id: customerId,
        admin_id: adminId,
        created_at,
      };

      if (transactionType === 'product_send') {
        // Product Send: ADDS to customer balance (they owe more)
        typeLabel = 'Product Send';
        
        if (!productId || !productName || !quantity || !pricePerUnit) {
          throw new Error('Missing product details for product send transaction');
        }

        const qty = Number(quantity);
        const price = Number(pricePerUnit);
        transactionAmount = qty * price;

        // Build complete transaction record for product send
        transactionPayload = {
          ...transactionPayload,
          type: 'product_send',
          product_id: productId,
          product_name: productName,
          quantity: qty,
          price_per_unit: price,
          amount: transactionAmount,
          total_amount: transactionAmount, // For backward compatibility
          payment_method: null,
        };
      } else if (transactionType === 'payment_receive') {
        // Payment Receive: SUBTRACTS from customer balance (they owe less)
        typeLabel = 'Payment Receive';
        
        if (!paymentAmount || !paymentMethod) {
          throw new Error('Missing payment details for payment receive transaction');
        }

        transactionAmount = Number(paymentAmount);

        // Build complete transaction record for payment receive
        transactionPayload = {
          ...transactionPayload,
          type: 'payment_receive',
          amount: transactionAmount,
          payment_method: paymentMethod,
          clearance_date: clearanceDate,
          product_id: null,
          product_name: null,
          quantity: null,
          price_per_unit: null,
        };
      } else {
        throw new Error(`Invalid transaction type: ${transactionType}`);
      }

      // Fetch current customer data to ensure we have latest balance
      const allCustomers = await customersApi.getByAdmin(adminId);
      const customer = allCustomers.find(c => c.id === customerId);
      
      if (!customer) {
        throw new Error(`Customer ${customerId} not found`);
      }

      const currentDues = Number(customer.balance || 0);
      
      // Calculate new balance based on transaction type
      let newDues = currentDues;
      if (transactionType === 'product_send') {
        newDues = currentDues + transactionAmount; // ADD for product send
      } else if (transactionType === 'payment_receive') {
        newDues = Math.max(0, currentDues - transactionAmount); // SUBTRACT for payment (min 0)
      }

      // Step 1: Create transaction record with balance information
      const enhancedPayload = {
        ...transactionPayload,
        previous_balance: currentDues,
        new_balance: newDues,
      };

      const recordId = await customerRecordsApi.add(enhancedPayload);

      // Step 2: Update customer balance in database
      await customersApi.update(customerId, { 
        balance: newDues,
        updated_at: new Date(),
      });

      // Step 3: Update local state with latest customer data (Optimistic)
      setCustomers(prevCustomers => 
        prevCustomers.map(c => 
          c.id === customerId ? { ...c, balance: newDues, updated_at: new Date() } : c
        )
      );

      // Step 3.5: Update records state (Optimistic)
      setRecords(prev => [
          {
              id: "temp-" + Date.now(),
              ...enhancedPayload,
              created_at: enhancedPayload.created_at, // Use the Date object
          },
          ...prev
      ]);

      // Step 4: Create audit log
      try {
        const auditMessage = transactionType === 'product_send'
          ? `Product sent to customer ${customerName}: ${productName} (Qty: ${quantity})`
          : `Payment received from customer ${customerName}: ${paymentMethod}`;

        await auditApi.add({
          admin_id: adminId,
          action: transactionType,
          message: auditMessage,
          details: {
            recordId,
            customerId,
            transactionAmount,
            previousBalance: currentDues,
            newBalance: newDues,
            ...transactionPayload,
          },
        });
      } catch (e) {
        console.error('Audit log failed:', e);
        // Don't fail the transaction if audit log fails
      }

      return {
        recordId,
        transactionAmount,
        previousBalance: currentDues,
        newBalance: newDues,
        transactionType,
        typeLabel,
      };
    } catch (error) {
      console.error('Error submitting transaction:', error);
      throw error;
    }
  }, [customers]);

  // Legacy: Record a new purchase order (increases customer dues)
  const recordPurchase = useCallback(async ({
    adminId,
    customerId,
    customerName,
    productId,
    productName,
    quantity,
    price,
    totalAmount,
    transactionDate,
  }) => {
    // Delegate to unified submitTransaction for backward compatibility
    const result = await submitTransaction({
      transactionType: 'product_send',
      adminId,
      customerId,
      customerName,
      transactionDate,
      productId,
      productName,
      quantity,
      pricePerUnit: price,
    });
    return { recordId: result.recordId, newDues: result.newBalance };
  }, [submitTransaction]);

  // Record a payment (decreases customer dues)
  const recordPayment = useCallback(async ({
    adminId,
    customerId,
    customerName,
    amount,
    paymentMethod,
    transactionDate,
    invoiceRef = null,
  }) => {
    // Delegate to unified submitTransaction for backward compatibility
    if (Number(amount) <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }
    
    const result = await submitTransaction({
      transactionType: 'payment_receive',
      adminId,
      customerId,
      customerName,
      transactionDate,
      paymentAmount: amount,
      paymentMethod,
    });
    return { recordId: result.recordId, newDues: result.newBalance };
  }, [submitTransaction]);

  // Delete customer and their records
  const deleteCustomer = useCallback(async (customerId) => {
    try {
      const adminId = localStorage.getItem("adminId");
      if (!adminId) throw new Error("No admin ID found");
      
      // Delete all transaction records first
      await customerRecordsApi.deleteByCustomer(customerId, adminId);
      // Then delete the customer
      await customersApi.delete(customerId);
      
      // Update local state
      setCustomers(prev => prev.filter(c => c.id !== customerId));
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  }, []);

  // Get customer transactions
  const getCustomerTransactions = useCallback(async (adminId, customerId) => {
    try {
      const records = await customerRecordsApi.getByCustomerAndAdmin(customerId, adminId);
      return records || [];
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  }, []);

  // Get customer dues summary
  const getCustomerDues = useCallback((customerId) => {
    const customer = customers.find(c => c.id === customerId);
    return Number(customer?.balance || 0);
  }, [customers]);

  // Get all customers with dues
  const getCustomersWithDues = useCallback(() => {
    return customers.map(c => ({
      ...c,
      dues: Number(c.balance || 0),
    }));
  }, [customers]);

  // Clear customer dues (admin function for manual adjustment)
  const adjustCustomerDues = useCallback(async ({
    adminId,
    customerId,
    customerName,
    newDuesAmount,
    reason = 'Manual adjustment',
  }) => {
    try {
      await customersApi.update(customerId, { balance: newDuesAmount });
      setCustomers(prev => 
        prev.map(c => c.id === customerId ? { ...c, balance: newDuesAmount } : c)
      );

      // Audit log
      try {
        await auditApi.add({
          admin_id: adminId,
          action: 'dues_adjusted',
          message: `Dues adjusted for customer ${customerName} to ${newDuesAmount}`,
          details: { customerId, reason, newAmount: newDuesAmount },
        });
      } catch (e) {
        console.error('Audit log failed:', e);
      }

      return newDuesAmount;
    } catch (error) {
      console.error('Error adjusting dues:', error);
      toast.error('Failed to adjust customer dues');
      throw error;
    }
  }, []);

  const value = {
    customers,
    loading,
    fetchCustomers,
    submitTransaction,
    recordPurchase,
    recordPayment,
    getCustomerTransactions: useCallback(async (adminId, customerId) => {
        // Now we can just filter our central records state
        return records.filter(r => r.customer_id === customerId);
    }, [records]),
    getCustomerRecords: useCallback((cid) => {
        return records.filter(r => r.customer_id === cid).sort((a,b) => {
            const da = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at);
            const db = b.created_at?.toDate ? b.created_at.toDate() : new Date(b.created_at);
            return db - da; 
        });
    }, [records]),
    globalRecords: records,
    deleteCustomer,
    getCustomerDues,
    getCustomersWithDues,
    adjustCustomerDues,
  };

  return (
    <LoanContext.Provider value={value}>
      {children}
    </LoanContext.Provider>
  );
}
