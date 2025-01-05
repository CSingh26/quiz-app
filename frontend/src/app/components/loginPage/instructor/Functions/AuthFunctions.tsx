"use client"

import { toast } from "react-toastify"
import { useRouter } from "next/navigation"

export const useInstructorAuth = () => {
  const router = useRouter()

  const handleLogin = async (username: string, password: string) => {
    if (!username || !password) {
      toast.error("All fields are required!", {
        position: "top-center",
        autoClose: 3000,
      })
      return
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}auth/ins/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Instructor Login Successful!", {
          position: "top-center",
          autoClose: 3000,
        })
        setTimeout(() => {
          router.push("/dashboard/instructor/roomManagement")
        }, 2000)
      } else {
        toast.error(data.message || "Login Failed", {
          position: "top-center",
          autoClose: 3000,
        })
      }
    } catch (err) {
      toast.error("An unexpected error occurred. Please try again.", {
        position: "top-center",
        autoClose: 3000,
      })
      console.error("Login error", err)
    }
  }

  return { handleLogin }
}