import { Room } from "../activeRoomsPage/roomInterface"

export const fetchActiveRooms = async (
    setRooms: React.Dispatch<React.SetStateAction<Room[]>>, 
    toast: any) => {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}room/get-active-rooms`, {
            credentials: "include"
        })

        if (res.ok) {
            const data = await res.json()
            setRooms(data.activeRooms || [])
            toast.success("Active rooms fetched successfully", {
                position: "top-center"
            })
        } else {
            toast.error("Error fetching active rooms", {
                position: "top-center"
            })
        }
    } catch (err) {
        console.error("Error fetching active rooms", err)
        toast.error("An error occured while fetching active rooms", {
            position: "top-center"
        })
    }
}

export const verifyRoomCode = async (
    roomId: string,
    roomCode: string,
    toast: any,
    router: any
) => {
    try {
        const res = await fetch(`${process.env.NEXT_ENV_PUBLIC_API_BASE_URL}room/verify-room-code`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                roomId,
                roomCode
            })
        })

        if (res.ok) {
            toast.success("Room Code verified successfully!", {
                position: "top-center"
            })
            router.push(`/quiz/${roomCode}`)
        } else {
            toast.error("Invalid Room Code. Please try again!", {
                position: "top-center"
            })
        }
    } catch (err) {
        console.error("Error verifying the room code:", err)
        toast.error("Error verifying the room code", {
            position: "top-center"
        })
    }
}

export const checkAuth = async (toast: any, router: any) => {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}auth/student/check`, {
            credentials: "include"
        })

        if (!res.ok) {
            toast.error("Please login to continue", {
                position: "top-center"
            })
        }

        router.push("/login/student")
    } catch (err) {
        console.error("Error checking authentication", err)
        toast.error("Error during authentication. Please try again.", { 
            position: "top-center" 
        })
        router.push("/login/student")
    }
}