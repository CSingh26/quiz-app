"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function StudentDashboard() {
    const router = useRouter()

    const handleLogout = () => {
        document.cookie = "token=; Max-Age=0; path=/;"
        router.push("/login/student")
    }

    useEffect(() => {
        const checkAuth = async () => {
            const res = await fetch("http://localhost:6573/api/auth/student/check", {
                credentials: "include"
            })

            if (!res.ok) {
                router.push("/login/student")
                alert("Please Login")
            }
        }
        checkAuth()
    }, [router])

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <h1 className="text-3xl font-bold mb-4">Student Dashboard</h1>
            <button
                className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                onClick={handleLogout}
            >
                Logout
            </button>
        </div>
    )
}