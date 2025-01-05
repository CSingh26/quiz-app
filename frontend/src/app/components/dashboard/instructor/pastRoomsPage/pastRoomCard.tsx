import React from "react"
import { Room } from "./roomInterface"

const PastRoomCard: React.FC<Room> = ({ name, moduleName, maxScore, meanScore, minScore }) => (
  <div className="p-8 bg-[#eab2bb] text-[#00004d] rounded-xl shadow-lg w-auto h-auto flex-col justify-center items-start">
    <h2 className="text-xl font-bold mb-4">{name}</h2>
    <p className="text-sm">
      <strong>Test Module:</strong> {moduleName}
    </p>
    <p className="text-sm">
      <strong>Max Score:</strong> {maxScore}
    </p>
    <p className="text-sm">
      <strong>Mean Score:</strong> {meanScore}
    </p>
    <p className="text-sm">
      <strong>Min Score:</strong> {minScore}
    </p>
  </div>
)

export default PastRoomCard