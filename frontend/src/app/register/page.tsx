"use client"

import { useForm, FormProvider } from "react-hook-form"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { FormField, FormItem, FormMessage } from "@/components/ui/form"
import { motion } from "framer-motion"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

export default function StudentSignUp() {
  const methods = useForm({
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  const validatePassword = (password: string) => {
    const criteria = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      specialChar: /[!@#$%^&*]/.test(password),
    }

    if (!criteria.length) return "Password must be at least 8 characters long."
    if (!criteria.uppercase) return "Password must have at least one uppercase letter."
    if (!criteria.number) return "Password must have at least one number."
    if (!criteria.specialChar) return "Password must have at least one special character."
    return null
  }

  const onSubmit = async (data: {
    name: string
    username: string
    email: string
    password: string
    confirmPassword: string
  }) => {
    // Check if all fields are filled
    if (!data.name || !data.username || !data.email || !data.password || !data.confirmPassword) {
      toast.error("All fields are required!", {
        position: "top-center",
      })
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(data.email)) {
      toast.error("Invalid email format!", {
        position: "top-center",
      })
      return
    }

    // Check if passwords match
    if (data.password !== data.confirmPassword) {
      toast.error("Passwords do not match!", {
        position: "top-center",
      })
      return
    }

    // Validate password criteria
    const passwordError = validatePassword(data.password)
    if (passwordError) {
      toast.error(passwordError, {
        position: "top-center",
      })
      return
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}auth/student/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: data.username,
          name: data.name,
          email: data.email,
          password: data.password,
        }),
      })

      const responseData = await response.json()

      if (response.ok) {
        toast.success("Signup Successful!")
      } else {
        toast.error(responseData.message || "Signup Failed")
      }
    } catch (err) {
      toast.error("An unexpected error occurred. Please try again.")
      console.error("Error during Signup:", err)
    }
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen custom-font-1">
      <ToastContainer position="top-right" autoClose={3000} />
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
            Student Sign Up
          </motion.h1>
          <FormProvider {...methods}>
            <form
              onSubmit={methods.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <FormField
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="name" className="text-2xl text-[#ac53a6]">
                      Name
                    </Label>
                    <Input
                      id="name"
                      placeholder="Name"
                      {...field}
                      className="mt-2 text-white bg-[#00004d] placeholder:text-white placeholder-opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-5 py-7 pr-12"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="username" className="text-2xl text-[#ac53a6]">
                      Username
                    </Label>
                    <Input
                      id="username"
                      placeholder="Username"
                      {...field}
                      className="mt-2 text-white bg-[#00004d] placeholder:text-white placeholder-opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-5 py-7 pr-12"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="email" className="text-2xl text-[#ac53a6]">
                      Email
                    </Label>
                    <Input
                      id="email"
                      placeholder="Email"
                      {...field}
                      className="mt-2 text-white bg-[#00004d] placeholder:text-white placeholder-opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-5 py-7 pr-12"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="password" className="text-2xl text-[#ac53a6]">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Password"
                      {...field}
                      className="mt-2 text-white bg-[#00004d] placeholder:text-white placeholder-opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-5 py-7 pr-12"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="confirmPassword" className="text-2xl text-[#ac53a6]">
                      Confirm Password
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm Password"
                      {...field}
                      className="mt-2 text-white bg-[#00004d] placeholder:text-white placeholder-opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-5 py-7 pr-12"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="text-3xl w-full py-5 bg-white text-[#00004d] font-bold rounded-lg shadow-lg hover:shadow-2xl hover:scale-105 hover:text-lg transition-all duration-300 active:scale-95 active:shadow-md focus:outline-none"
                style={{ backgroundColor: "#ac53a6" }}
              >
                Sign Up
              </Button>
            </form>
          </FormProvider>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-6 text-center text-gray-600 text-xl"
          >
            Already have an account?{" "}
            <Link href="/login/student" className="text-[#00004d] underline">
              Login Here
            </Link>
          </motion.p>
        </div>
      </motion.div>
    </div>
  )
}