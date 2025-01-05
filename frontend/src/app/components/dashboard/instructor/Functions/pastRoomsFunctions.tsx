import { Room } from "../pastRoomsPage/roomInterface"
import { toast } from "react-toastify"

export const fetchPastRooms = async (
  setPastRooms: React.Dispatch<React.SetStateAction<Room[]>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}room/get-past-room-ins`)

    if (response.ok) {
      const data = await response.json()
      const formattedRooms = data.pastRooms.map((room: any) => ({
        name: room.roomName,
        moduleName: room.moduleName,
        maxScore: room.maxScore,
        meanScore: room.meanScore,
        minScore: room.minScore,
      }))
      setPastRooms(formattedRooms)
      toast.success("Past rooms fetched successfully", { position: "top-center" })
    } else {
      toast.error("Failed to fetch past rooms", { position: "top-center" })
    }
  } catch (err) {
    console.error("Error fetching past rooms:", err)
    toast.error("Error fetching past rooms", { position: "top-center" })
  } finally {
    setLoading(false)
  }
}