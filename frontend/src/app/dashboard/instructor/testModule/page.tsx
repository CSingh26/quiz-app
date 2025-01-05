"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import TestModuleUpload from "../../../components/dashboard/instructor/testModulePage/uploadModuleView"
import TestModuleView from "../../../components/dashboard/instructor/testModulePage/moduleView"
import { 
  fetchModules, 
  uploadModule, 
  deleteModule 
} from "../../../components/dashboard/instructor/Functions/testModuleFunctions"

const TestModulePage: React.FC = () => {
  const [view, setView] = useState<"upload" | "view">("upload")
  const [modules, setModules] = useState<{ name: string; id: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [moduleName, setModuleName] = useState<string>("")
  const router = useRouter()

  useEffect(() => {
    const initialize = async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}auth/ins/check`, {
        credentials: "include",
      })
      if (!response.ok) router.push("/login/instructor")
    }

    initialize()
  }, [router])

  useEffect(() => {
    if (view === "view") fetchModules(setModules, setLoading)
  }, [view])

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
        <TestModuleUpload
          file={file}
          moduleName={moduleName}
          setFile={setFile}
          setModuleName={setModuleName}
          handleUpload={(e) => {
            e.preventDefault()
            uploadModule(file, moduleName, setFile, setModuleName, () =>
              fetchModules(setModules, setLoading), setLoading
            )
          }}
          loading={loading}
        />
      ) : (
        <TestModuleView
          modules={modules}
          deleteModule={(id) => deleteModule(id, setModules)}
          loading={loading}
        />
      )}
    </div>
  )
}

export default TestModulePage