"use client"

import { motion } from "framer-motion"
import { useStudentAuth } from "@/app/components/loginPage/student/Functions/AuthFunctions"
import LoginForm from "@/app/components/loginPage/student/Auth/LoginForm"
import React from "react"

export default function StudentLogin() {
  const { handleLogin } = useStudentAuth()

  return (
    <div className="flex flex-col md:flex-row min-h-screen custom-font-1">
      <motion.div
        initial={{ opacity: 0, x: -100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full md:w-1/2 bg-gray-100 flex flex-col items-center justify-center"
      >
        <LoginForm handleLogin={handleLogin} />
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