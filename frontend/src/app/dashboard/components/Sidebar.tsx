"use client"

import React from "react"
import SidebarItem from "./SidebarItem"

const Sidebar = () => {
    return (
        <div className="h-screen w-20 bg-[#2d2e73] flex flex-col justify-between items-center py-6">
            <div className="space-y-8">
                <SidebarItem icon="/Assests/Icons/user.png" href="/dashboard/student/profile" alt="Profile" active/>
                <SidebarItem icon="/Assests/Icons/activeRoom.png" href="/dashboard/student/activeRooms" alt="Active Room" active/>
                <SidebarItem icon="/Assests/Icons/pastRoom.png" href="/dashboard/student/pastRooms" alt="Past Quizzes" active/>
            </div>
            <div>
            <SidebarItem icon="/Assests/Icons/logout.png" href="/dashboard/student/logout" alt="Logout" active/>
            </div>
        </div>
    )
}

export default Sidebar