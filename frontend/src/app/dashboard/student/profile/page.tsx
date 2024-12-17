"use client"

import React from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"

const Profile = () => {
  return (
    <div className="relative w-full h-full">
      {/* Background Image */}
      <div className="absolute top-0 left-0 w-full h-[300px] overflow-hidden">
        <Image
          src={"/Assests/Images/default-background.jpg"} // Fallback image
          alt="Background"
          layout="fill"
          objectFit="cover"
          className="opacity-90"
        />
      </div>

      {/* Profile Content */}
      <div className="relative top-[180px] mx-auto w-[90%] md:w-[600px] bg-[#4a6fa5] text-white text-center rounded-md shadow-lg p-6">
        {/* Avatar */}
        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2">
          <Image
            src={"/Assests/Images/default-user.png"} // Fallback avatar
            alt="Profile Picture"
            width={128}
            height={128}
            className="rounded-full border-4 border-white shadow-md"
          />
        </div>

        {/* User Information */}
        <h2 className="mt-12 text-2xl font-bold">Username</h2>
        <p className="text-lg mt-4">
          <strong>Name:</strong> User
        </p>
        <p className="text-lg">
          <strong>Email:</strong> user@example.com
        </p>

        {/* Update Profile Button */}
        <div className="mt-6">
          <Button
            onClick={() => alert("Update profile clicked!")}
            className="bg-pink-500 hover:bg-pink-600 text-white font-semibold px-4 py-2 rounded-md"
          >
            Update Profile
          </Button>
        </div>
      </div>
    </div>
  )
}

export default Profile