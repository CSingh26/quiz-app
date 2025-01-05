import { toast } from "react-toastify"

export const fetchTestModules = async (
  setTestModules: React.Dispatch<React.SetStateAction<{ name: string; id: string }[]>>
) => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}tests/get-modules`)
    if (response.ok) {
      const data = await response.json()
      setTestModules(data.modules || [])
      toast.success("Test modules loaded successfully", { 
        position: "top-center" 
      })
    } else {
      toast.error("Failed to fetch test modules", { 
        position: "top-center" 
    })
    }
  } catch (err) {
    console.error("Error fetching test modules", err)
    toast.error("Error loading test modules", { 
        position: "top-center" 
    })
  }
}

export const createRoom = async (
  formData: {
    roomName: string
    roomCode: string
    startDate: string
    startTime: string
    endTime: string
    testModule: string
  },
  setFormData: React.Dispatch<
    React.SetStateAction<{
      roomName: string
      roomCode: string
      startDate: string
      startTime: string
      endTime: string
      testModule: string
    }>
  >,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const requestBody = {
    roomName: formData.roomName,
    roomCode: formData.roomCode,
    testModule: formData.testModule,
    startDate: formData.startDate,
    startTime: formData.startTime,
    endTime: formData.endTime,
  }

  setLoading(true)

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}room/create-room`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })
    if (response.ok) {
      toast.success("Room created successfully", { 
        position: "top-center" 
    })
      setFormData({
        roomName: "",
        roomCode: "",
        startDate: "",
        startTime: "",
        endTime: "",
        testModule: "",
      })
    } else {
      const errorData = await response.json()
      toast.error(`Failed to create room: ${errorData.message}`, { position: "top-center" })
    }
  } catch (err) {
    console.error("Error creating room", err)
    toast.error("An error occurred while creating the room", { 
        position: "top-center" 
    })
  } finally {
    setLoading(false)
  }
}