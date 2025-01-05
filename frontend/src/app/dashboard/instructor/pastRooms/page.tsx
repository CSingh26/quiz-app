"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import PastRoomCard from "../../../components/dashboard/instructor/pastRoomsPage/pastRoomCard"
import { fetchPastRooms } from "../../../components/dashboard/instructor/Functions/pastRoomsFunctions"

interface Room {
  name: string
  moduleName: string
  maxScore: number
  meanScore: number
  minScore: number
}

const PastRoomPage: React.FC = () => {
  const [pastRooms, setPastRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const router = useRouter()

  const checkAuth = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}auth/ins/check`, {
        credentials: "include",
      })

      if (!res.ok) {
        toast.error("Please login as Instructor", { position: "top-center" })
        router.push("/login/instructor")
      }
    } catch (err) {
      console.error("Error checking authentication:", err)
      toast.error("Error checking authentication. Redirecting...", { position: "top-center" })
      router.push("/login/instructor")
    }
  }

  useEffect(() => {
    const initialize = async () => {
      await checkAuth()
      await fetchPastRooms(setPastRooms, setLoading)
    }

    initialize()
  }, [router])

  if (loading) {
    return (
      <div className="flex justify-center items-center w-full h-screen bg-[#3c6ca8] text-white">
        <p className="text-xl font-bold">Loading...</p>
      </div>
    )
  }

  if (pastRooms.length === 0) {
    return (
      <div className="flex justify-center items-center w-full h-screen bg-[#3c6ca8] text-white">
        <p className="text-xl font-bold">No Past Rooms available</p>
      </div>
    )
  }

  return (
    <div className="flex w-full h-screen bg-[#3c6ca8] p-8 text-white custom-font-2">
      <ToastContainer position="top-center" autoClose={3000} />
      <div className="flex flex-wrap gap-9 justify-start items-start w-full">
        {pastRooms.map((room, index) => (
          <PastRoomCard key={index} {...room} />
        ))}
      </div>
    </div>
  )
}

export default PastRoomPage