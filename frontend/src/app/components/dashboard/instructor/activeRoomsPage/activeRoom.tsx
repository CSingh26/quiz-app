"use client"

import React from "react"
import { Room } from "./roomInterface"

interface ActiveRoomsProps {
    rooms: Room[]
}

const ActiveRooms: React.FC<ActiveRoomsProps> = ({ rooms }) => {
    if (rooms.length === 0) {
      return <div className="text-center text-white text-2xl mt-20">No Active Rooms</div>
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
          </div>
        ))}
      </div>
    )
}
  
export default ActiveRooms