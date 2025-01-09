"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import {
  fetchPastRooms,
  checkAuth,
} from "../../../components/dashboard/student/Functions/pastRoomsFunctions"
import PastRoomCard from "../../../components/dashboard/student/pastRoomsPage/pastRoomCard"
import { PastQuiz } from "@/app/components/dashboard/student/pastRoomsPage/roomInterface"

const PastRooms = () => {
  const [pastQuizzes, setPastQuizzes] = useState<PastQuiz[]>([])
  const router = useRouter()

  useEffect(() => {
    const initialize = async () => {
      await checkAuth(toast, router)
      await fetchPastRooms(setPastQuizzes, toast)
    }

    initialize()
  }, [])

  console.log("Past Quizzes: ", pastQuizzes) // Debugging

  return (
    <div className="w-full h-screen bg-[#3c6ca8] text-white p-8 custom-font-2">
      <ToastContainer position="top-center" autoClose={3000} />
      <h1 className="text-3xl font-bold mb-6">Past Quizzes</h1>

      {pastQuizzes.length === 0 ? (
        <div className="text-4xl font-bold text-center mt-20">No Past Quizzes</div>
      ) : (
        <div className="flex flex-wrap gap-4">
          {pastQuizzes.map((quiz, index) => (
            <PastRoomCard
              key={quiz.id || `${quiz.roomName}-${index}`} 
              quiz={quiz}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default PastRooms