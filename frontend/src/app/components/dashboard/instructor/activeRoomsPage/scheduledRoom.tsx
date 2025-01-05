"use client"

import React from "react"
import { Room } from "./roomInterface"
import { activateRoom } from "../Functions/activeRoomsFunctions"

interface ScheduledRoomsProps {
    rooms: Room[]
    setActiveRooms: React.Dispatch<React.SetStateAction<Room[]>>
    setScheduledRooms: React.Dispatch<React.SetStateAction<Room[]>>
  }
  
const ScheduledRooms: React.FC<ScheduledRoomsProps> = ({
    rooms,
    setActiveRooms,
    setScheduledRooms,
  }) => {
    const handleActivateRoom = async (roomId: string) => {
      await activateRoom(roomId, rooms, setScheduledRooms, setActiveRooms)
    }
  
    if (rooms.length === 0) {
      return <div className="text-center text-white text-2xl mt-20">No Scheduled Rooms</div>
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
            <button
              onClick={() => handleActivateRoom(room.id)}
              className="absolute top-2 right-4 text-xl font-bold text-black bg-transparent hover:scale-105 transition-transform"
            >
              Activate
            </button>
          </div>
        ))}
      </div>
    )
}
  
export default ScheduledRooms