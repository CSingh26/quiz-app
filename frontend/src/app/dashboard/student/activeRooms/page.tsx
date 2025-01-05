"use client"

import { useRouter } from "next/navigation"
import React, { useState, useEffect } from "react"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

interface Room {
  id: string
  roomName: string
  totalQuestions: number
  timeLeft: string
}

const ActiveRooms = () => {
  const [rooms, setRooms] = useState<Room[]>([])
  const [inputRoomCode, setInputRoomCode] = useState<string>("")
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const router = useRouter()

  const checkAuth = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}auth/student/check`, {
        credentials: "include",
      })

      if (!res.ok) {
        toast.error("Please login to continue", { 
          position: "top-center" 
        })
        router.push("/login/student")
      }
    } catch (err) {
      console.error("Error checking authentication", err)
      toast.error("Error during authentication. Please try again.", {
        position: "top-center",
      })
      router.push("/login/student")
    }
  }

  const fetchActiveRooms = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}room/get-active-rooms`, {
        credentials: "include",
      })

      if (res.ok) {
        const data = await res.json()
        setRooms(data.activeRooms || [])
        toast.success("Active rooms fetched successfully!", { 
          position: "top-center" 
        })
      } else {
        toast.error("Failed to fetch active rooms", { 
          position: "top-center" 
        })
        console.error("Failed to fetch active rooms")
      }
    } catch (err) {
      console.error("Error fetching active rooms: ", err)
      toast.error("An error occurred while fetching active rooms.", {
        position: "top-center",
      })
    }
  }

  const verifyRoomCode = async (roomId: String) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}room/verify-room-code`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomId,
          roomCode: inputRoomCode,
        }),
      })

      if (res.ok) {
        toast.success("Room code verified successfully!", { 
          position: "top-center" 
        })
        router.push(`/quiz/${inputRoomCode}`)
      } else {
        toast.error("Invalid Room Code. Please try again.", { 
          position: "top-center" 
        })
      }
    } catch (err) {
      console.error("Error verifying the room code:", err)
      toast.error("Failed to verify room code. Please try again.", {
        position: "top-center",
      })
    }
  }

  useEffect(() => {
    const initialize = async () => {
      await checkAuth()
      await fetchActiveRooms()
    }

    initialize()
  }, [])

  return (
    <div className="w-full h-screen bg-[#3c6ca8] text-white p-4 custom-font-2">
      <ToastContainer position="top-center" autoClose={3000} />
      <h1 className="text-3xl font-bold mb-6">Active Quizzes</h1>
      {rooms.length === 0 ? (
        <div className="text-4xl font-bold text-center mt-20">No Rooms Active</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="flex flex-col bg-[#eab2bb] text-[#00004d] rounded-lg p-4 shadow-lg w-auto h-auto"
            >
              <h2 className="text-xl font-bold text-center mb-2">
                {room.roomName}
              </h2>
              <div className="text-sm font-semibold mb-2">
                <p>TOTAL TIME: {room.timeLeft} MINS</p>
                <p>TOTAL QUESTIONS: {room.totalQuestions}</p>
              </div>
              {selectedRoomId === room.id && (
                <div className="mb-2">
                  <input
                    type="text"
                    placeholder="Enter Room Code"
                    value={inputRoomCode}
                    onChange={(e) => setInputRoomCode(e.target.value)}
                    className="w-full p-2 border-2 border-[#00004d] mb-2"
                  />
                  <button
                    onClick={() => verifyRoomCode(room.id)}
                    className="px-4 py-2 bg-white text-[#00004d] rounded-lg font-bold hover:scale-105 transition-transform"
                  >
                    VERIFY ROOM CODE
                  </button>
                </div>
              )}
              <div className="flex justify-center mt-2">
                <button
                  onClick={() => setSelectedRoomId(room.id)}
                  className="px-4 py-2 bg-white text-[#00004d] rounded-lg font-bold hover:scale-105 transition-transform"
                >
                  START QUIZ
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ActiveRooms