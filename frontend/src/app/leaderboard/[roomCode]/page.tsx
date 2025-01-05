"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

interface LeaderboardEntry {
    studentName: string
    score: number
    rank: number
    timeTaken: string
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
                const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}quiz/${encodeURIComponent(roomCode)}/leaderboard`
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

    const topThree = leaderboard.slice(0, 3)
    const remaining = leaderboard.slice(3)

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#3c6ca8] custom-font-2">
            <h1 className="text-5xl font-bold mb-10 text-[#eab2bb]">Leaderboard</h1>

            {/* Top 3 Section */}
            <div className="flex gap-4 mb-8">
                {topThree.map((entry, index) => (
                    <div
                        key={entry.rank}
                        className={`flex flex-col items-center justify-center bg-[#2d2e73] text-white rounded-lg p-6 w-52 h-40 shadow-lg ${
                            index === 1 ? "scale-110" : ""
                        }`}
                    >
                        <div className="w-16 h-16 bg-white rounded-full mb-2 flex items-center justify-center">
                            <img
                                src="/Assests/Images/default-user.png"
                                alt="Profile"
                                className="rounded-full object-cover w-full h-full"
                            />
                        </div>
                        <h2 className="text-sm font-bold">{entry.studentName.toUpperCase()}</h2>
                        <p className="text-xs">RANK: {entry.rank}</p>
                        <p className="text-xs">SCORE: {entry.score}</p>
                    </div>
                ))}
            </div>

            {/* Remaining Section */}
            <div className="bg-[#2d2e73] text-[#eab2bb] rounded-lg shadow-lg p-6 w-4/5">
                {remaining.map((entry) => (
                    <div
                        key={entry.rank}
                        className="flex items-center justify-between bg-[#eab2bb] text-[#2d2e73] rounded-lg px-4 py-3 mb-4 shadow"
                    >
                        <p>
                            <strong>RANK:</strong> {entry.rank}
                        </p>
                        <p>
                            <strong>NAME:</strong> {entry.studentName}
                        </p>
                        <p>
                            <strong>SCORE:</strong> {entry.score}
                        </p>
                        <p>
                            <strong>TIME TAKEN:</strong> {entry.timeTaken || "N/A"}
                        </p>
                    </div>
                ))}
            </div>

            {remaining.length === 0 && (
                <p className="text-center text-[#eab2bb] mt-4">No additional data available.</p>
            )}
        </div>
    )
}