"use client"

import React, { useState, useEffect } from 'react'

interface Room {
    id: string
    name: string
    totalTime: string
    totalQuestions: number
}

const ActiveRoomsPage: React.FC = () => {
    const [activeRooms, setActiveRooms] = useState<Room[]>([])
    const [scheduledRooms, setScheduledRooms] = useState<Room[]>([])
    const [view, setView] = useState<"active" | "scheduled">("active")
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const fetchActiveRooms = async () => {
            try {
                const response = await fetch("http://localhost:6573/api/rooms/get-active-rooms")
                if (response.ok) {
                    const data = await response.json()
                    setActiveRooms(data.rooms || [])
                } else {
                    console.error("Failed to fetch active rooms")
                }
            } catch (err) {
                console.error("Error fetching active rooms", err)
            }
        }

        const fetchScheduledRooms = async () => {
            try {
                const response = await fetch("http://localhost:6573/api/rooms/get-scheduled-rooms")
                if (response.ok) {
                    const data = await response.json()
                    setScheduledRooms(data.rooms || [])
                } else {
                    console.error("Failed to fetch scheduled rooms")
                }
            } catch (err) {
                console.error("Error fetching scheduled rooms", err)
            }
        }

        fetchActiveRooms()
        fetchScheduledRooms()
    }, [])

    const activateRoom = async (roomId: string) => {
        setLoading(true)
        try {
            const response = await fetch(
                `http://localhost:6573/api/rooms/activate/${roomId}`, {
                    method: "POST"
                }
            )

            if (response.ok) {
                alert("Room Activated successfully")

                const updatedSchduledRooms = scheduledRooms.filter(
                    (room) => room.id !== roomId
                )

                setScheduledRooms(updatedSchduledRooms)
                const newActiveRoom = scheduledRooms.find((room) => room.id === roomId)
                if (newActiveRoom) setActiveRooms([...activeRooms, newActiveRoom])
            }
        } catch (err) {
            
        }
    }

    const renderRooms = (rooms: Room[], isScheduled: boolean = false) => {
        if (rooms.length === 0) {
            return (
                <div className='text-center text-white text-2xl mt-20'>
                    No Rooms Available
                </div>
            )
        }

        return (
            <div className='flex flex-wrap gap-4 mt-8'>
                {rooms.map((room) => (
                    <div 
                        key={room.id} 
                        className='bg-[#eab2bb] p-6 rounded-lg shaaow-md w-80 text-[#00004d] relative'
                    >
                        <h2 className='font-bold text-xl text-center mb-4'>
                            {room.name.toUpperCase()}
                        </h2>
                        <p>
                            <strong>Total Time:</strong> {room.totalTime} mins
                        </p>
                        <p>
                            <strong>Total Questions:</strong> {room.totalQuestions}
                        </p>
                        {isScheduled && (
                            <button
                                onClick={() => activateRoom(room.id)}
                                className='absolute top-2 right-4 text-xl font-bold text-black bg-transparent hover:scale-105 transition-transform'
                            >
                                ...
                            </button>
                        )}
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className='w-full h-screen bg-[#3c6ca8] p-6'>
            <div className='flex justify-center gap-8 text-white text-xl font-bold'>
                <button
                    onClick={() => setView("active")}
                    className={`${
                        view === "active" ? "underline" : ""
                    } cursor-pointer`}
                >
                    Active Rooms
                </button>
                <button
                    onClick={() => setView("scheduled")}
                    className={`${
                        view === "scheduled" ? "underline" : ""
                        } cursor-pointer`}
                >
                    Scheduled Rooms
                </button>
                {view === "active"
                    ? renderRooms(activeRooms)
                    : renderRooms(scheduledRooms, true)
                }
            </div>
        </div>
    )
}

export default ActiveRoomsPage