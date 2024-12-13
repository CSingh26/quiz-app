"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { motion } from "framer-motion"
import { Eye, EyeOff } from "lucide-react"

export default function StudentLogin() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async () => {
    try {
      const response = await fetch("http://localhost:6573/api/auth/student/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
        credentials: "include",
      })

      const data = await response.json()
      if (response.ok) {
        alert("Student Login Successful")
        router.push("/dashboard/student")
      } else {
        setError(data.message || "Login Failed")
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
      console.error("Login Error", err)
    }
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen custom-font-1">
      <motion.div
        initial={{ opacity: 0, x: -100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full md:w-1/2 bg-gray-100 flex flex-col items-center justify-center"
      >
        <div className="w-full max-w-md px-6">
          <motion.h1
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="text-center text-7xl font-bold text-[#ac53a6] mb-6"
          >
            Login
          </motion.h1>

          {/* Error Alert */}
          {error && (
            <Alert className="mb-6" variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-4"
          >
            <div className="pt-10">
              <Label htmlFor="username" className="text-2xl text-[#ac53a6]">
                Email
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-2 text-white bg-[#00004d] placeholder:text-white placeholder-opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-5 py-7 pr-12"
              />
            </div>

            <div className="relative pt-5 pb-10">
              <Label htmlFor="password" className="text-2xl text-[#ac53a6]">
                Password
              </Label>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 text-white bg-[#00004d] placeholder:text-white placeholder-opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-5 py-7 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className=" text-white absolute top-[calc(50%+12px)] right-3 flex items-center hover:text-white focus:outline-none transform -translate-y-1/2"
                style={{ padding: 0, background: "none" }}
              >
                {showPassword ? (
                  <EyeOff size={20} aria-hidden="true" />
                ) : (
                  <Eye size={20} aria-hidden="true" />
                )}
              </button>
            </div>

            <Button
              onClick={handleLogin}
              className="text-3xl w-full py-5 bg-white text-[#00004d] font-bold rounded-lg shadow-lg hover:shadow-2xl hover:scale-105 hover:text-lg transition-all duration-300 active:scale-95 active:shadow-md focus:outline-none"
              style={{ backgroundColor: "#ac53a6" }}
            >
              Login
            </Button>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-6 text-center text-gray-600 text-xl"
          >
            Don't have an account?{" "}
            <Link href="/register" className="text-[#00004d] underline">
              Register Here
            </Link>
          </motion.p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="hidden md:flex md:w-1/2 bg-[#00004d] items-center justify-center"
      >
        <img
          src="/Assests/Images/login.svg"
          alt="3D Cubes"
          className="w-[120%] h-auto"
        />
      </motion.div>
    </div>
  )
}