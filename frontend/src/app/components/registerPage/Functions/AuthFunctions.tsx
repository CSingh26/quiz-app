"use client"

import { toast } from "react-toastify"
import { validatePassword } from "../Auth/PasswordValidation"
import { useRouter } from "next/navigation"

export const useSignUp = () => {
  const router = useRouter()

  const handleSignUp = async (data: {
    name: string
    username: string
    email: string
    password: string
    confirmPassword: string
  }) => {
    if (!data.name || !data.username || !data.email || !data.password || !data.confirmPassword) {
      toast.error("All fields are required!", { 
        position: "top-center" 
      })
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(data.email)) {
      toast.error("Invalid email format!", { 
        position: "top-center" 
      })
      return
    }

    if (data.password !== data.confirmPassword) {
      toast.error("Passwords do not match!", { 
        position: "top-center" 
      })
      return
    }

    const passwordError = validatePassword(data.password)
    if (passwordError) {
      toast.error(passwordError, { 
        position: "top-center" 
      })
      return
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}auth/student/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const responseData = await response.json()

      if (response.ok) {
        toast.success("Signup Successful!", {
          position: "top-center"
        })
        setTimeout(() => {
          router.push("/login/student")
      }, 1500)
      } else {
        toast.error(responseData.message || "Signup Failed", {
          position: "top-center"
        })
      }
    } catch (err) {
      toast.error("An unexpected error occurred. Please try again.", {
        position: "top-center"
      })
      console.error("Error during Signup:", err)
    }
  }

  return { handleSignUp }
}