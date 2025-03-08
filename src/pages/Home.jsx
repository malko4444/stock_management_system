import React, { useState, useEffect } from "react";
import { db } from "../../firebaseConfig";
import { collection, addDoc, getDocs, doc, deleteDoc } from "firebase/firestore";

const Home = () => {
    const [purchases, setPurchases] = useState([]);
    const [sales, setSales] = useState([]);
    const [stock, setStock] = useState(0);
    const [purchaseData, setPurchaseData] = useState({ quantity: "", rate: "" });
    const [saleData, setSaleData] = useState({ quantity: "", rate: "" });

    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = async () => {
        const purchaseSnapshot = await getDocs(collection(db, "purchases"));
        const saleSnapshot = await getDocs(collection(db, "sales"));

        const purchaseList = purchaseSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const saleList = saleSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        setPurchases(purchaseList);
        setSales(saleList);

        const totalPurchased = purchaseList.reduce((acc, item) => acc + Number(item.quantity), 0);
        const totalSold = saleList.reduce((acc, item) => acc + Number(item.quantity), 0);
        setStock(totalPurchased - totalSold);
    };

    const addPurchase = async () => {
        const totalAmount = purchaseData.quantity * purchaseData.rate;
        const newPurchase = { ...purchaseData, totalAmount, timestamp: new Date().toISOString() };
        await addDoc(collection(db, "purchases"), newPurchase);
        fetchRecords();
    };

    const addSale = async () => {
        const totalAmount = saleData.quantity * saleData.rate;
        const newSale = { ...saleData, totalAmount, timestamp: new Date().toISOString() };
        await addDoc(collection(db, "sales"), newSale);
        fetchRecords();
    };

    const deleteRecord = async (id, type, data) => {
        await addDoc(collection(db, "deleted_records"), data);
        await deleteDoc(doc(db, type, id));
        fetchRecords();
    };

    return (
        <div className="p-5 flex flex-col items-center gap-10">
            <h1 className="text-2xl font-bold uppercase ">Plastic Factory Management</h1>
            <div className="h-20 w-60 bg-green-400 rounded-xl flex items-center justify-center ">
                <h2 className="text-xl font-bold uppercase text-white"> Current Stock:  {stock} kg</h2>
            </div>  

            <div className="mt-5">
                <h3 className="text-lg font-semibold">Add Purchase</h3>
                <input type="number" placeholder="Quantity (kg)" className="border p-2" onChange={e => setPurchaseData({ ...purchaseData, quantity: e.target.value })} />
                <input type="number" placeholder="Rate per kg ($)" className="border p-2 ml-2" onChange={e => setPurchaseData({ ...purchaseData, rate: e.target.value })} />
                <button className="bg-blue-500 text-white px-4 py-2 ml-2" onClick={addPurchase}>Add</button>
            </div>

            <div className="mt-5">
                <h3 className="text-lg font-semibold">Add Sale</h3>
                <input type="number" placeholder="Quantity (kg)" className="border p-2" onChange={e => setSaleData({ ...saleData, quantity: e.target.value })} />
                <input type="number" placeholder="Rate per kg ($)" className="border p-2 ml-2" onChange={e => setSaleData({ ...saleData, rate: e.target.value })} />
                <button className="bg-green-500 text-white px-4 py-2 ml-2" onClick={addSale}>Add</button>
            </div>

            <h3 className="text-lg font-semibold mt-5">Transaction History</h3>
            <div className="mt-3">
                {[...purchases, ...sales].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map((item, index) => (
                    <div key={index} className={`p-2 mb-2 flex justify-between border rounded ${item.totalAmount > 0 ? "bg-green-100" : "bg-red-100"}`}>
                        <span>{item.quantity} kg</span>
                        <span>${item.rate} /kg</span>
                        <span>Total: ${item.totalAmount}</span>
                        <span>{new Date(item.timestamp).toLocaleString()}</span>
                        <button className="bg-red-500 text-white px-2 py-1 rounded" onClick={() => deleteRecord(item.id, item.totalAmount > 0 ? "purchases" : "sales", item)}>Delete</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Home;
