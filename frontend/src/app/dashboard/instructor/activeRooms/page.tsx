"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

interface Room {
    id: string
    roomName: string
    totalTime: string
    totalQuestions: number
}

const ActiveRoomsPage: React.FC = () => {
    const [activeRooms, setActiveRooms] = useState<Room[]>([])
    const [scheduledRooms, setScheduledRooms] = useState<Room[]>([])
    const [view, setView] = useState<"active" | "scheduled">("active")
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    
    const checkAuth = async () => {
        try {
            const res = await fetch("http://localhost:6573/api/auth/instructor/check", {
                credentials: "include",
            })

            if (!res.ok) {
                toast.error("Please login as Instructor", { 
                    position: "top-center" 
                })
                router.push("/login/instructor")
            }
        } catch (err) {
            toast.error("Error checking authentication. Redirecting...", { 
                position: "top-center" 
            })
            router.push("/login/instructor")
        }
    }

    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const [activeResponse, scheduledResponse] = await Promise.all([
                    fetch("http://localhost:6573/api/room/get-active-rooms"),
                    fetch("http://localhost:6573/api/room/get-scheduled-rooms"),
                ])

                if (activeResponse.ok) {
                    const activeData = await activeResponse.json()
                    setActiveRooms(activeData.activeRooms || [])
                } else {
                    toast.error("Failed to fetch active rooms", { 
                        position: "top-center" 
                    })
                }

                if (scheduledResponse.ok) {
                    const scheduledData = await scheduledResponse.json()
                    setScheduledRooms(scheduledData.scheduledRooms || [])
                } else {
                    toast.error("Failed to fetch scheduled rooms", { 
                        position: "top-center" 
                    })
                }
            } catch (err) {
                toast.error("Error fetching rooms", { 
                    position: "top-center" 
                })
            }
        }

        const initialize = async () => {
            await checkAuth()
            await fetchRooms()
        }

        initialize()
    }, [])

    const activateRoom = async (roomId: string) => {
        setLoading(true)
        try {
            const response = await fetch(
                `http://localhost:6573/api/room/activate-room/${roomId}`,{ 
                    method: "POST" 
                }
            )

            if (response.ok) {
                toast.success("Room activated successfully", { 
                    position: "top-center" 
                })
                const updatedScheduledRooms = scheduledRooms.filter((room) => room.id !== roomId)
                setScheduledRooms(updatedScheduledRooms)
                const activatedRoom = scheduledRooms.find((room) => room.id === roomId)
                if (activatedRoom) setActiveRooms((prev) => [...prev, activatedRoom])
            } else {
                toast.error("Failed to activate room", { 
                    position: "top-center" 
                })
            }
        } catch (err) {
            toast.error("Error activating room", { 
                position: "top-center" 
            })
        } finally {
            setLoading(false)
        }
    }

    const renderRooms = (rooms: Room[], isScheduled: boolean = false) => {
        if (rooms.length === 0) {
            return <div className="text-center text-white text-2xl mt-20">No Rooms Available</div>
        }

        return (
            <div className="flex flex-wrap gap-4 mt-8 justify-center">
                {rooms.map((room) => (
                    <div
                        key={room.id}
                        className="bg-[#eab2bb] p-6 rounded-lg shadow-md w-80 text-[#00004d] relative"
                    >
                        <h2 className="font-bold text-xl text-center mb-4">{room.roomName}</h2>
                        <p>
                            <strong>Total Time:</strong> {room.totalTime} mins
                        </p>
                        <p>
                            <strong>Total Questions:</strong> {room.totalQuestions}
                        </p>
                        {isScheduled && (
                            <button
                                onClick={() => activateRoom(room.id)}
                                disabled={loading}
                                className="absolute top-2 right-4 text-xl font-bold text-black bg-transparent hover:scale-105 transition-transform"
                            >
                                Activate
                            </button>
                        )}
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="w-full h-screen bg-[#3c6ca8] p-6 custom-font-2">
            <ToastContainer position="top-center" autoClose={3000} />
            <div className="flex justify-center gap-8 text-white text-xl font-bold">
                <button
                    onClick={() => setView("active")}
                    className={`${view === "active" ? "underline" : ""} cursor-pointer`}
                >
                    Active Rooms
                </button>
                <button
                    onClick={() => setView("scheduled")}
                    className={`${view === "scheduled" ? "underline" : ""} cursor-pointer`}
                >
                    Scheduled Rooms
                </button>
            </div>
            {view === "active"
                ? renderRooms(activeRooms)
                : renderRooms(scheduledRooms, true)}
        </div>
    )
}

export default ActiveRoomsPage