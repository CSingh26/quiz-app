"use client"

import React from "react"
import SidebarItem from "./SidebarItem"
import { useRouter } from "next/navigation"

const Sidebar = () => {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      const response = await fetch("http://localhost:6573/api/auth/ins/logout", {
        method: "POST",
        credentials: "include",
      })

      if (response.ok) {
        localStorage.clear()
        sessionStorage.clear()

        router.push("/instructor/login")
      }
    } catch (error) {
      console.log("Error during logout", error)
    }
  }

  return (
    <div className="h-screen w-20 bg-[#eab2bb] flex flex-col justify-between items-center py-6">

      <div className="flex flex-col items-center gap-10 mt-auto">
        <SidebarItem
          icon="/Assests/Icons/createRoom.png"
          href="/dashboard/instructor/roomManagement"
          alt="Create Room"
          active
        />
        <SidebarItem
          icon="/Assests/Icons/activeRoom.png"
          href="/dashboard/instructor/activeRooms"
          alt="Active Room"
          active
        />
        <SidebarItem
          icon="/Assests/Icons/testModule.png"
          href="/dashboard/instructor/testModule"
          alt="Test Module"
          active
        />
        <SidebarItem
          icon="/Assests/Icons/pastRoom.png"
          href="/dashboard/instructor/pastRooms"
          alt="Past Rooms"
          active
        />
      </div>

      <div className="mt-auto">
        <SidebarItem
          icon="/Assests/Icons/logout.png"
          onClick={handleLogout}
          href="/dashboard/instructor/logout"
          alt="Logout"
          active
        />
      </div>
    </div>
  )
}

export default Sidebar