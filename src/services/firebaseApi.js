/**
 * Firebase API - Central service for all Firestore & Auth operations.
 * Collections: customers, customerRecord, inventory, deleted_records,
 *   users, payroll, reviews, audit_logs
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

  listenByAdmin: (adminId, callback) => {
    const q = query(
      collection(db, "customers"),
      where("adminId", "==", adminId)
    );
    return onSnapshot(q, (snap) => {
      const customers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(customers);
    });
  },

  resetAllBalancesByAdmin: async (adminId) => {
    const q = query(
      collection(db, "customers"),
      where("adminId", "==", adminId)
    );
    const snap = await getDocs(q);
    const batchSize = 500;
    const docs = snap.docs;
    
    for (let i = 0; i < docs.length; i += batchSize) {
      const chunk = docs.slice(i, i + batchSize);
      await Promise.all(chunk.map(d => updateDoc(d.ref, { balance: 0, updatedAt: new Date() })));
    }
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

  listenByCustomerAndAdmin: (customerId, adminId, callback) => {
    const q = query(
      collection(db, "customerRecord"),
      where("customer_id", "==", customerId),
      where("admin_id", "==", adminId),
      orderBy("created_at", "asc")
    );
    return onSnapshot(q, (snap) => {
      const records = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(records);
    });
  },
  
  listenByAdmin: (adminId, callback) => {
    const q = query(
      collection(db, "customerRecord"),
      where("admin_id", "==", adminId),
      orderBy("created_at", "asc")
    );
    return onSnapshot(q, (snap) => {
      const records = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(records);
    });
  },

  deleteMultiple: async (recordIds) => {
    await Promise.all(recordIds.map(id => deleteDoc(doc(db, "customerRecord", id))));
  },

  deleteAllByAdmin: async (adminId) => {
    const q = query(
      collection(db, "customerRecord"),
      where("admin_id", "==", adminId)
    );
    const snap = await getDocs(q);
    const batchSize = 500;
    const docs = snap.docs;
    
    for (let i = 0; i < docs.length; i += batchSize) {
      const chunk = docs.slice(i, i + batchSize);
      await Promise.all(chunk.map(d => deleteDoc(d.ref)));
    }
  }
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

  listenByAdmin: (adminId, callback) => {
    const q = query(
      collection(db, "inventory"),
      where("adminId", "==", adminId)
    );
    return onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
          price: data.price != null ? Number(data.price) : 0,
        };
      });
      callback(items);
    });
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
    const [customers, inventory, payroll] = await Promise.all([
      customersApi.getByAdmin(adminId),
      inventoryApi.getByAdmin(adminId),
      payrollApi.getByAdmin(adminId),
    ]);

    let totalBalances = 0;
    let totalRevenue = 0;
    const recentTxs = [];
    const customerBalances = [];

    for (const c of customers) {
      const recs = await customerRecordsApi.getByCustomerAndAdmin(c.id, adminId);
      // Modern loan calculation: send vs receive
      const custBalance = recs.reduce((s, r) => s + (r.type === "product_send" || r.type === "send" || r.type === "purchase" ? (r.total_amount || r.amount || 0) : -(r.amount || 0)), 0);
      totalBalances += custBalance;
      customerBalances.push({ id: c.id, name: c.name, balance: custBalance });

      for (const r of recs) {
        const date = r.created_at?.toDate ? r.created_at.toDate() : new Date(r.created_at || Date.now());
        if (r.type === "receive" || r.type === "payment" || r.type === "payment_receive") {
          totalRevenue += Number(r.amount || 0);
        }
        recentTxs.push({ date, type: r.type, customer: c.name, amount: Number(r.type === "purchase" || r.type === "send" || r.type === "product_send" ? (r.total_amount || r.amount || 0) : r.amount || 0) });
      }
    }

    recentTxs.sort((a, b) => b.date - a.date);

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
      receivablePending: 0,
      payablePending: 0,
      receivableEntries: 0,
      payableEntries: 0,
      totalRevenue,
      recentTransactions: recentTxs.slice(0, 8),
      topDebtors,
      netReceivable: 0,
    };
  },
};
