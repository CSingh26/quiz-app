"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

const TestModulePage: React.FC = () => {
  const [view, setView] = useState<"upload" | "view">("upload")
  const [modules, setModules] = useState<{ name: string; id: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [moduleName, setModuleName] = useState<string>("")
  const router = useRouter()

  const checkAuth = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}auth/ins/check`, {
        credentials: "include",
      })

      if (!res.ok) {
        toast.error("Please login as Instructor", { 
          position: "top-center" 
        })
        router.push("/login/instructor")
      }
    } catch (err) {
      console.error("Error checking authentication", err)
      toast.error("Authentication error. Redirecting to login.", { 
        position: "top-center" 
      })
      router.push("/login/instructor")
    }
  }

  useEffect(() => {
    const initialize = async () => {
      await checkAuth()
      if (view === "view") {
        fetchModules()
      }
    }

    initialize()
  }, [view])

  const fetchModules = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}tests/get-modules`)
      if (response.ok) {
        const data = await response.json()
        setModules(data.modules || [])
        toast.success("Modules loaded successfully", { 
          position: "top-center" 
        })
      } else {
        toast.error("Error fetching modules", { 
          position: "top-center" 
        })
      }
    } catch (err) {
      console.error("Error fetching modules", err)
      toast.error("Error loading modules", { 
        position: "top-center" 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
  }

  const uploadModule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!file) {
      toast.error("Please select a file", { 
        position: "top-center" 
      })
      return
    }

    if (!moduleName.trim()) {
      toast.error("Please enter a module name", { 
        position: "top-center" 
      })
      return
    }

    const formData = new FormData()
    formData.append("testFile", file)
    formData.append("testModuleName", moduleName)

    try {
      setLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}tests/upload-test`, {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        toast.success("Module uploaded successfully!", { 
          position: "top-center" 
        })
        setFile(null)
        setModuleName("")
        fetchModules()
      } else {
        toast.error("Error uploading module", { 
          position: "top-center" 
        })
      }
    } catch (err) {
      console.error("Error uploading module", err)
      toast.error("Error uploading module", { 
        position: "top-center" 
      })
    } finally {
      setLoading(false)
    }
  }

  const deleteModule = async (id: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}tests/delete-module/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Module deleted successfully!", { 
          position: "top-center" 
        })
        setModules((prev) => prev.filter((module) => module.id !== id))
      } else {
        toast.error("Error deleting module", { 
          position: "top-center" 
        })
      }
    } catch (err) {
      console.error("Error deleting module", err)
      toast.error("Error deleting module", { 
        position: "top-center" 
      })
    }
  }

  return (
    <div className="w-full h-full flex flex-col items-center p-8 bg-[#3c6ca8] text-white custom-font-2">
      <ToastContainer position="top-center" autoClose={3000} />
      <div className="flex justify-center gap-8 mb-6">
        <button
          onClick={() => setView("upload")}
          className={`px-4 py-2 font-bold ${view === "upload" ? "underline" : ""}`}
        >
          Upload Test Module
        </button>
        <button
          onClick={() => setView("view")}
          className={`px-4 py-2 font-bold ${view === "view" ? "underline" : ""}`}
        >
          Uploaded Modules
        </button>
      </div>
      {view === "upload" ? (
        <div className="flex flex-row justify-between items-start gap-8 w-full h-full">
          <div className="bg-[#00004d] p-6 rounded-3xl shadow-lg w-1/2 flex flex-col justify-center items-center h-full">
            <h2 className="text-xl font-bold mb-4 text-center">Upload Your Test Module</h2>
            <form onSubmit={uploadModule} className="w-full flex flex-col items-center">
              <label htmlFor="moduleName" className="block mb-2 text-center">
                Test Module Name
              </label>
              <input
                type="text"
                id="moduleName"
                value={moduleName}
                onChange={(e) => setModuleName(e.target.value)}
                className="mb-4 p-2 border border-gray-300 w-3/4 text-black rounded-full"
                placeholder="Enter module name"
              />
              <label htmlFor="fileUpload" className="block mb-2 text-center">
                Choose Your Test Module
              </label>
              <div className="relative w-3/4 max-w-md mb-6">
                <input
                  type="file"
                  accept="application/json"
                  id="fileUpload"
                  name="testFile"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <label
                  htmlFor="fileUpload"
                  className="bg-[#ac53a6] h-12 w-full rounded-full flex items-center justify-center cursor-pointer"
                >
                  <span className="text-white font-bold text-sm">
                    {file ? file.name : "CHOOSE FILE"}
                  </span>
                </label>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-[#eab2bb] text-black font-bold rounded-full"
              >
                {loading ? "Uploading..." : "Upload Module"}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4">
          {loading ? (
            <p>Loading...</p>
          ) : modules.length === 0 ? (
            <p>No modules available</p>
          ) : (
            modules.map((module) => (
              <div
                key={module.id}
                className="bg-[#eab2bb] text-black p-4 rounded-lg shadow w-64"
              >
                <h3 className="font-bold text-center mb-2">{module.name}</h3>
                <button
                  onClick={() => deleteModule(module.id)}
                  className="px-4 py-2 bg-red-500 text-white font-bold rounded"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default TestModulePage