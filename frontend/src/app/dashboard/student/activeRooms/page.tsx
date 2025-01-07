"use client"

import React, { useState, useEffect } from "react"
import { ToastContainer, toast } from "react-toastify"
import { useRouter } from "next/navigation"
import RoomCard from "../../../components/dashboard/student/activeRoomsPage/roomCard"
import NoActiveRooms from "../../../components/dashboard/student/activeRoomsPage/noActiveRooms"
import { 
    checkAuth, 
    fetchActiveRooms, 
    verifyRoomCode 
} from "../../../components/dashboard/student/Functions/activeRoomsFunctions"
import { Room } from "@/app/components/dashboard/student/activeRoomsPage/roomInterface"
import "react-toastify/dist/ReactToastify.css"

const ActiveRoomPage = () => {
  const [rooms, setRooms] = useState<Room[]>([])
  const [inputRoomCode, setInputRoomCode] = useState("")
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const initialize = async () => {
      await fetchActiveRooms(setRooms, toast)
    }

    initialize()
  }, [])

  return (
    <div className="w-full h-screen bg-[#3c6ca8] text-white p-4 custom-font-2">
      <ToastContainer position="top-center" autoClose={3000} />
      <h1 className="text-3xl font-bold mb-6">Active Quizzes</h1>
      {rooms.length === 0 ? (
        <NoActiveRooms />
      ) : (
        <div className="flex flex-wrap gap-2">
          {rooms.map((room: any) => (
            <RoomCard
              key={room.id}
              {...room}
              inputRoomCode={inputRoomCode}
              setInputRoomCode={setInputRoomCode}
              selectedRoomId={selectedRoomId}
              setSelectedRoomId={setSelectedRoomId}
              verifyRoomCode={(roomId: string) => verifyRoomCode(roomId, inputRoomCode, toast, router)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default ActiveRoomPage