"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

const TestModulePage: React.FC = () => {

  const [view, setView] = useState<"upload" | "view">("upload")
  const [modules, setModules] = useState<{ name: string; id: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [moduleName, setModuleName] = useState<string>("")
  const router = useRouter()

  const checkAuth = async () => {
    try {
      const res = await fetch("http://localhost:6573/api/auth/instructor/check", {
        credentials: "include",
      })

      if (!res.ok) {
        alert("Please login as Instructor")
        router.push("/login/instructor")
      }
    } catch (err) {
      console.error("Error checking authentication", err)
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
      const response = await fetch("http://localhost:6573/api/tests/get-modules")
      if (response.ok) {
        const data = await response.json()
        setModules(data.modules || [])
      } else {
        console.error("Error fetching modules", response)
      }
    } catch (err) {
      console.error("Error fetching modules", err)
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
      alert("Please select a file")
      return
    }

    if (!moduleName.trim()) {
      alert("Please enter a module name")
      return
    }

    const formData = new FormData()
    formData.append("testFile", file)
    formData.append("testModuleName", moduleName)

    try {
      setLoading(true)
      const response = await fetch("http://localhost:6573/api/tests/upload-test", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        alert("Module uploaded successfully!")
        setFile(null)
        setModuleName("")
        fetchModules()
      } else {
        console.error("Error uploading module", response)
        alert("Error uploading module")
      }
    } catch (err) {
      console.error("Error uploading module", err)
      alert("Error uploading module")
    } finally {
      setLoading(false)
    }
  }

  const deleteModule = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:6573/api/tests/delete-module/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        alert("Module deleted successfully!")
        setModules((prev) => prev.filter((module) => module.id !== id))
      } else {
        alert("Error deleting module")
      }
    } catch (err) {
      console.error("Error deleting module", err)
      alert("Error deleting module")
    }
  }

  return (
    <div className="w-full h-full flex flex-col items-center p-8 bg-[#3c6ca8] text-white custom-font-2">
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

          <div className="bg-[#00004d] p-6 rounded-3xl shadow-lg w-1/2 h-full justify-center items-center">
            <h2 className="text-xl font-bold mb-4 text-center">Sample Test Module</h2>
            <pre className="bg-[#3c6ca8] p-4 rounded-lg text-left text-sm text-white overflow-auto custom-font-3">
              {`[
  {
    "question": "What is Amazon S3 used for?",
    "options": ["Compute resources", "Data storage", "Monitoring resources", "Networking"],
    "answer": "Data storage"
  },
  {
    "question": "What is the default region when using AWS CLI without specifying a region?",
    "options": ["us-west-1", "us-east-1", "ap-southeast-1", "eu-central-1"],
    "answer": "us-east-1"
  },
  {
    "question": "Which service helps developers store and retrieve any amount of data at any time?",
    "options": ["Amazon Glacier", "Amazon S3", "Amazon Elastic Block Store (EBS)", "Amazon Elastic File System (EFS)"],
    "answer": "Amazon S3"
  },
  {
    "question": "What type of database is Amazon RDS?",
    "options": ["NoSQL", "Relational database", "In-memory database", "Graph database"],
    "answer": "Relational database"
  },
  {
    "question": "Which AWS service is used for content delivery?",
    "options": ["Amazon CloudFront", "Amazon Route 53", "AWS Direct Connect", "Amazon VPC"],
    "answer": "Amazon CloudFront"
  },
]`}
            </pre>
            <p className="mt-4 text-center">
              Please refer to the documentation for the correct format of the test module file.
            </p>
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