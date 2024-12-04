"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function InstructorDashboard() {
    const router = useRouter()

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

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <h1 className="text-3xl font-bold mb-4">Instructor Dashboard</h1>
            <button
                className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                onClick={handleLogout}
            >
                Logout
            </button>
        </div>
    )
}