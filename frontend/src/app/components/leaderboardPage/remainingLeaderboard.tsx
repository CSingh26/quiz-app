import React from "react"
import { LeaderboardEntry } from "./types"
import LeaderboardCard from "./leaderboardCard"

interface RemainingLeaderboardProps {
  entries: LeaderboardEntry[]
}

const RemainingLeaderboard: React.FC<RemainingLeaderboardProps> = ({ entries }) => {
  return (
    <div className="bg-[#2d2e73] text-[#eab2bb] rounded-lg shadow-lg p-6 w-4/5">
      {entries.length > 0 ? (
        entries.map((entry) => <LeaderboardCard key={entry.rank} entry={entry} />)
      ) : (
        <p className="text-center text-[#eab2bb] mt-4">No additional data available.</p>
      )}
    </div>
  )
}

export default RemainingLeaderboard