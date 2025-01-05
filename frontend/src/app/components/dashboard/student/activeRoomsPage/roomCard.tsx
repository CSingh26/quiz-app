"use client"

import React from "react"

interface Room {
  id: string
  roomName: string
  totalQuestions: number
  timeLeft: string
  inputRoomCode: string
  setInputRoomCode: (value: string) => void
  selectedRoomId: string | null
  setSelectedRoomId: (id: string | null) => void
  verifyRoomCode: (roomId: string) => Promise<void>
}

const RoomCard = ({
  id,
  roomName,
  totalQuestions,
  timeLeft,
  inputRoomCode,
  setInputRoomCode,
  selectedRoomId,
  setSelectedRoomId,
  verifyRoomCode,
}: Room) => (
  <div className="flex flex-col bg-[#eab2bb] text-[#00004d] rounded-lg p-4 shadow-lg w-auto h-auto">
    <h2 className="text-xl font-bold text-center mb-2">{roomName}</h2>
    <div className="text-sm font-semibold mb-2">
      <p>TOTAL TIME: {timeLeft} MINS</p>
      <p>TOTAL QUESTIONS: {totalQuestions}</p>
    </div>
    {selectedRoomId === id && (
      <div className="mb-2">
        <input
          type="text"
          placeholder="Enter Room Code"
          value={inputRoomCode}
          onChange={(e) => setInputRoomCode(e.target.value)}
          className="w-full p-2 border-2 border-[#00004d] mb-2"
        />
        <button
          onClick={() => verifyRoomCode(id)}
          className="px-4 py-2 bg-white text-[#00004d] rounded-lg font-bold hover:scale-105 transition-transform"
        >
          VERIFY ROOM CODE
        </button>
      </div>
    )}
    <div className="flex justify-center mt-2">
      <button
        onClick={() => setSelectedRoomId(id)}
        className="px-4 py-2 bg-white text-[#00004d] rounded-lg font-bold hover:scale-105 transition-transform"
      >
        START QUIZ
      </button>
    </div>
  </div>
)

export default RoomCard