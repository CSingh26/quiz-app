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
            try {
                const res = await fetch("http://localhost:6573/api/auth/student/check", {
                    credentials: "include"
                })

                if (!res.ok) {
                    router.push("/login/student")
                    alert("Please Login")
                }
            } catch (err) {
                console.error("Authentication Error", err)
                router.push("/login/student")
            }
        }

        checkAuth()
    }, [router])

    return (
        <div>

        </div>
    )
}
