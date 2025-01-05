import { useRouter } from "next/navigation"

export const checkAuth = async (toast: any, router: any) => {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}auth/student/check`, {
      credentials: "include",
    })

    if (!res.ok) {
      toast.error("Please login to continue", {
        position: "top-center",
      })
      router.push("/login/student")
    }
  } catch (err) {
    console.error("Error checking authentication: ", err)
    toast.error("Authentication failed. Please try again.", {
      position: "top-center",
    })
    router.push("/login/student")
  }
}

export const fetchProfile = async (setProfile: (profile: any) => void, toast: any) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}student/profile/get-profile`,
        { credentials: "include" }
      )
  
      if (res.ok) {
        const data = await res.json()
        setProfile(data.profile)
        toast.success("Profile fetched successfully!", {
          position: "top-center",
        })
      } else {
        console.error("Failed to fetch profile")
        toast.error("Could not fetch profile. Please try again later.", {
          position: "top-center",
        })
      }
    } catch (err) {
      console.error("Error fetching profile: ", err)
      toast.error("An error occurred while fetching the profile.", {
        position: "top-center",
      })
    }
}

export const updateProfile = async (
    formData: FormData,
    setIsEditing: (isEditing: boolean) => void,
    fetchProfile: () => Promise<void>,
    toast: any
  ) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}student/profile/update-profile`,
        {
          method: "PUT",
          credentials: "include",
          body: formData,
        }
      )
  
      if (res.ok) {
        toast.success("Profile updated successfully!", {
          position: "top-center",
        })
        setIsEditing(false)
        fetchProfile()
      } else {
        toast.error("Failed to update profile. Please try again.", {
          position: "top-center",
        })
      }
    } catch (err) {
      console.error("Error updating profile", err)
      toast.error("An error occurred while updating the profile.", {
        position: "top-center",
      })
    }
}