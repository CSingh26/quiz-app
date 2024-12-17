"use client"

import React from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"

const Profile = () => {
  return (
    <div className="relative w-full h-screen flex flex-col"> 
      {/* Container for Background Image and Avatar */}
      <div className="relative w-full h-1/3 bg-black overflow-hidden">
        <Image
          src={"/Assests/Images/default-background.jpg"}
          alt="Background"
          fill
          className="object-cover"
        />
        {/* Avatar overlapping at the bottom */}
        <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-[60px] flex flex-col items-center z-50">
          <Image
            src={"/Assests/Images/default-user.png"}
            alt="Profile Picture"
            width={200}
            height={200}
            className="z-50"
          />
        </div>
      </div>

      {/* Username Section (just below the avatar) */}
      <div className="flex flex-col items-center mt-20">
        <h2 className="text-3xl font-bold tracking-wider text-white">
          USERNAME
        </h2>
      </div>

      {/* User Details (left-aligned, below username) */}
      <div className="flex flex-col text-white mt-8 px-8 max-w-sm">
        <p className="text-lg mb-2">
          <strong>NAME:</strong> User
        </p>
        <p className="text-lg mb-8">
          <strong>EMAIL:</strong> user@example.com
        </p>
      </div>

      {/* Update Profile Button at the bottom, centered */}
      <div className="mt-auto flex justify-center mb-8">
        <Button
          onClick={() => alert("Update profile clicked!")}
          className="bg-pink-500 hover:bg-pink-600 text-white font-semibold px-6 py-3 rounded-md"
        >
          UPDATE PROFILE
        </Button>
      </div>
    </div>
  )
}

export default Profile