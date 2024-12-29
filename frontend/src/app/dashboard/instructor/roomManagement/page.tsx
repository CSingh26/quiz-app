"use client"

import React, { useState, useEffect } from "react"

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

  useEffect(() => {
    const fetchTestModules = async () => {
      try {
        const response = await fetch("http://localhost:6573/api/tests/get-modules")
        if (response.ok) {
          const data = await response.json()
          setTestModules(data.modules || []) 
        } else {
          console.error("Failed to fetch test modules")
        }
      } catch (err) {
        console.error("Error fetching test modules", err)
      }
    }
    fetchTestModules()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (
      !formData.roomName ||
      !formData.roomCode ||
      !formData.startDate ||
      !formData.startTime ||
      !formData.endTime ||
      !formData.testModule
    ) {
      alert("Please fill out all fields")
      return
    }

    const requestBody = {
      roomName: formData.roomName,
      roomCode: formData.roomCode,
      testModule: formData.testModule,
      startDate: formData.startDate,
      startTime: formData.startTime,
      endTime: formData.endTime,
    }

    setLoading(true)

    try {
      const response = await fetch("http://localhost:6573/api/room/create-room", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })
      if (response.ok) {
        alert("Room created successfully")
        setFormData({
          roomName: "",
          roomCode: "",
          startDate: "",
          startTime: "",
          endTime: "",
          testModule: "",
        })
      } else {
        const errorData = await response.json()
        alert(`Failed to create room: ${errorData.message}`)
      }
    } catch (err) {
      console.error("Error creating room", err)
      alert("An error occurred while creating the room")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full h-screen flex flex-col items-center p-8 bg-[#3c6ca8] custom-font-2">
      <h1 className="text-3xl font-bold text-white mb-6">Create Room</h1>
      <form
        className="bg-[#00004d] p-6 rounded-lg shadow-lg w-full max-w-lg text-white"
        onSubmit={handleSubmit}
      >
        <div className="mb-4">
          <label htmlFor="roomName" className="block font-semibold mb-2">
            Room Name
          </label>
          <input
            type="text"
            name="roomName"
            id="roomName"
            value={formData.roomName}
            onChange={handleChange}
            className="w-full p-2 rounded-md text-black border"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="roomCode" className="block font-semibold mb-2">
            Room Code
          </label>
          <input
            type="text"
            name="roomCode"
            id="roomCode"
            value={formData.roomCode}
            onChange={handleChange}
            className="w-full p-2 rounded-md text-black border"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="startDate" className="block font-semibold mb-2">
            Start Date
          </label>
          <input
            type="date"
            name="startDate"
            id="startDate"
            value={formData.startDate}
            onChange={handleChange}
            className="w-full p-2 rounded-md text-black border"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="startTime" className="block font-semibold mb-2">
            Start Time
          </label>
          <input
            type="time"
            name="startTime"
            id="startTime"
            value={formData.startTime}
            onChange={handleChange}
            className="w-full p-2 rounded-md text-black border"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="endTime" className="block font-semibold mb-2">
            End Time
          </label>
          <input
            type="time"
            name="endTime"
            id="endTime"
            value={formData.endTime}
            onChange={handleChange}
            className="w-full p-2 rounded-md text-black border"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="testModule" className="block font-semibold mb-2">
            Test Module
          </label>
          <select
            name="testModule"
            id="testModule"
            value={formData.testModule}
            onChange={handleChange}
            className="w-full p-2 rounded-md text-black border"
          >
            <option value="">Select a Test Module</option>
            {testModules.map((module) => (
              <option value={module.id} key={module.id}>
                {module.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full p-2 bg-[#eab2bb] hover:bg-[#f099a8] text-black font-semibold rounded-full mt-4"
        >
          {loading ? "Creating Room..." : "Create Room"}
        </button>
      </form>
    </div>
  )
}

export default CreateRoomPage