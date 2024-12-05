"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface TestModule {
  id: string
  name: string
}

export default function InstructorDashboard() {
  const router = useRouter()

  const [showUploadForm, setShowUploadForm] = useState(false)
  const [showRoomForm, setShowRoomForm] = useState(false)
  const [testFile, setTestFile] = useState<File | null>(null)
  const [roomName, setRoomName] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [roomCode, setRoomCode] = useState("")
  const [testModuleName, setTestModuleName] = useState("")
  const [availableModules, setAvailableModules] = useState<TestModule[]>([])

  const handleLogout = async () => {
    try {
      const response = await fetch("http://localhost:6573/api/auth/ins/logout", {
        method: "POST",
        credentials: "include",
      })

      if (response.ok) {
        router.push("/login/instructor")
      } else {
        console.error("Failed to log out")
      }
    } catch (err) {
      console.error("Error during logout:", err)
    }
  }

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("http://localhost:6573/api/auth/ins/check", {
          credentials: "include",
        })

        if (!res.ok) {
          alert("Please Login")
          router.push("/login/instructor")
        }
      } catch (error) {
        console.error("Error checking authentication:", error)
        router.push("/login/instructor")
      }
    }

    const fetchModules = async () => {
      try {
        const response = await fetch("http://localhost:6573/api/tests/get-modules", {
          credentials: "include",
        })

        const data = await response.json()
        if (response.ok) {
          setAvailableModules(data.modules || [])
        }
      } catch (err) {
        console.error("Error fetching modules:", err)
      }
    }

    checkAuth()
    fetchModules()
  }, [router])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setTestFile(event.target.files[0])
    }
  }

  const handleUploadTest = async () => {
    if (!testFile || !testModuleName) {
      alert("Please provide a module name and upload a JSON file")
      return
    }

    const formData = new FormData()
    formData.append("testFile", testFile)
    formData.append("testModuleName", testModuleName)

    try {
      const response = await fetch("http://localhost:6573/api/tests/upload-test", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        alert("Test module uploaded successfully")
        setTestFile(null)
        setTestModuleName("")
        setShowUploadForm(false)
      } else {
        alert("Failed to upload test module")
      }
    } catch (err) {
      console.error("Upload error:", err)
    }
  }

  const handleCreateRoom = async () => {
    if (!roomName || !expiryDate || !startTime || !endTime || !testModuleName) {
      alert("Please fill in all the details")
      return
    }

    try {
      const response = await fetch("http://localhost:6573/api/room/create-room", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomName,
          testModuleName,
          startTime,
          endTime,
          expiryDate,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setRoomCode(data.roomCode)
        alert("Room Created Successfully")
        setRoomName("")
        setExpiryDate("")
        setStartTime("")
        setEndTime("")
        setShowRoomForm(false)
      } else {
        alert(data.message || "Failed to create a room")
      }
    } catch (err) {
      console.error("Room creation error")
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-4">Instructor Dashboard</h1>

      <button
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mb-4"
        onClick={() => setShowUploadForm(!showUploadForm)}
      >
        {showUploadForm ? "Close Upload Form" : "Upload Test Module"}
      </button>

      {showUploadForm && (
        <div className="w-full max-w-lg mb-8 bg-white p-6 rounded shadow">
          <h2 className="text-xl font-bold mb-4">Upload Test Module</h2>
          <input
            type="text"
            placeholder="Enter Module Name"
            value={testModuleName}
            onChange={(e) => setTestModuleName(e.target.value)}
            className="mb-4 w-full px-4 py-2 border rounded"
          />
          <input
            type="file"
            accept="json"
            onChange={handleFileChange}
            className="mb-4 w-full px-4 py-2 border rounded"
          />
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 w-full"
            onClick={handleUploadTest}
          >
            Upload Test
          </button>
        </div>
      )}

      <button
        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 mb-4"
        onClick={() => setShowRoomForm(!showRoomForm)}
      >
        {showRoomForm ? "Close Room Form" : "Create Room"}
      </button>

      {showRoomForm && (
        <div className="w-full max-w-lg mb-8 bg-white p-6 rounded shadow">
          <h2 className="text-xl font-bold mb-4">Create Room</h2>
          <input
            type="text"
            placeholder="Room Name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="mb-4 w-full px-4 py-2 border rounded"
          />
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="mb-4 w-full px-4 py-2 border rounded"
          />
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="mb-4 w-full px-4 py-2 border rounded"
          />
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="mb-4 w-full px-4 py-2 border rounded"
          />
          <select
            value={testModuleName}
            onChange={(e) => setTestModuleName(e.target.value)}
            className="mb-4 w-full px-4 py-2 border rounded"
          >
            <option value="">Select Test Module</option>
            {availableModules.map((module) => (
              <option key={module.id} value={module.name}>
                {module.name}
              </option>
            ))}
          </select>
          <button
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 w-full"
            onClick={handleCreateRoom}
          >
            Create Room
          </button>
          {roomCode && (
            <div className="mt-4">
              <h3 className="text-lg font-bold">Room Code:</h3>
              <p className="text-blue-500 font-mono">{roomCode}</p>
            </div>
          )}
        </div>
      )}

      <button
        className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        onClick={handleLogout}
      >
        Logout
      </button>
    </div>
  )
}