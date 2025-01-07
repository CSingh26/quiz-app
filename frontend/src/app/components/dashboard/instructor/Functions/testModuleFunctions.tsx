import { toast } from "react-toastify"

export const fetchModules = async (
  setModules: React.Dispatch<React.SetStateAction<{ name: string; id: string }[]>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => {
  setLoading(true)
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}tests/get-modules`)
    if (response.ok) {
      const data = await response.json()
      setModules(data.modules || [])
      toast.success("Modules loaded successfully", { position: "top-center" })
    } else {
      toast.error("Error fetching modules", { position: "top-center" })
    }
  } catch (err) {
    toast.error("Error loading modules", { position: "top-center" })
  } finally {
    setLoading(false)
  }
}

export const uploadModule = async (
  file: File | null,
  moduleName: string,
  setFile: React.Dispatch<React.SetStateAction<File | null>>,
  setModuleName: React.Dispatch<React.SetStateAction<string>>,
  fetchModulesCallback: () => void,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => {
  if (!file || !moduleName.trim()) {
    toast.error("Both file and module name are required", { position: "top-center" })
    return
  }

  const formData = new FormData()
  formData.append("testFile", file)
  formData.append("testModuleName", moduleName)

  setLoading(true)
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}tests/upload-test`, {
      method: "POST",
      body: formData,
    })
    if (response.ok) {
      toast.success("Module uploaded successfully", { position: "top-center" })
      setFile(null)
      setModuleName("")
      fetchModulesCallback()
    } else {
      toast.error("Error uploading module", { position: "top-center" })
    }
  } catch (err) {
    toast.error("Error uploading module", { position: "top-center" })
  } finally {
    setLoading(false)
  }
}

export const deleteModule = async (
  id: string,
  setModules: React.Dispatch<React.SetStateAction<{ name: string; id: string }[]>>
) => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}tests/delete-module/${id}`, {
      method: "DELETE",
    })
    if (response.ok) {
      toast.success("Module deleted successfully!", { position: "top-center" })
      setModules((prev) => prev.filter((module) => module.id !== id))
    } else {
      toast.error("Error deleting module", { 
        position: "top-center" 
      })
    }
  } catch (err) {
    toast.error("Error deleting module", { 
      position: "top-center" 
    })
  }
}