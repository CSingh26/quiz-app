"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface ActiveRoom {
    id: string,
    roomCode: string,
    roonName: string,
    startTime: string
}

export default function StudentDashboard() {
    const router = useRouter()
    const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([])
    const [error, setError] = useState("")

    const handleLogout = () => {
        document.cookie = "token=; Max-Age=0; path=/;"
        router.push("/login/student")
    }

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await fetch("http://localhost:6573/api/auth/student/check", {
                    credentials: "include"
                })

                if (!res.ok) {
                    router.push("/login/student")
                    alert("Please Login")
                }
            } catch (err) {
                console.error("Authentication Error", err)
                router.push("/login/student")
            }
        }

        const fetchActiveRooms = async () => {
            try {
                const res = await fetch("http://localhost:6573/api/room/get-active-rooms", {
                    credentials: "include"
                })

                const data = await res.json()

                if (res.ok) {
                    setActiveRooms(data.activeRooms)
                } else {
                    setError(data.message || "Failed to fetch active rooms")
                }
            } catch (err) {
                console.error("Error fetching active rooms:", err)
                setError("An error occured while fetching active rooms")
            }
        }
        checkAuth()
        fetchActiveRooms()
    }, [router])

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <h1 className="text-3xl font-bold mb-4">Student Dashboard</h1>
            {error && <p className="text-red-500">{error}</p>}
            <div className="w-full max-x-lg bg-white p-6 rounded shadow">
                {activeRooms.length > 0 ? (
                    activeRooms.map((room) => (
                        <div key={room.id} className="mb-4 p-4 border rounded shawdow">
                            <h2 className="text-lg font-bold">{room.roonName}</h2>
                            <p className="text-gray-500">
                                Strat Time: {new Date(room.startTime).toLocaleString()}
                            </p>
                            <button
                                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                onClick={() => router.push(`/quiz/${room.roomCode}`)}
                            >
                                Join Quiz
                            </button>
                        </div>
                    ))
                ) : (
                    <p className="text-gray-500">No active rooms available at the moment.</p>
                )}
            </div>
            <button
                className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                onClick={handleLogout}
            >
                Logout
            </button>
        </div>
    )
}