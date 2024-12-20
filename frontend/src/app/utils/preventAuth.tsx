"use client"

import { useEffect } from "react"
import { useRouter } from "next/router"

export default function PreventAuth({ children }: { children: React.ReactNode }) {
    const router = useRouter()

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await fetch("http://localhost:6573/api/auth/check", {
                    credentials: "include", // Include cookies
                })

                if (res.ok) {
                    const data = await res.json()

                    // Redirect based on role
                    if (data.role === "instructor") {
                        router.push("/dashboard/instructor")
                    } else if (data.role === "student") {
                        router.push("/dashboard/student")
                    }
                }
            } catch (error) {
                console.error("Auth check failed:", error)
            }
        }

        checkAuth()
    }, [router])

    return <>{children}</>
}