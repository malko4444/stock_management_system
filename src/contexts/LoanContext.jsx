import React, { createContext, useCallback, useState, useEffect, useRef } from 'react';
import { customersApi, customerRecordsApi, auditApi, inventoryApi } from '../services/firebaseApi';
import { format, subDays, subWeeks, subMonths, subYears, isAfter, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { toast } from 'react-toastify';

export const LoanContext = createContext();

export default function LoanProvider({ children }) {
  const [customers, setCustomers] = useState([]);
  const [records, setRecords] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);

  const unsubCustomersRef = useRef(null);
  const unsubRecordsRef = useRef(null);
  const unsubInventoryRef = useRef(null);
  const isInitialFetchDone = useRef(false);

  const fetchCustomers = useCallback(async (adminId) => {
    if (!adminId) return [];
    if (!isInitialFetchDone.current) {
        setLoading(true);
    }
    if (unsubCustomersRef.current) unsubCustomersRef.current();
    if (unsubRecordsRef.current) unsubRecordsRef.current();
    if (unsubInventoryRef.current) unsubInventoryRef.current();

    try {
      const uCust = customersApi.listenByAdmin(adminId, (data) => {
        setCustomers(data);
        setLoading(false);
        isInitialFetchDone.current = true;
      });
      unsubCustomersRef.current = uCust;
      const uRecs = customerRecordsApi.listenByAdmin(adminId, (data) => {
        setRecords(data);
      });
      unsubRecordsRef.current = uRecs;
      if (inventoryApi.listenByAdmin) {
        const uInv = inventoryApi.listenByAdmin(adminId, (data) => {
          setInventory(data);
        });
        unsubInventoryRef.current = uInv;
      }
      return await customersApi.getByAdmin(adminId);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
      return [];
    }
  }, []);

  useEffect(() => {
    const adminId = localStorage.getItem("adminId");
    if (adminId) {
        fetchCustomers(adminId);
    }
    return () => {
      if (unsubCustomersRef.current) unsubCustomersRef.current();
      if (unsubRecordsRef.current) unsubRecordsRef.current();
      if (unsubInventoryRef.current) unsubInventoryRef.current();
    };
  }, [fetchCustomers]);

  const submitTransaction = useCallback(async ({
    transactionType, adminId, customerId, customerName, transactionDate,
    productId = null, productName = null, quantity = null, pricePerUnit = null,
    paymentAmount = null, paymentMethod = null, clearanceDate = null,
  }) => {
    try {
      if (!transactionType || !adminId || !customerId || !customerName) {
        throw new Error('Missing required transaction fields');
      }
      const isTodayTransaction = transactionDate === format(new Date(), "yyyy-MM-dd");
      const created_at = transactionDate 
        ? (isTodayTransaction ? new Date() : new Date(transactionDate + 'T12:00:00')) 
        : new Date();
      
      let transactionAmount = 0;
      let typeLabel = '';
      let transactionPayload = {
        customer_id: customerId,
        admin_id: adminId,
        created_at,
      };

      if (transactionType === 'product_send') {
        typeLabel = 'Product Send';
        if (!productId || !productName || !quantity || !pricePerUnit) {
          throw new Error('Missing product details for product send transaction');
        }
        const qty = Number(quantity);
        const price = Number(pricePerUnit);
        transactionAmount = qty * price;
        transactionPayload = {
          ...transactionPayload,
          type: 'product_send',
          product_id: productId,
          product_name: productName,
          quantity: qty,
          price_per_unit: price,
          amount: transactionAmount,
          total_amount: transactionAmount,
          payment_method: null,
        };
      } else if (transactionType === 'payment_receive') {
        typeLabel = 'Payment Receive';
        if (!paymentAmount || !paymentMethod) {
          throw new Error('Missing payment details for payment receive transaction');
        }
        transactionAmount = Number(paymentAmount);
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
      }

      const allCustomers = await customersApi.getByAdmin(adminId);
      const customer = allCustomers.find(c => c.id === customerId);
      if (!customer) throw new Error(`Customer ${customerId} not found`);
      const currentDues = Number(customer.balance || 0);
      
      let newDues = currentDues;
      if (transactionType === 'product_send') {
        newDues = currentDues + transactionAmount;
      } else if (transactionType === 'payment_receive') {
        newDues = currentDues - transactionAmount;
      }

      const enhancedPayload = {
        ...transactionPayload,
        previous_balance: currentDues,
        new_balance: newDues,
      };

      const recordId = await customerRecordsApi.add(enhancedPayload);
      await customersApi.update(customerId, { balance: newDues, updated_at: new Date() });

      if (transactionType === 'product_send' && productId) {
        try {
          const invItem = await inventoryApi.getById(productId);
          if (invItem) {
            const currentQty = Number(invItem.quantity || 0);
            const soldQty = Number(quantity || 0);
            const newQty = Math.max(0, currentQty - soldQty);
            await inventoryApi.updateQuantity(productId, newQty);
            setInventory(prev => prev.map(item => item.id === productId ? { ...item, quantity: newQty } : item));
          }
        } catch (e) {
          console.error('Failed to update inventory quantity:', e);
        }
      }

      setCustomers(prevCustomers => prevCustomers.map(c => c.id === customerId ? { ...c, balance: newDues, updated_at: new Date() } : c));
      setRecords(prev => [{ id: "temp-" + Date.now(), ...enhancedPayload, created_at: enhancedPayload.created_at }, ...prev]);

      try {
        const auditMessage = transactionType === 'product_send'
          ? `Product sent to customer ${customerName}: ${productName} (Qty: ${quantity})`
          : `Payment received from customer ${customerName}: ${paymentMethod}`;
        await auditApi.add({
          admin_id: adminId,
          action: transactionType,
          message: auditMessage,
          details: { recordId, customerId, transactionAmount, previousBalance: currentDues, newBalance: newDues, ...transactionPayload },
        });
      } catch (e) {
        console.error('Audit log failed:', e);
      }

      return { recordId, transactionAmount, previousBalance: currentDues, newBalance: newDues, transactionType, typeLabel };
    } catch (error) {
      console.error('Error submitting transaction:', error);
      throw error;
    }
  }, [customers]);

  const recordPurchase = useCallback(async (data) => {
    const result = await submitTransaction({ ...data, transactionType: 'product_send' });
    return { recordId: result.recordId, newDues: result.newBalance };
  }, [submitTransaction]);

  const recordPayment = useCallback(async (data) => {
    if (Number(data.amount) <= 0) throw new Error('Payment amount must be greater than 0');
    const result = await submitTransaction({ ...data, transactionType: 'payment_receive', paymentAmount: data.amount });
    return { recordId: result.recordId, newDues: result.newBalance };
  }, [submitTransaction]);

  const deleteCustomer = useCallback(async (customerId) => {
    try {
      const adminId = localStorage.getItem("adminId");
      if (!adminId) throw new Error("No admin ID found");
      await customerRecordsApi.deleteByCustomer(customerId, adminId);
      await customersApi.delete(customerId);
      setCustomers(prev => prev.filter(c => c.id !== customerId));
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  }, []);

  const getCustomerDues = useCallback((customerId) => {
    const customer = customers.find(c => c.id === customerId);
    return Number(customer?.balance || 0);
  }, [customers]);

  const getCustomersWithDues = useCallback(() => {
    return customers.map(c => ({ ...c, dues: Number(c.balance || 0) }));
  }, [customers]);

  const adjustCustomerDues = useCallback(async ({ adminId, customerId, customerName, newDuesAmount, reason = 'Manual adjustment' }) => {
    try {
      await customersApi.update(customerId, { balance: newDuesAmount });
      setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, balance: newDuesAmount } : c));
      try {
        await auditApi.add({
          admin_id: adminId, action: 'dues_adjusted', message: `Dues adjusted for customer ${customerName} to ${newDuesAmount}`,
          details: { customerId, reason, newAmount: newDuesAmount },
        });
      } catch (e) { console.error('Audit log failed:', e); }
      return newDuesAmount;
    } catch (error) {
      console.error('Error adjusting dues:', error);
      toast.error('Failed to adjust customer dues');
      throw error;
    }
  }, []);

  const deleteCustomerRecordsByPeriod = useCallback(async (adminId, customerId, period, customDates = null) => {
    try {
      const customer = customers.find(c => c.id === customerId);
      if (!customer) throw new Error("Customer not found");

      const now = new Date();
      let startBoundary;
      let endBoundary = endOfDay(now);

      if (period === 'custom' && customDates?.startDate && customDates?.endDate) {
        startBoundary = startOfDay(new Date(customDates.startDate));
        endBoundary = endOfDay(new Date(customDates.endDate));
      } else {
        switch (period) {
          case 'today': startBoundary = startOfDay(now); break;
          case 'week': startBoundary = startOfDay(subWeeks(now, 1)); break;
          case 'month': startBoundary = startOfDay(subMonths(now, 1)); break;
          case '3months': startBoundary = startOfDay(subMonths(now, 3)); break;
          case '6months': startBoundary = startOfDay(subMonths(now, 6)); break;
          case 'year': startBoundary = startOfDay(subYears(now, 1)); break;
          case 'all': startBoundary = new Date(0); break;
          default: throw new Error("Invalid period");
        }
      }

      console.log(`Deleting records for ${customer.name} between ${startBoundary.toISOString()} and ${endBoundary.toISOString()}`);

      const customerRecords = records.filter(r => r.customer_id === customerId);
      const toDelete = customerRecords.filter(r => {
        let rDate;
        if (r.created_at?.toDate) {
          rDate = r.created_at.toDate();
        } else if (r.created_at?.seconds) {
          rDate = new Date(r.created_at.seconds * 1000);
        } else {
          rDate = new Date(r.created_at);
        }
        
        return rDate >= startBoundary && rDate <= endBoundary;
      });

      if (toDelete.length === 0) {
        console.log("No records matched filter:", { startBoundary, endBoundary, recordCount: customerRecords.length });
        toast.info("No records found for the selected period.");
        return false;
      }

      let balanceAdjustment = 0;
      toDelete.forEach(r => {
        const amt = Number(r.amount || r.total_amount || 0);
        const isSale = ['product_send', 'purchase', 'send'].includes(r.type);
        balanceAdjustment += isSale ? -amt : amt;
      });

      const newBalance = (Number(customer.balance || 0)) + balanceAdjustment;
      await customerRecordsApi.deleteMultiple(toDelete.map(r => r.id));
      await customersApi.update(customerId, { balance: newBalance });

      await auditApi.add({
        admin_id: adminId, action: 'delete_records_period',
        message: `Deleted ${toDelete.length} records for ${customer.name} (Period: ${period})`,
        details: { customerId, period, count: toDelete.length, balanceAdjustment, newBalance }
      });

      setRecords(prev => prev.filter(r => !toDelete.some(td => td.id === r.id)));
      setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, balance: newBalance } : c));

      toast.success(`Deleted ${toDelete.length} records successfully!`);
      return true;
    } catch (error) {
      console.error("Error deleting records:", error);
      toast.error("Failed to delete records.");
      throw error;
    }
  }, [customers, records]);

  const clearAllRecords = useCallback(async (adminId) => {
    try {
      setLoading(true);
      await customerRecordsApi.deleteAllByAdmin(adminId);
      await customersApi.resetAllBalancesByAdmin(adminId);
      await auditApi.add({ admin_id: adminId, action: 'global_reset', message: 'Master Reset', details: { timestamp: new Date() } });
      setRecords([]);
      setCustomers(prev => prev.map(c => ({ ...c, balance: 0 })));
      toast.success("Master Reset Complete.");
      return true;
    } catch (error) {
      console.error("Master reset failed:", error);
      toast.error("Master Reset failed.");
      throw error;
    } finally { setLoading(false); }
  }, []);

  const value = {
    customers, loading, fetchCustomers, submitTransaction, recordPurchase, recordPayment,
    getCustomerTransactions: useCallback(async (adminId, customerId) => records.filter(r => r.customer_id === customerId), [records]),
    getCustomerRecords: useCallback((cid) => records.filter(r => r.customer_id === cid).sort((a,b) => {
        const da = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at);
        const db = b.created_at?.toDate ? b.created_at.toDate() : new Date(b.created_at);
        return db - da;
    }), [records]),
    globalRecords: records, deleteCustomer, getCustomerDues, getCustomersWithDues, adjustCustomerDues, deleteCustomerRecordsByPeriod, clearAllRecords, inventory,
  };

  return <LoanContext.Provider value={value}>{children}</LoanContext.Provider>;
}
