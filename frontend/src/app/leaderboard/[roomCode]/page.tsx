"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import TopThreeLeaderboard from "../../components/leaderboardPage/topThreeLeaderboard"
import RemainingLeaderboard from "../../components/leaderboardPage/remainingLeaderboard"

export interface LeaderboardEntry {
  studentName: string
  score: number
  rank: number
  timeTaken: string
}

const LeaderboardPage = () => {
  const { roomCode } = useParams() as { roomCode: string }
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])

  useEffect(() => {
    if (!roomCode) {
      console.error("Room code is undefined")
      return
    }

    const fetchLeaderboard = async () => {
      try {
        const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}quiz/${encodeURIComponent(
          roomCode
        )}/leaderboard`
        const response = await fetch(url)

        if (response.ok) {
          const data = await response.json()
          setLeaderboard(data.leaderboard || [])
        } else {
          console.error("Failed to fetch leaderboard:", response.statusText)
        }
      } catch (err) {
        console.error("Error fetching leaderboard:", err)
      }
    }

    fetchLeaderboard()
  }, [roomCode])

  const topThree = leaderboard.slice(0, 3)
  const remaining = leaderboard.slice(3)

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#3c6ca8] custom-font-2">
      <h1 className="text-5xl font-bold mb-10 text-[#eab2bb]">Leaderboard</h1>
      <TopThreeLeaderboard entries={topThree} />
      <RemainingLeaderboard entries={remaining} />
    </div>
  )
}

export default LeaderboardPage