"use client"

import "./globals.css"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import Head from "next/head"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false)
  const pathname = usePathname()  

  useEffect(() => {
    setIsMounted(true)
  }, []) 

  useEffect(() => {
    if (!isMounted) return

    const route = pathname

    let pageTitle = "Quizz-Bee"

    if (route.includes("activeRooms")) {
      if (route.includes("instructor")) {
        pageTitle = "Active Rooms - Instructor"
      } else if (route.includes("student")) {
        pageTitle = "Active Rooms - Student"
      }
    } else if (route.includes("pastRooms")) {
      if (route.includes("instructor")) {
        pageTitle = "Past Rooms - Instructor"
      } else if (route.includes("student")) {
        pageTitle = "Past Rooms - Student"
      }
    } else if (route.includes("login")) {
      if (route.includes("instructor")) {
        pageTitle = "Login - Instructor"
      } else if (route.includes("student")) {
        pageTitle = "Login - Student"
      }
    } else if (route.includes("quiz")) {
      pageTitle = "Quiz"
    } else if (route.includes("profile")) {
      pageTitle = "Profile"
    } else if (route.includes("register")) {
      pageTitle = "Register"
    }

    document.title = pageTitle
  }, [isMounted, pathname])  

  return (
    <html lang="en">
      <Head>
        <meta name="description" content="Quizing made easy for Genz" />
      </Head>
      <body>{children}</body>
    </html>
  )
}
