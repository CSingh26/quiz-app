"use client"

import React from "react"

const ActiveRooms = () => {
    const handleJoinRoom = () => {

    }

    return (
        <div className="text-white">
            <h1 className="text-4xl font-bold mb-4">Active Rooms</h1>
            <p>Click to join:</p>
            <div className="mt-4">
                <input 
                    type="text"
                    placeholder="Enter Room ID"
                    className="px-4 py-2 rounded-lg"
                />
                <button 
                    className="ml-2 px-4 py-2 bg-white text-[#00004d] rounded-lg hover:scale-105"
                >
                    Join Room
                </button>
            </div>
        </div>
    )
}

export default ActiveRooms