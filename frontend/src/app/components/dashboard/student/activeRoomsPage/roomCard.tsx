"use client"

import React, { useState, useEffect } from "react"

interface Room {
  id: string
  roomName: string
  totalQuestions: number
  totalTime: number 
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
  totalTime, 
  inputRoomCode,
  setInputRoomCode,
  selectedRoomId,
  setSelectedRoomId,
  verifyRoomCode,
}: Room) => {
  const [timeLeft, setTimeLeft] = useState<number>(totalTime)

  useEffect(() => {
    if (timeLeft > 0) {
      const interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1) 
      }, 1000)

      return () => clearInterval(interval) 
    }
  }, [timeLeft]) 

  useEffect(() => {
    if (timeLeft < 0) {
      setTimeLeft(0)
    }
  }, [timeLeft])

  return (
    <div className="flex flex-col bg-[#eab2bb] text-[#00004d] rounded-lg p-4 shadow-lg w-auto h-auto">
      <h2 className="text-xl font-bold text-center mb-2">{roomName}</h2>
      <div className="text-sm font-semibold mb-2">
        <p>
          <strong>TIME LEFT:</strong> {timeLeft > 0 ? `${timeLeft} MINS` : "TIME UP"}
        </p>
        <p>
          <strong>TOTAL QUESTIONS:</strong> {totalQuestions}
        </p>
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
}

export default RoomCard