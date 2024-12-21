"use client"

import React, { useState, useEffect} from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

const Profile = () => {
  const [profile, setprofile] = useState<any>(null)
  const router = useRouter()

  const checkAuth = async () => {
    try {
      const res = await fetch("http://localhost:6573/api/auth/student/check", {
        credentials: "include"
      })

      if (!res.ok) {
        alert("Please login")
        router.push("/login/student")
      }
    } catch (err) {
      console.error("Error checking authentication: ", err)
      router.push("/login/student")
    }
  }

  const fetchProfile = async () => {
    try {
      const res = await fetch("http://localhost:6573/api/student/profile/get-profile", {
        credentials: "include"
      })

      if (res.ok) {
        const data = await res.json()
        setprofile(data.profile)
      } else {
        console.error("Failed to fetch profile")
        alert("Could not fetch profile. Please try again later")
      }
    } catch (err) {
      console.error("Error fetching profile: ", err)
    }
  }

  useEffect(() => {
    const initialize = async () => {
      await checkAuth()
      await fetchProfile()
    }

    initialize()
  }, [])

  return (
    <div className="relative w-full h-screen flex flex-col custom-font-2">
      <div className="relative w-full h-1/3 bg-black overflow-hidden">
        <Image
          src={profile?.background || "/Assests/Images/default-background.jpg"}
          alt="Background"
          fill
          className="object-cover"
        />
      </div>
      <div className="absolute top-[25%] left-1/2 transform -translate-x-1/2 flex flex-col items-center z-50">
        <div className="w-[250px] h-[250px] relative rounded-full overflow-hidden">
          <Image
            src={profile?.avatar || "/Assests/Images/default-user.png"}
            alt="Profile Picture"
            width={250}
            height={250}
            className="rounded-full object-contain"
          />
        </div>
        <h2 className="mt-[-100px] text-4xl font-bold tracking-wider text-white">
          {profile?.username.toUpperCase()}
        </h2>
      </div>

      <div className="flex-1 bg-[#3c6ca8] flex flex-col justify-start pt-32 px-8 text-white">
        <div className="text-lg mb-8">
          <p className="mb-4">
            <strong>NAME: </strong>  {profile?.name}
          </p>
          {/* <p className="mb-4">
            <strong>EMAIL: </strong>  user@example.com
          </p> */}
        </div>
      </div>
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <Button
          onClick={() => alert("Update profile clicked!")}
          className="bg-[rgb(234,178,187)] hover:bg-[#f099a8] text-black font-semibold px-6 py-3 rounded-lg"
        >
          UPDATE PROFILE
        </Button>
      </div>
    </div>
  )
}

export default Profile