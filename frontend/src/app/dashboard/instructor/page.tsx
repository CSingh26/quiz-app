"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function InstructorDashboard() {
    const router = useRouter()

    const [testFile, setTestFile] = useState<File | null>(null)
    const [roomName, setRoomName] = useState("")
    const [expiryDate, setExpiryDate] = useState("")
    const [roomCode, setRoomCode] = useState("")
    const [testModuleName, setTestModuleName] = useState("")

    const handleLogout = async () => {
        try {
            const resposnse = await fetch("http://localhost:6573/api/auth/ins/logout", {
                method: "POST",
                credentials: "include"
            })
    
            if (resposnse.ok) {
                router.push("/login/instructor") // Redirect to instructor login
            } else {
                console.error("Failed to log out")
            }
        } catch (err) {
            console.log("Error during logout:", err)
        }
    }

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await fetch("http://localhost:6573/api/auth/ins/check", {
                    credentials: "include", // Include cookies
                })

                if (!res.ok) {
                    alert("Please Login") // Inform the user
                    router.push("/login/instructor") // Redirect to login
                }
            } catch (error) {
                console.error("Error checking authentication:", error)
                router.push("/login/instructor")
            }
        }

        checkAuth()
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
            const resposne = await fetch("http://localhost:6573/api/tests/upload-test", {
                method: "POST",
                body: formData
            })

            if (resposne.ok) {
                alert("Test module uploaded successfully")
            } else {
                alert("Failed to upload test module")
            }
        } catch (err) {
            console.error("Upload error:", err)
        }
    }

    const handleCreateRoom = async () => {
        if (!roomName || !expiryDate) {
            alert("Please fill in all the details")
            return
        }

        try {
            const response = await fetch("http://localhost:6573/api/ins/create-room", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    roomName,
                    expiryDate
                })
            })

            const data = await response.json()

            if (response.ok) {
                setRoomCode(data.roomCode)
                alert("Room Created Successfully")
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
            <div className="w-full max-w-lg mb-8 bg-white p-6 rounded shadow">
                <h2 className="text-x1 font-bold mb-4">Upload Test Module</h2>
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
                    onClick={handleUploadTest}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 w-full"
                >
                    Upload Test
                </button>
            </div>
            <div className="w-full max-w-lg mb-8 bg-white p-6 rounded shadow">
                <h2 className="text-x1 font-bold mb-4">Create Room</h2>
                <input 
                type="text"
                placeholder="Room Name"
                value={roomName} 
                onChange={(e) => setRoomName(e.target.value)}
                />
                <button
                    onClick={handleCreateRoom}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 w-full"
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
            <button
                onClick={handleLogout}
                className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
                Logout
            </button>
        </div>
    )
}