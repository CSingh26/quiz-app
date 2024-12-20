"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

interface LeaderboardEntry {
    studentName: string
    score: number
    rank: number
}

export default function Leaderboard() {
    const { roomCode } = useParams() as { roomCode: string }


    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])

    useEffect(() => {
        if (!roomCode) {
            console.error("Room code is undefined")
            return
        }

        const fetchLeaderboard = async () => {
            try {
                const url = `http://localhost:6573/api/quiz/${encodeURIComponent(roomCode)}/leaderboard`
                console.log("Fetching leaderboard from:", url)

                const response = await fetch(url)

                if (response.ok) {
                    const data = await response.json()
                    console.log("Fetched leaderboard data:", data)
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

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <h1 className="text-3xl">Leaderboard</h1>
            <div className="w-full max-w-lg bg-white p-6 rounded shadow">
                <table className="table-auto w-full">
                    <thead>
                        <tr>
                            <th className="px-4 py-2">Rank</th>
                            <th className="px-4 py-2">Name</th>
                            <th className="px-4 py-2">Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaderboard.length > 0 ? (
                            leaderboard.map((entry, index) => (
                                <tr key={index} className="text-center">
                                    <td className="border px-4 py-2">{entry.rank}</td>
                                    <td className="border px-4 py-2">{entry.studentName}</td>
                                    <td className="border px-4 py-2">{entry.score}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={3} className="text-center text-gray-500 py-4">
                                    No leaderboard data available.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}