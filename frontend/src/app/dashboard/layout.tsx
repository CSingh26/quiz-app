import React from "react"
import Sidebar from "./components/Sidebar"

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 bg-[#ac53a6] min-h-screen p-8">{children}</div>
    </div>
  )
}

export default DashboardLayout