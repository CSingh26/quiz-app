"use client"

import React, { useEffect } from "react"
import { useRouter } from "next/navigation"

interface RoleProtectedProps {
    children: React.ReactNode
    requiredRole: "student" | "instructor"
}

export default function RoleProtectedLayout({ children, requiredRole}: RoleProtectedProps) {
    const router = useRouter()

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}auth/check`, {
                    credentials: "include"
                })

                if (!res.ok) {
                    if (requiredRole === "student") {
                        router.push("/login/student")
                    } else {
                        router.push("/login/instructor")
                    }
                } else {
                    const data = await res.json()

                    if (data.role !== requiredRole) {
                        await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}auth/logout`, {
                            method: "POST",
                            credentials: "include"
                        })

                        if (requiredRole === "student") {
                            router.push("/login/student")
                        } else {
                            router.push("/login/instructor")
                        }
                    }
                }
            } catch (err) {
                console.error("Auth check failed: ", err)

                if (requiredRole === "student") {
                    router.push("/login/student")
                } else {
                    router.push("/login/instructor")
                }
            }
        }

        checkAuth()
    }, [requiredRole, router])
    return <>{children}</>
}