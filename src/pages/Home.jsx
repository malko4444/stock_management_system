import React from "react";
import AddTheCustomer from "../components/AddTheCustomer";
import InventoryProducts from "../components/InventoryProducts";
import { NavBar } from "../components/NavBar";

const Home = () => {
    

    return (
        <>
        <NavBar/>
        <div className="p-5 flex flex-col items-center gap-10">
            
            <h1 className="text-2xl font-bold uppercase ">Plastic Factory Management</h1>
                       
            <AddTheCustomer/>
            <InventoryProducts/>
        </div></>
    );
};

export default Home;
