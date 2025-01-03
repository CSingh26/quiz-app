"use client"

import { useRouter } from "next/navigation"
import React, { useEffect, useState} from "react"

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
          const res = await fetch("http://localhost:6573/api/auth/instructor/check", {
            credentials: "include",
          })
    
          if (!res.ok) {
            alert("Please login as Instructor")
            router.push("/login/instructor")
          }
        } catch (err) {
          console.error("Error checking authentication", err)
          router.push("/login/instructor")
        }
      }

    useEffect(() => {
        const fetchPastRooms = async () => {
            try {
                const resposne = await fetch("http://localhost:6573/api/room/get-past-room-ins")

                if (resposne.ok) {
                    const data = await resposne.json()
                    const formattedRooms = data.pastRooms.map((room: any) => ({
                        name: room.roomName,
                        moduleName: room.moduleName,
                        maxScore: room.maxScore,
                        meanScore: room.meanScore,
                        minScore: room.minScore
                    }))
                    setPastRooms(formattedRooms)
                } else {
                    console.error("Failed to fetch past rooms")
                }
            } catch (err) {
                console.error("Failed to fetch past rooms", err)
            } finally {
                setLoading(false)
            }
        }

        const initialize = async () => {
            await checkAuth()
            await fetchPastRooms()
        }

        initialize()
    }, [])

  return (
    <div className="flex w-full h-screen bg-[#3c6ca8] p-8 text-white custom-font-2">
        {loading ? (
            <p className="text-xl font-bold">Loading...</p>
        ): pastRooms.length === 0 ? (
            <div className="flex justify-center items-center w-full h-full">
                <p className="text-xl font-bold">No Past Rooms available</p>
            </div>
        ) : (
            <div className="flex flex-wrap gap-9 justify-start items-start w-full">
                {pastRooms.map((room, index) => (
                    <div
                        key={index}
                        className="p-8 bg-[#eab2bb] text-[#00004d] rounded-xl shawdow-lg w-auto h-auto flex-col justify-center items-start"
                    >
                        <h2 className="text-xl font-bold mb-4">{room.name}</h2>
                        <p className="text-sm">
                            <strong>Test Module:</strong> {room.moduleName}
                        </p>
                        <p className="text-sm">
                            <strong>Max Score:</strong> {room.maxScore}
                        </p>
                        <p className="text-sm">
                            <strong>Mean Score:</strong> {room.meanScore}
                        </p>
                        <p className="text-sm">
                            <strong>Min Score:</strong> {room.minScore}
                        </p>
                    </div>
                ))}
            </div>
        )}
    </div>
  )
}

export default PastRoomPage