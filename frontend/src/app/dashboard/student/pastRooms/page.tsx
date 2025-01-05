"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

interface PastQuiz {
  id: string
  name: string
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}auth/student/check`, {
        credentials: "include",
      })

      if (!res.ok) {
        toast.error("Please log in to continue", { 
          position: "top-center" 
        })
        router.push("/login/student")
      }
    } catch (err) {
      console.error("Error checking authentication: ", err)
      toast.error("An error occurred during authentication.", {
        position: "top-center",
      })
      router.push("/login/student")
    }
  }

  const fetchPastRooms = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}room/get-past-rooms`, {
        credentials: "include",
      })

      if (res.ok) {
        const data = await res.json()
        setPastQuizzes(data.pastRooms || [])
        toast.success("Past quizzes fetched successfully!", {
          position: "top-center",
        })
      } else {
        toast.error("Failed to fetch past quizzes", { 
          position: "top-center" 
        })
        console.error("Failed to fetch past rooms")
      }
    } catch (err) {
      console.error("Error fetching rooms: ", err)
      toast.error("An error occurred while fetching past quizzes.", {
        position: "top-center",
      })
    }
  }

  useEffect(() => {
    const initialize = async () => {
      await checkAuth()
      await fetchPastRooms()
    }

    initialize()
  }, [])

  return (
    <div className="w-full h-screen bg-[#3c6ca8] text-white p-8 custom-font-2">
      <ToastContainer position="top-center" autoClose={3000} />
      <h1 className="text-3xl font-bold mb-6">Past Quizzes</h1>

      {pastQuizzes.length === 0 ? (
        <div className="text-4xl font-bold text-center mt-20">No Past Quizzes</div>
      ) : (
        <div className="flex flex-wrap gap-4">
          {pastQuizzes.map((quiz) => (
            <div
              key={quiz.id}
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