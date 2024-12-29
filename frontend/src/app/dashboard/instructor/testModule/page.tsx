"use client"

import React, { useState, useEffect } from 'react'

const TestModulePage: React.FC = () => {
    const [view, setView] = useState<"upload" | "view">("upload")
    const [modules, setModules] = useState<{ name: string; id: string}[]>([])
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
            console.error("Error fetcing modules", err)
        } finally {
            setLoading(false)
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        
    }

    return (
        <div>
            <h1>Active Rooms</h1>
            <p>This is the Active Rooms page for instructors.</p>
        </div>
    )
}

export default TestModulePage