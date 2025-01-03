import React from "react"
import Sidebar from "./components/Sidebar"

import RoleProtectedLayout from "@/app/utils/preventAuth"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <RoleProtectedLayout requiredRole="instructor">
      <div className="flex h-screen">
        <div className="w-20 bg-[#eab2bb] fixed h-screen">
          <Sidebar />
        </div>
        <div className="flex-1 min-h-screen ml-20 bg-[#3c6ca8] relative z-0 overflow-visible">
          {children}
        </div>
      </div>
    </RoleProtectedLayout>
  )
}