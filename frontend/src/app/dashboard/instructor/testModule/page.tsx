"use client"

import React, { useState, useEffect } from "react"

const TestModulePage: React.FC = () => {
  const [view, setView] = useState<"upload" | "view">("upload")
  const [modules, setModules] = useState<{ name: string; id: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    if (view === "view") {
      fetchModules()
    }
  }, [view])

  const fetchModules = async () => {
    try {
      setLoading(true)
      const response = await fetch("http://localhost:6573/api/tests/getModules")
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

    const formData = new FormData()
    formData.append("testModule", file)

    try {
      setLoading(true)
      const response = await fetch("http://localhost:6573/api/tests/upload-test", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        alert("Module uploaded")
        setFile(null)
        fetchModules()
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
        alert("Module deleted")
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
              <label className="block mb-2 text-center">Choose Your Test Module</label>
              <div className="realtive w-3/4 max-w-md mb-6">
                <input
                    type="file"
                    accept="application/json"
                    id="fileUpload"
                    className="opacity-0 absolute w-full h-full cursor-pointer"
                    onChange={handleFileChange}
                />
                <div className="bg-[#ac53a6] h-12 w-full rounded-full flex items-center justify-center cursor-pointer">
                  <span className="text-white font-bold text-sm">
                    {file ? file.name : "CHOOSE FILE"}
                  </span>
                </div>
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
    "question": "What does EC2 stand for?",
    "options": ["Elastic Cloud Compute", "Elastic Compute Cloud", "Elastic Container Compute", "Elastic Code Cloud"],
    "answer": "Elastic Compute Cloud"
  },
  {
    "question": "Which AWS service is used for object storage?",
    "options": ["Amazon S3", "Amazon RDS", "Amazon DynamoDB", "Amazon Redshift"],
    "answer": "Amazon S3"
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
  }
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