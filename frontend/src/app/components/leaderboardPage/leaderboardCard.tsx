import React from "react"
import { LeaderboardEntry } from "./types"

interface LeaderboardCardProps {
  entry: LeaderboardEntry
}

const LeaderboardCard: React.FC<LeaderboardCardProps> = ({ entry }) => {
  return (
    <div className="flex items-center justify-between bg-[#eab2bb] text-[#2d2e73] rounded-lg px-4 py-3 mb-4 shadow">
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
  )
}

export default LeaderboardCard