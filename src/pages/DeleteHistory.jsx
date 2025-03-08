import React, { useEffect, useState } from "react";
import { db } from "../../firebaseConfig";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";

export const DeleteHistory = () => {
    const [deleteHistory, setDeleteHistory] = useState([]);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const delhistory = await getDocs(collection(db, "deleted_records"));
                const delList = delhistory.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setDeleteHistory(delList);
            } catch (error) {
                console.error("Error fetching deleted records:", error);
            }
        };

        fetchHistory();
    }, []);

    const deleteRecord = async (id, collectionName) => {
        try {
            await deleteDoc(doc(db, collectionName, id));
            setDeleteHistory(prevHistory => prevHistory.filter(item => item.id !== id));
        } catch (error) {
            console.error("Error deleting record:", error);
        }
    };

    return (
        <>
            <div className="m-8 uppercase font-bold text-center ">Delete History</div>
            {deleteHistory.length > 0 ? (
                deleteHistory.map((item) => (
                    <div 
                        key={item.id} 
                        className={`p-2 mb-2 flex justify-between border rounded ${item.totalAmount > 0 ? "bg-green-100" : "bg-red-100"}`}
                    >
                        <span>{item.quantity} kg</span>
                        <span>${item.rate} /kg</span>
                        <span>Total: ${item.totalAmount}</span>
                        <span>{item.timestamp?.toDate ? item.timestamp.toDate().toLocaleString() : "No timestamp"}</span>
                        {/* <button 
                            className="bg-red-500 text-white px-2 py-1 rounded" 
                            onClick={() => deleteRecord(item.id, item.totalAmount > 0 ? "purchases" : "sales")}
                        >
                            Delete
                        </button> */}
                    </div>
                ))
            ) : (
                <p>No deleted records found.</p>
            )}
        </>
    );
};
