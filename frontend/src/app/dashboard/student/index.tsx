"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

const StudentDashbaord = () => {
    const router = useRouter()

    useEffect(() => {
        router.push("/dashboard/student/profile")
    }, [router])

    return null
}

export default StudentDashbaord