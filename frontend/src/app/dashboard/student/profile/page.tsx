"use client"

import React, { useState, useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

const Profile = () => {
  const [profile, setProfile] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    avatar: null,
    background: null,
  })
  const router = useRouter()

  const checkAuth = async () => {
    try {
      const res = await fetch("http://localhost:6573/api/auth/student/check", {
        credentials: "include",
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
      const res = await fetch(
        "http://localhost:6573/api/student/profile/get-profile",
        { credentials: "include" }
      )

      if (res.ok) {
        const data = await res.json()
        setProfile(data.profile)
      } else {
        console.error("Failed to fetch profile")
        alert("Could not fetch profile. Please try again later")
      }
    } catch (err) {
      console.error("Error fetching profile: ", err)
    }
  }

  const updateProfile = async () => {
    const formObj = new FormData()
    formObj.append("name", formData.name)
    formObj.append("username", formData.username)

    if (formData.avatar) {
      formObj.append("avatar", formData.avatar)
    }

    if (formData.background) {
      formObj.append("background", formData.background)
    }

    try {
      const res = await fetch(
        "http://localhost:6573/api/student/profile/update-profile",
        {
          method: "PUT",
          credentials: "include",
          body: formObj,
        }
      )

      if (res.ok) {
        alert("Profile Updated Successfully")
        setIsEditing(false)
        fetchProfile()
      } else {
        alert("Failed to update profile. Please try again")
      }
    } catch (err) {
      console.error("Error updating profile", err)
      alert("Error updating profile")
    }
  }

  useEffect(() => {
    const initialize = async () => {
      await checkAuth()
      await fetchProfile()
    }

    initialize()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : null,
    }))
  }

  return (
    <div className="relative w-full h-screen flex flex-col custom-font-2">
      {!isEditing ? (
        <>
          {/* Background Image */}
          <div className="relative w-full h-1/3 bg-black overflow-hidden">
            <Image
              src={profile?.background || "/Assests/Images/default-background.jpg"}
              alt="Background"
              fill
              className="object-cover"
            />
          </div>

          {/* Profile Picture and Username */}
          <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 flex flex-col items-center z-50">
            <div className="w-[150px] h-[150px] relative rounded-full overflow-hidden">
              <Image
                src={profile?.avatar || "/Assests/Images/default-user.png"}
                alt="Profile Picture"
                width={150}
                height={150}
                className="rounded-full object-cover"
              />
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-wider text-white text-center">
              {profile?.username?.toUpperCase() || "USERNAME"}
            </h2>
          </div>

          {/* Profile Details */}
          <div className="flex-1 bg-[#3c6ca8] flex flex-col justify-start pt-32 px-8 text-white">
            <div className="text-lg mb-8">
              <p className="mb-4">
                <strong>NAME: </strong> {profile?.name || "Placeholder"}
              </p>
            </div>
          </div>

          {/* Update Button */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
            <Button
              onClick={() => setIsEditing(true)}
              className="bg-[rgb(234,178,187)] hover:bg-[#f099a8] text-black font-semibold px-6 py-3 rounded-lg"
            >
              UPDATE PROFILE
            </Button>
          </div>
        </>
      ) : (
        <div className="flex-1 bg-[#3c6ca8] flex flex-col justify-center items-center px-8">
          <h1 className="text-3xl font-bold mb-6">Edit Profile</h1>
          <form
            className="flex flex-col gap-4 w-full max-w-md"
            onSubmit={(e) => {
              e.preventDefault()
              updateProfile()
            }}
          >
            <div className="block text-sm font-semibold mb-1">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full p-2 text-black rounded-lg"
              />
            </div>
            <div className="block text-sm font-semibold mb-1">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className="w-full p-2 text-black rounded-lg"
              />
            </div>
            <div className="block text-sm font-semibold mb-1">
              <label htmlFor="background">Background</label>
              <input
                type="file"
                name="background"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full p-2 text-black rounded-lg"
              />
            </div>
            <div className="block text-sm font-semibold mb-1">
              <label htmlFor="avatar">User Avatar</label>
              <input
                type="file"
                name="avatar"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full p-2 text-black rounded-lg"
              />
            </div>
            <div className="flex justify-between">
              <Button
                type="button"
                onClick={() => setIsEditing(false)}
                className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[rgb(234,178,187)] hover:bg-[#f099a8] text-black font-semibold px-6 py-3 rounded-lg"
              >
                Save
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default Profile