"use client"

import React from "react"

interface CreateRoomFormProps {
  formData: {
    roomName: string
    roomCode: string
    startDate: string
    startTime: string
    endTime: string
    testModule: string
  }
  testModules: { name: string; id: string }[]
  loading: boolean
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void
}

const CreateRoomForm: React.FC<CreateRoomFormProps> = ({
  formData,
  testModules,
  loading,
  handleChange,
  handleSubmit,
}) => {
  return (
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
  )
}

export default CreateRoomForm