/**
 * Firebase API - Central service for all Firestore & Auth operations.
 * Collections: customers, customerRecord, inventory, deleted_records,
 *   users, payroll, account_receivable, account_payable, reviews
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
} from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
} from "firebase/auth";
import { db, auth } from "../../firebaseConfig";

// ---------- User Profile (display name) ----------
export const userProfileApi = {
  get: async (uid) => {
    const d = await getDoc(doc(db, "users", uid));
    return d.exists() ? d.data() : null;
  },
  set: async (uid, data) => {
    await setDoc(doc(db, "users", uid), { ...data, updatedAt: new Date() }, { merge: true });
  },
};

// ---------- Auth ----------
export const authApi = {
  signIn: (email, password) =>
    signInWithEmailAndPassword(auth, email, password),

  signUp: (email, password) =>
    createUserWithEmailAndPassword(auth, email, password),

  signOut: () => fbSignOut(auth),
};

// ---------- Customers ----------
export const customersApi = {
  getByAdmin: async (adminId) => {
    const q = query(
      collection(db, "customers"),
      where("adminId", "==", adminId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  add: async (data) => {
    const docRef = await addDoc(collection(db, "customers"), {
      ...data,
      createdAt: data.createdAt || new Date(),
    });
    return docRef.id;
  },

  update: async (id, data) => {
    await updateDoc(doc(db, "customers", id), data);
  },

  delete: async (id) => {
    await deleteDoc(doc(db, "customers", id));
  },
};

// ---------- Customer Records (send product / receive payment) ----------
export const customerRecordsApi = {
  getByCustomerAndAdmin: async (customerId, adminId) => {
    const q = query(
      collection(db, "customerRecord"),
      where("customer_id", "==", customerId),
      where("admin_id", "==", adminId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  add: async (data) => {
    const docRef = await addDoc(collection(db, "customerRecord"), {
      ...data,
      created_at: data.created_at || Timestamp.now(),
    });
    return docRef.id;
  },

  deleteByCustomer: async (customerId, adminId) => {
    const q = query(
      collection(db, "customerRecord"),
      where("customer_id", "==", customerId),
      where("admin_id", "==", adminId)
    );
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  },
};

// ---------- Inventory ----------
export const inventoryApi = {
  getByAdmin: async (adminId) => {
    const q = query(
      collection(db, "inventory"),
      where("adminId", "==", adminId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
        price: data.price != null ? Number(data.price) : 0,
      };
    });
  },

  add: async (data) => {
    const docRef = await addDoc(collection(db, "inventory"), {
      productName: data.productName,
      quantity: Number(data.quantity),
      price: data.price != null ? Number(data.price) : 0,
      adminId: data.adminId,
      createdAt: data.createdAt || new Date(),
    });
    return docRef.id;
  },

  update: async (id, data) => {
    const payload = { updatedAt: new Date() };
    if (data.productName != null) payload.productName = data.productName;
    if (data.quantity != null) payload.quantity = Number(data.quantity);
    if (data.price != null) payload.price = Number(data.price);
    await updateDoc(doc(db, "inventory", id), payload);
  },

  updateQuantity: async (id, quantity) => {
    await updateDoc(doc(db, "inventory", id), { quantity: Number(quantity) });
  },

  delete: async (id) => {
    await deleteDoc(doc(db, "inventory", id));
  },

  // get single inventory item by id
  getById: async (id) => {
    const d = await getDoc(doc(db, "inventory", id));
    return d.exists() ? { id: d.id, ...d.data() } : null;
  },
};

// ---------- Deleted Records (audit/history) ----------
export const deletedRecordsApi = {
  getByAdmin: async (adminId) => {
    const q = query(
      collection(db, "deleted_records"),
      where("admin_id", "==", adminId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  add: async (payload) => {
    await addDoc(collection(db, "deleted_records"), {
      ...payload,
      admin_id: payload.admin_id,
      deleted_at: payload.deleted_at || Timestamp.now(),
    });
  },

  delete: async (id) => {
    await deleteDoc(doc(db, "deleted_records", id));
  },
};

// ---------- Payroll ----------
export const payrollApi = {
  getByAdmin: async (adminId) => {
    const q = query(collection(db, "payroll"), where("admin_id", "==", adminId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },
  add: async (data) => {
    const docRef = await addDoc(collection(db, "payroll"), {
      ...data,
      admin_id: data.admin_id,
      created_at: data.created_at || Timestamp.now(),
    });
    return docRef.id;
  },
  update: async (id, data) => {
    await updateDoc(doc(db, "payroll", id), { ...data, updated_at: new Date() });
  },
  delete: async (id) => {
    await deleteDoc(doc(db, "payroll", id));
  },
};

// ---------- Account Receivable ----------
export const accountReceivableApi = {
  getByAdmin: async (adminId) => {
    const q = query(collection(db, "account_receivable"), where("admin_id", "==", adminId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  // get receivables for a specific customer
  getByCustomerAndAdmin: async (adminId, customerId) => {
    const q = query(
      collection(db, "account_receivable"),
      where("admin_id", "==", adminId),
      where("customer_id", "==", customerId),
      orderBy("created_at", "asc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  // Add a receivable entry
  add: async (data) => {
    // Basic validation so we fail fast with descriptive errors
    if (!data || !data.admin_id) throw new Error('admin_id is required to create a receivable');

    const status = data.status || "pending";
    // derive numeric values
    const providedAmount = data.amount != null ? Number(data.amount) : null;
    const providedPaid = data.paid_amount != null ? Number(data.paid_amount) : 0;

    let original = data.original_amount != null ? Number(data.original_amount) : (providedAmount != null ? providedAmount : null);
    let paid = providedPaid;

    // If there's no amount provided and no original amount, fail with a clear error
    if (original == null && providedPaid === 0) {
      throw new Error('original_amount or amount is required and must be a number');
    }

    let remaining = providedAmount != null ? providedAmount : (original != null ? Math.max(0, original - paid) : 0);

    if (status === "paid") {
      // If marked paid on creation, treat the provided amount as fully paid
      if (original == null) original = remaining;
      paid = original;
      remaining = 0;
    }

    let payload = {
      ...data,
      admin_id: data.admin_id,
      created_at: data.created_at || Timestamp.now(),
      status,
      original_amount: original,
      paid_amount: paid,
      amount: remaining,
    };

    // Only set paid_at when we actually have a date (avoid undefined which Firestore rejects)
    if (status === "paid") payload.paid_at = Timestamp.now();
    else if (data.paid_at) payload.paid_at = data.paid_at;

    // Remove any keys with undefined values because Firestore rejects undefined field values
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

    try {
      const docRef = await addDoc(collection(db, "account_receivable"), payload);
      // Dispatch a global event so UI can refresh in real-time
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('financialChange', { detail: { module: 'receivable', action: 'add', id: docRef.id } }));
      return docRef.id;
    } catch (err) {
      console.error('Failed to add receivable in firestore:', err);
      throw new Error('Failed to create receivable: ' + (err?.message || String(err)));
    }
  },

  // Apply a payment to pending receivables for a customer in FIFO order
  applyPayment: async (adminId, customerId, paymentAmount) => {
    let remainder = Number(paymentAmount) || 0;
    if (remainder <= 0) return remainder;
    const q = query(
      collection(db, "account_receivable"),
      where("admin_id", "==", adminId),
      where("customer_id", "==", customerId),
      where("status", "==", "pending"),
      orderBy("created_at", "asc")
    );
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      if (remainder <= 0) break;
      const data = d.data();

      // derive original & paid and remaining amounts reliably
      const paidSoFar = Number(data.paid_amount || 0);
      const remaining = Number(data.amount ?? (Number(data.original_amount || 0) - paidSoFar));
      const original = Number(data.original_amount ?? (paidSoFar + remaining));

      if (remaining <= 0) {
        // ensure fully paid state
        await updateDoc(d.ref, { status: "paid", amount: 0, original_amount: original, paid_amount: original, paid_at: Timestamp.now() });
        continue;
      }

      if (remainder >= remaining) {
        // fully pay this entry
        await updateDoc(d.ref, { amount: 0, status: "paid", original_amount: original, paid_amount: paidSoFar + remaining, paid_at: Timestamp.now() });
        remainder -= remaining;
      } else {
        // partially pay
        await updateDoc(d.ref, { amount: remaining - remainder, paid_amount: paidSoFar + remainder, original_amount: original });
        remainder = 0;
      }
    }
    // Notify listeners after payments applied
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('financialChange', { detail: { module: 'receivable', action: 'applyPayment', adminId, customerId } }));
    return remainder;
  },

  update: async (id, data) => {
    const ref = doc(db, "account_receivable", id);
    const snap = await getDoc(ref);
    const old = snap.exists() ? snap.data() : {};
    const payload = { ...data, updated_at: new Date() };

    if (data.status === "paid") {
      const oldRemaining = Number(old.amount ?? 0);
      const oldPaid = Number(old.paid_amount ?? 0);
      const oldOriginal = Number(old.original_amount ?? (oldPaid + oldRemaining));

      // If user provided an amount on the update (treated as full amount), use it as original and paid
      if (data.amount != null && Number(data.amount) > 0) {
        payload.original_amount = Number(data.amount);
        payload.paid_amount = Number(data.amount);
      } else {
        payload.original_amount = oldOriginal;
        payload.paid_amount = oldOriginal;
      }

      payload.amount = 0;
      payload.paid_at = Timestamp.now();
    }

    // Remove undefined fields to avoid Firestore rejecting the update
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

    await updateDoc(ref, payload);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('financialChange', { detail: { module: 'receivable', action: 'update', id } }));
  },

  delete: async (id) => {
    await deleteDoc(doc(db, "account_receivable", id));
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('financialChange', { detail: { module: 'receivable', action: 'delete', id } }));
  },

  // Real-time listener for receivables by admin
  listenByAdmin: (adminId, callback) => {
    const q = query(collection(db, "account_receivable"), where("admin_id", "==", adminId), orderBy("created_at", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(items);
    });
    return unsub;
  },
};

// ---------- Account Payable ----------
export const accountPayableApi = {
  getByAdmin: async (adminId) => {
    const q = query(collection(db, "account_payable"), where("admin_id", "==", adminId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  // get payables for a specific payee (e.g., customer as credit or employee)
  getByPayeeAndAdmin: async (adminId, payeeId) => {
    const q = query(
      collection(db, "account_payable"),
      where("admin_id", "==", adminId),
      where("payee_id", "==", payeeId),
      orderBy("created_at", "asc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  add: async (data) => {
    // Ensure original and paid amounts are present for accurate UI and totals
    const original = data.original_amount != null ? Number(data.original_amount) : Number(data.amount || 0);
    const paid = data.paid_amount != null ? Number(data.paid_amount) : 0;
    const payload = {
      ...data,
      admin_id: data.admin_id,
      created_at: data.created_at || Timestamp.now(),
      status: data.status || "pending",
      original_amount: original,
      paid_amount: paid,
      // `amount` is the remaining payable
      amount: data.amount != null ? Number(data.amount) : Math.max(0, original - paid),
    };
    const docRef = await addDoc(collection(db, "account_payable"), payload);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('financialChange', { detail: { module: 'payable', action: 'add', id: docRef.id } }));
    return docRef.id;
  },
  update: async (id, data) => {
    await updateDoc(doc(db, "account_payable", id), { ...data, updated_at: new Date() });
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('financialChange', { detail: { module: 'payable', action: 'update', id } }));
  },
  delete: async (id) => {
    await deleteDoc(doc(db, "account_payable", id));
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('financialChange', { detail: { module: 'payable', action: 'delete', id } }));
  },

  // Real-time listener for payables
  listenByAdmin: (adminId, callback) => {
    const q = query(collection(db, "account_payable"), where("admin_id", "==", adminId), orderBy("created_at", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(items);
    });
    return unsub;
  },

  // find payables created for a specific inventory batch
  getByInventoryId: async (adminId, inventoryId) => {
    const q = query(
      collection(db, "account_payable"),
      where("admin_id", "==", adminId),
      where("inventory_id", "==", inventoryId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },
};

// ---------- Reviews ----------
export const reviewsApi = {
  getByAdmin: async (adminId) => {
    const q = query(collection(db, "reviews"), where("admin_id", "==", adminId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },
  add: async (data) => {
    const docRef = await addDoc(collection(db, "reviews"), {
      ...data,
      admin_id: data.admin_id,
      created_at: data.created_at || Timestamp.now(),
    });
    return docRef.id;
  },
  update: async (id, data) => {
    await updateDoc(doc(db, "reviews", id), { ...data, updated_at: new Date() });
  },
  delete: async (id) => {
    await deleteDoc(doc(db, "reviews", id));
  },
};

// ---------- Audit Logs ----------
export const auditApi = {
  add: async (payload) => {
    await addDoc(collection(db, "audit_logs"), {
      ...payload,
      admin_id: payload.admin_id,
      created_at: payload.created_at || Timestamp.now(),
    });
  },
};

// ---------- Reports (aggregates) ----------
export const reportsApi = {
  getDashboardStats: async (adminId) => {
    const [customers, inventory, payroll, recv, pay] = await Promise.all([
      customersApi.getByAdmin(adminId),
      inventoryApi.getByAdmin(adminId),
      payrollApi.getByAdmin(adminId),
      accountReceivableApi.getByAdmin(adminId),
      accountPayableApi.getByAdmin(adminId),
    ]);

    let totalBalances = 0;
    let totalRevenue = 0;
    const recentTxs = [];
    const customerBalances = [];

    for (const c of customers) {
      const recs = await customerRecordsApi.getByCustomerAndAdmin(c.id, adminId);
      const custBalance = recs.reduce((s, r) => s + (r.type === "send" ? r.total_amount || 0 : -(r.amount || 0)), 0);
      totalBalances += custBalance;
      customerBalances.push({ id: c.id, name: c.name, balance: custBalance });

      for (const r of recs) {
        const date = r.created_at?.toDate ? r.created_at.toDate() : new Date(r.created_at || Date.now());
        if (r.type === "receive") {
          totalRevenue += Number(r.amount || 0);
        }
        recentTxs.push({ date, type: r.type, customer: c.name, amount: Number(r.type === "send" ? r.total_amount || 0 : r.amount || 0) });
      }
    }

    recentTxs.sort((a, b) => b.date - a.date);

    // Pending balances must consider current remaining amounts. Paid items are not pending.
    // If a document lacks `amount`, fallback to original_amount - paid_amount so legacy documents are handled correctly.
    const recvPending = recv.reduce((s, r) => {
      if (r.status === "paid") return s;
      const remaining = Number(r.amount ?? (Number(r.original_amount || 0) - Number(r.paid_amount || 0)));
      return s + Math.max(0, remaining || 0);
    }, 0);

    const payPending = pay.reduce((s, r) => {
      if (r.status === "paid") return s;
      const remaining = Number(r.amount ?? (Number(r.original_amount || 0) - Number(r.paid_amount || 0)));
      return s + Math.max(0, remaining || 0);
    }, 0);

    const topDebtors = customerBalances
      .filter((c) => c.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5);

    const payrollTotal = payroll.reduce((s, r) => {
      const amt = Number(r.amount) || 0;
      return s + (r.type === "deduction" ? -amt : amt);
    }, 0);
    const inventoryValue = inventory.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.price) || 0), 0);

    return {
      customersCount: customers.length,
      inventoryCount: inventory.length,
      inventoryValue,
      customerBalancesTotal: totalBalances,
      payrollTotal,
      receivablePending: recvPending,
      payablePending: payPending,
      receivableEntries: recv.length,
      payableEntries: pay.length,
      totalRevenue,
      recentTransactions: recentTxs.slice(0, 8),
      topDebtors,
      netReceivable: recvPending - payPending,
    };
  },
};
