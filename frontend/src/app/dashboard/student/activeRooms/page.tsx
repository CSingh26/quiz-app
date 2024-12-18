"use client"

import React, { useState, useEffect } from "react"

interface Room {
  id: string
  name: string
  totalTime: number
  totalQuestions: number
}

const ActiveRooms = () => {
  const [rooms, setRooms] = useState<Room[]>([])

  useEffect(() => {
    // Simulating fetched data
    const data = [
      { id: "1", name: "Quiz 1", totalTime: 60, totalQuestions: 50 },
      { id: "2", name: "Math Challenge", totalTime: 30, totalQuestions: 20 },
    ]
    setRooms(data)
  }, [])

  return (
    <div className="w-full h-screen bg-[#3c6ca8] text-white p-4 custom-font-2">
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
                {room.name.toUpperCase()}
              </h2>
              <div className="text-sm font-semibold mb-2">
                <p>TOTAL TIME: {room.totalTime} MINS</p>
                <p>TOTAL QUESTIONS: {room.totalQuestions}</p>
              </div>
              <div className="flex justify-center mt-2">
                <button
                  onClick={() => alert(`Starting ${room.name}`)}
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