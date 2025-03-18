import React from 'react'
import { Link } from 'react-router'

export const NavBar = () => {
    return (
        <div className='bg-blue-400 rounded-[5px] p-4 flex mb-10 ' >
            {/* <h1>Stock Management System</h1> */}
            <ul className='flex justify-evenly w-full'>
                <Link to="/home"><li className='text-white font-bold cursor-pointer '>Home</li></Link>
                <Link to="/deletehistory"><li className='text-white font-bold cursor-pointer '>Delete History</li></Link>
                <Link to="/details"><li className='text-white font-bold cursor-pointer '>Customers</li></Link>
                <Link to="/addRecord"><li className='text-white font-bold cursor-pointer '>Add customerRecord</li></Link>
                <Link to="/inventoryItem"><li className='text-white font-bold cursor-pointer '>Item in the inventory</li></Link>
            
            </ul>
        </div>
    )
}
