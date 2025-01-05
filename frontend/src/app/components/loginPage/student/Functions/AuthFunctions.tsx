"use client"

import { toast } from "react-toastify"
import { useRouter } from "next/navigation"

export const useStudentAuth = () => {
    const router = useRouter()

    const handleLogin = async (username: string, password: string) => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}auth/student/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username, 
                    password
                }),
                credentials: "include"
            })

            const data = await response.json()

            if (response.ok) {
                toast.success("Student Login Successfull", {
                    position: "top-center"
                })
                setTimeout(() => {
                    router.push("/dashboard/student/profile")
                }, 1500)
            } else {
                toast.error(data.message || "Login Failed", {
                    position: "top-center"
                })
            }
        } catch (err) {
            toast.error("An error occured. Please try again.", {
                position: "top-center"
            })
            console.error("Login Error", err)
        }
    }

    return {
        handleLogin
    }
}