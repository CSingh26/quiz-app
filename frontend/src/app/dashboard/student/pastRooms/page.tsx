"use client"

import React from "react"

const PastRooms = () => {
  const pastQuizzes = [
    { id: "1", name: "Quiz 1", attempted: 50, correct: 42, score: "85%", rank: 3 },
    { id: "2", name: "Quiz 2", attempted: 40, correct: 36, score: "90%", rank: 2 },
  ]

  return (
    <div className="w-full h-screen bg-[#3c6ca8] text-white p-8 custom-font-2">
      <h1 className="text-3xl font-bold mb-6">Past Quizzes</h1>

      {pastQuizzes.length === 0 ? (
        <div className="text-4xl font-bold text-center mt-20">No Past Quizzes</div>
      ) : (
        <div className="flex flex-wrap gap-4">
          {pastQuizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="flex flex-col bg-[#eab2bb] text-[#00004d] rounded-lg p-4 shadow-lg w-auto h-auto"
            >
              <h2 className="text-xl font-bold text-center mb-2">
                {quiz.name.toUpperCase()}
              </h2>
              <div className="text-sm font-semibold mb-2">
                <p>
                  <strong>QUESTIONS ATTEMPTED:</strong> {quiz.attempted}
                </p>
                <p>
                  <strong>CORRECT ANSWERS:</strong> {quiz.correct}
                </p>
                <p>
                  <strong>SCORE:</strong> {quiz.score}
                </p>
                <p>
                  <strong>RANK:</strong> {quiz.rank}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default PastRooms