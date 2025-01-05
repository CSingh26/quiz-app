"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Room } from "../../../components/dashboard/instructor/activeRoomsPage/roomInterface"
import { fetchRooms } from "../../../components/dashboard/instructor/Functions/activeRoomsFunctions"
import ActiveRooms from "../../../components/dashboard/instructor/activeRoomsPage/activeRoom"
import ScheduledRooms from "../../../components/dashboard/instructor/activeRoomsPage/scheduledRoom"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

const ActiveRoomPage: React.FC = () => {
  const [activeRooms, setActiveRooms] = useState<Room[]>([])
  const [scheduledRooms, setScheduledRooms] = useState<Room[]>([])
  const [view, setView] = useState<"active" | "scheduled">("active")
  const router = useRouter()

  useEffect(() => {
    const initialize = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}auth/ins/check`, {
          credentials: "include",
        })

        if (!res.ok) {
          toast.error("Please login as Instructor", { position: "top-center" })
          router.push("/login/instructor")
          return
        }

        await fetchRooms(setActiveRooms, setScheduledRooms, toast)
      } catch (err) {
        console.error("Error during initialization:", err)
        toast.error("An unexpected error occurred.", { 
            position: "top-center" 
        })
      }
    }

    initialize()
  }, [router])

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

      {view === "active" ? (
        <ActiveRooms rooms={activeRooms} />
      ) : (
        <ScheduledRooms
          rooms={scheduledRooms}
          setActiveRooms={setActiveRooms}
          setScheduledRooms={setScheduledRooms}
        />
      )}
    </div>
  )
}

export default ActiveRoomPage