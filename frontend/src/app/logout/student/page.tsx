"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Logout() {
    const router = useRouter()

    useEffect(() => {
        const logout = async () => {
            await fetch("http://localhost:6573/api/auth/student/logout", {
                method: "POST",
                credentials: "include",
            })
            router.push("/login/student") // Redirect to login page
        }

        logout()
    }, [router])

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <h1 className="text-2xl font-bold">Logging out...</h1>
        </div>
    )
}