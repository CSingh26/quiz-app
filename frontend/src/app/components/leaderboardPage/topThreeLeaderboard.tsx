import React from "react"
import { LeaderboardEntry } from "./types"

interface TopThreeLeaderboardProps {
  entries: LeaderboardEntry[]
}

const TopThreeLeaderboard: React.FC<TopThreeLeaderboardProps> = ({ entries }) => {
  return (
    <div className="flex gap-4 mb-8">
      {entries.map((entry, index) => (
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
  )
}

export default TopThreeLeaderboard