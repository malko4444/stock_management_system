import React from 'react'
import { Link } from 'react-router'

export const NavBar = () => {
    return (
        <div className='bg-blue-400 rounded-[5px] p-4 flex mb-10 ' >
            {/* <h1>Stock Management System</h1> */}
            <ul className='flex justify-evenly w-full'>
                <Link to="/"><li className='text-white font-bold cursor-pointer '>Home</li></Link>
                <Link to="/deletehistory"><li className='text-white font-bold cursor-pointer '>Delete History</li></Link>
            </ul>
        </div>
    )
}
