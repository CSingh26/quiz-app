"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import CreateRoomForm from "../../../components/dashboard/instructor/roomManagementPage/creareRoomForm"
import { 
  fetchTestModules, 
  createRoom 
} from "../../../components/dashboard/instructor/Functions/roomManagementFunctions"

const CreateRoomPage: React.FC = () => {
  const [formData, setFormData] = useState({
    roomName: "",
    roomCode: "",
    startDate: "",
    startTime: "",
    endTime: "",
    testModule: "",
  })
  const [testModules, setTestModules] = useState<{ name: string; id: string }[]>([])
  const [loading, setLoading] = useState(false)
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
      toast.error("Authentication error. Redirecting to login.", { position: "top-center" })
      router.push("/login/instructor")
    }
  }

  useEffect(() => {
    const initialize = async () => {
      await checkAuth()
      fetchTestModules(setTestModules)
    }
    initialize()
  }, [])

  return (
    <div className="w-full h-screen flex flex-col items-center p-8 bg-[#3c6ca8] custom-font-2">
      <ToastContainer position="top-center" autoClose={3000} />
      <h1 className="text-3xl font-bold text-white mb-6">Create Room</h1>
      <CreateRoomForm
        formData={formData}
        testModules={testModules}
        loading={loading}
        handleChange={(e) => {
          const { name, value } = e.target
          setFormData((prev) => ({
            ...prev,
            [name]: value,
          }))
        }}
        handleSubmit={(e) => {
          e.preventDefault()
          createRoom(formData, setFormData, setLoading)
        }}
      />
    </div>
  )
}

export default CreateRoomPage