import React, { createContext } from 'react';
import {
  accountReceivableApi,
  accountPayableApi,
  auditApi,
  inventoryApi,
} from '../services/firebaseApi';

export const FinancialContext = createContext();

export default function FinancialProvider({ children }) {
  // Create a receivable entry for a credit sale
  const createReceivable = async ({ admin_id, customer_id, customer_name, description, amount, created_at, meta = {} }) => {
    const payload = { admin_id, customer_id, customer_name, description, amount, created_at, status: 'pending', meta };
    const id = await accountReceivableApi.add(payload);
    await auditApi.add({ admin_id, action: 'create_receivable', message: `Receivable ${id} created for customer ${customer_name}`, details: payload });
    return id;
  };

  // Apply payment to receivables FIFO and return remainder
  const applyPayment = async (adminId, customerId, paymentAmount) => {
    const remainder = await accountReceivableApi.applyPayment(adminId, customerId, paymentAmount);
    await auditApi.add({ admin_id: adminId, action: 'apply_payment', message: `Applied payment ${paymentAmount} to receivables for customer ${customerId}`, details: { remainder } });
    return remainder;
  };

  // Create payable for inventory purchase on account
  const createPayableForInventory = async ({ admin_id, inventory_id, vendor_id, vendor_name, description, amount, created_at, status = 'pending', meta = {} }) => {
    const payload = { admin_id, inventory_id, payee_id: vendor_id, vendor: vendor_name, description, amount, created_at, status, meta };
    const id = await accountPayableApi.add(payload);
    await auditApi.add({ admin_id, action: 'create_payable', message: `Payable ${id} created for inventory ${inventory_id}`, details: payload });
    return id;
  };

  // Update pending payables associated to an inventory batch when price changes
  const updatePayablesForInventoryPriceChange = async ({ admin_id, inventory_id, newUnitPrice }) => {
    const payables = await accountPayableApi.getByInventoryId(admin_id, inventory_id);
    for (const p of payables) {
      if (p.status === 'pending' && p.meta?.quantity) {
        const newAmount = Number(p.meta.quantity) * Number(newUnitPrice);
        await accountPayableApi.update(p.id, { amount: newAmount });
        await auditApi.add({ admin_id, action: 'update_payable', message: `Payable ${p.id} updated due to inventory price change`, details: { inventory_id, old: p.amount, new: newAmount } });
      }
    }
  };

  // Void receivables for a particular customer (e.g., when sales deleted)
  const voidReceivablesForCustomer = async ({ admin_id, customer_id, reason }) => {
    const recs = await accountReceivableApi.getByCustomerAndAdmin(admin_id, customer_id);
    for (const r of recs) {
      if (r.status !== 'voided') {
        await accountReceivableApi.update(r.id, { status: 'voided' });
        await auditApi.add({ admin_id, action: 'void_receivable', message: `Receivable ${r.id} voided for customer ${customer_id}`, details: { reason } });
      }
    }
  };

  // Update receivable's customer_name when customer profile changes
  const syncCustomerName = async ({ admin_id, customer_id, customer_name }) => {
    const recs = await accountReceivableApi.getByCustomerAndAdmin(admin_id, customer_id);
    for (const r of recs) {
      await accountReceivableApi.update(r.id, { customer_name });
    }
    await auditApi.add({ admin_id, action: 'sync_customer_name', message: `Synced customer name '${customer_name}' across receivables for ${customer_id}` });
  };

  return (
    <FinancialContext.Provider value={{ createReceivable, applyPayment, createPayableForInventory, updatePayablesForInventoryPriceChange, voidReceivablesForCustomer, syncCustomerName }}>
      {children}
    </FinancialContext.Provider>
  );
}
