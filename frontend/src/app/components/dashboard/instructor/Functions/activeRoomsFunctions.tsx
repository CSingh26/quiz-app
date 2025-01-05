import { toast } from "react-toastify"
import { Room } from "../activeRoomsPage/roomInterface"

export const fetchRooms = async (
  setActiveRooms: React.Dispatch<React.SetStateAction<Room[]>>,
  setScheduledRooms: React.Dispatch<React.SetStateAction<Room[]>>,
  toast: typeof import("react-toastify").toast
) => {
  try {
    const [activeResponse, scheduledResponse] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}room/get-active-rooms`, {
        credentials: "include",
      }),
      fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}room/get-scheduled-rooms`, {
        credentials: "include",
      }),
    ])

    if (activeResponse.ok) {
      const activeData = await activeResponse.json()
      setActiveRooms(activeData.activeRooms || [])
      toast.success("Active rooms fetched successfully!", { 
        position: "top-center" 
      })
    } else {
      console.error("Failed to fetch active rooms")
      toast.error("Failed to fetch active rooms. Please try again!", { 
        position: "top-center" 
      })
    }

    if (scheduledResponse.ok) {
      const scheduledData = await scheduledResponse.json()
      setScheduledRooms(scheduledData.scheduledRooms || [])
      toast.success("Scheduled rooms fetched successfully!", { 
        position: "top-center" 
      })
    } else {
      console.error("Failed to fetch scheduled rooms")
      toast.error("Failed to fetch scheduled rooms. Please try again!", { 
        position: "top-center" 
      })
    }
  } catch (err) {
    console.error("Error fetching rooms:", err)
    toast.error("An error occurred while fetching rooms. Please try again later!", { 
      position: "top-center" 
    })
  }
}

export const activateRoom = async (
  roomId: string,
  scheduledRooms: Room[],
  setScheduledRooms: React.Dispatch<React.SetStateAction<Room[]>>,
  setActiveRooms: React.Dispatch<React.SetStateAction<Room[]>>
) => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}room/activate-room/${roomId}`, { 
        method: "POST" 
      }
    )

    if (response.ok) {
      const updatedScheduledRooms = scheduledRooms.filter((room) => room.id !== roomId)
      setScheduledRooms(updatedScheduledRooms)

      const activatedRoom = scheduledRooms.find((room) => room.id === roomId)
      if (activatedRoom) {
        setActiveRooms((prevRooms) => [...prevRooms, activatedRoom])
      }

      toast.success("Room activated successfully!", { 
        position: "top-center" 
      })
    } else {
      console.error("Failed to activate room")
      toast.error("Failed to activate room. Please try again!", { 
        position: "top-center" 
      })
    }
  } catch (err) {
    console.error("Error activating room:", err)
    toast.error("An error occurred while activating the room. Please try again later!", { 
      position: "top-center" 
    })
  }
}