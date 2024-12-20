"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface PastQuiz {
  id: String
  name: String
  attempted: number
  correct: number
  score: number
  rank: number
}

const PastRooms = () => {
  const [pastQuizzes, setPastQuizzes] = useState<PastQuiz[]>([])
  const router = useRouter()

  const checkAuth = async () => {
    try {
      const res = await fetch("http://localhost:6573/api/auth/student/check", {
        credentials: "include"
      })

      if (!res.ok) {
        alert("Please login")
        router.push("login/student")
      }
    } catch (err) {
      console.error("Error checking authentication: ", err)
      router.push("/login/student")
    }
  }

  const fethPastRooms = async () => {
    try {
      const res = await fetch("http://localhost:6573/api/room/get-past-rooms", {
        credentials: "include"
      })

      if (res.ok) {
        const data = await res.json()
        setPastQuizzes(data.pastRooms || [])
      } else {
        console.error("Failed to fetch past rooms")
        alert("Failed to fetch rooms")
      }
    } catch (err) {
      console.error("Error fetching roomd: ", err)
    }
  }

  useEffect(() => {
    const initialize = async () => {
      await checkAuth()
      await fethPastRooms()
    }

    initialize()
  }, [])

  return (
    <div className="w-full h-screen bg-[#3c6ca8] text-white p-8 custom-font-2">
      <h1 className="text-3xl font-bold mb-6">Past Quizzes</h1>

      {pastQuizzes.length === 0 ? (
        <div className="text-4xl font-bold text-center mt-20">No Past Quizzes</div>
      ) : (
        <div className="flex flex-wrap gap-4">
          {pastQuizzes.map((quiz) => (
            <div
              key={quiz.id as React.Key}
              className="flex flex-col bg-[#eab2bb] text-[#00004d] rounded-lg p-4 shadow-lg w-auto h-auto"
            >
              <h2 className="text-xl font-bold text-center mb-2">
                {quiz.name.toUpperCase()}
              </h2>
              <div className="text-sm font-semibold mb-2">
                <p>
                  <strong>QUESTIONS ATTEMPTED:</strong> {quiz.attempted}
                </p>
                <p>
                  <strong>CORRECT ANSWERS:</strong> {quiz.correct}
                </p>
                <p>
                  <strong>SCORE:</strong> {quiz.score}
                </p>
                <p>
                  <strong>RANK:</strong> {quiz.rank}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default PastRooms