"use client"

import React, { useState, useEffect } from "react"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import { useRouter } from "next/navigation"
import { 
  checkAuth, 
  fetchProfile, 
  updateProfile 
} from "../../../components/dashboard/student/Functions/profileFunctions"
import ProfileCard from "../../../components/dashboard/student/profilePage/profileCard"
import EditProfileForm from "../../../components/dashboard/student/profilePage/editProfileForm"

const Profile = () => {
  const [profile, setProfile] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    avatar: null,
    background: null,
  })
  const router = useRouter()

  useEffect(() => {
    const initialize = async () => {
      await checkAuth(toast, router)
      await fetchProfile(setProfile, toast)
    }

    initialize()
  }, [])

  return (
    <div className="relative w-full h-screen flex flex-col custom-font-2">
      <ToastContainer position="top-center" autoClose={3000} />
      {!isEditing ? (
        <ProfileCard
          profile={profile}
          onEditClick={() => {
            setIsEditing(true)
            setFormData({
              name: profile?.name || "",
              username: profile?.username || "",
              email: profile?.email || "",
              avatar: null,
              background: null,
            })
          }}
        />
      ) : (
        <EditProfileForm
          formData={formData}
          setFormData={setFormData}
          onCancel={() => setIsEditing(false)}
          onSave={() => {
              const formObj = new FormData()
              Object.entries(formData).forEach(([key, value]) => {
                if (value) {
                  formObj.append(key,value as Blob | string)
                }
              })
              updateProfile(
                formObj,
                setIsEditing,
                async () => await fetchProfile(setProfile, toast),
                toast
              )
            }
          }
        />
      )}
    </div>
  )
}

export default Profile