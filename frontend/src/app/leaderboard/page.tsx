"use client"

import { useEffect, useState } from "react"

interface LeaderbaordEntry {
    studentName: string,
    score: number,
    rank: number
}

export default function Leaderboard({ params }: { params : { roomCode: string }}) {
    const [leaderboard, setLeaderboard] = useState<LeaderbaordEntry[]>([])

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const response = await fetch(
                    `http://localhost:6573/api/quiz/leaderboard/${params.roomCode}`
                )

                const data = await response.json()

                if (response.ok) {
                    setLeaderboard(data.leaderboard)
                }
            } catch (err) {
                console.error("Error fetching leaderboard", err)
            }
        }
        fetchLeaderboard()
    }, [params.roomCode])

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <h1 className="text-3xl">Leaderbaord</h1>
            <div className="w-full max-w-lg bg-white p-6 rounded shawdow">
                <table className="table-auto w-full">
                    <thead>
                        <tr>
                            <th className="px-4 py-2">Rank</th>
                            <th className="px-4 py-2">Name</th>
                            <th className="px-4 py-2">Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaderboard.map((entry, index) => (
                            <tr key={index} className="text-center">
                                <td className="border px-4 py-2">{entry.rank}</td>
                                <td className="border px-4 py-2">{entry.studentName}</td>
                                <td className="border px-4 py-2">{entry.score}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}