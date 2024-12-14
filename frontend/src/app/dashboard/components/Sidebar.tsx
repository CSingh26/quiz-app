"use client"

import React from "react"
import SidebarItem from "./SidebarItem"

const Sidebar = () => {
    return (
        <div className="h-screen w-20 bg-[#2d2e73] flex flex-col justify-between items-center py-6">
            <div className="space-y-8">
                <SidebarItem icon="/Assests/Icons/user.png" link="/dashboard/student/profile" alt="Profile" />
                <SidebarItem icon="/Assests/Icons/activeRoom.png" link="/dashboard/student/activeRooms" alt="Active Room" />
                <SidebarItem icon="/Assests/Icons/pastRoom.png" link="/dashboard/student/pastRooms" alt="Past Quizzes" />
            </div>
            <div>
            <SidebarItem icon="/Assests/Icons/logout.png" link="/dashboard/student/logout" alt="Logout" />
            </div>
        </div>
    )
}

export default Sidebar