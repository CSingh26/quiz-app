import { PastQuiz } from "../pastRoomsPage/roomInterface"

export const fetchPastRooms = async (
    setPastQuizzes: React.Dispatch<React.SetStateAction<PastQuiz[]>>,
    toast: any
  ) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}room/get-past-rooms`, {
        credentials: "include",
      })
  
      if (res.ok) {
        const data = await res.json()
        setPastQuizzes(data.pastRooms || [])
        toast.success("Past quizzes fetched successfully!", {
          position: "top-center",
        })
      } else {
        toast.error("Failed to fetch past quizzes", {
          position: "top-center",
        })
        console.error("Failed to fetch past rooms")
      }
    } catch (err) {
      console.error("Error fetching rooms: ", err)
      toast.error("An error occurred while fetching past quizzes.", {
        position: "top-center",
      })
    }
}

import { useRouter } from "next/navigation"

export const checkAuth = async (toast: any, router: any) => {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}auth/student/check`, {
      credentials: "include",
    })

    if (!res.ok) {
      toast.error("Please log in to continue", {
        position: "top-center",
      })
      router.push("/login/student")
    }
  } catch (err) {
    console.error("Error checking authentication: ", err)
    toast.error("An error occurred during authentication.", {
      position: "top-center",
    })
    router.push("/login/student")
  }
}