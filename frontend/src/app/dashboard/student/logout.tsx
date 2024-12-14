"use client"

import React from "react"
import { useRouter } from "next/navigation"

const Logout = () => {
  const router = useRouter()

  const handleLogout = () => {
    document.cookie = "token=; Max-Age=0; path=/;"
    router.push("/login/student")
  }

  return (
    <div className="text-white">
      <h1 className="text-4xl font-bold mb-4">Logout</h1>
      <button
        className="px-4 py-2 bg-white text-[#00004d] rounded-lg hover:scale-105"
        onClick={handleLogout}
      >
        Logout
      </button>
    </div>
  )
}

export default Logout