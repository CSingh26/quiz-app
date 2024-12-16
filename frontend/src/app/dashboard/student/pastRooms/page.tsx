"use client"

import React from "react"

const PastRooms = () => {
    const pastQuizzes = [
        { id: "1", name: "Quiz 1", score: "85%" },
        { id: "2", name: "Quiz 2", score: "90%" },
    ]

    return (
        <div>
            <h1>Past Quizzes</h1>
            <ul>
                {pastQuizzes.map((quiz) => (
                    <li key={quiz.id} className="bg-[#00004d] p-4 rounded-lg">
                        <h2 className="text-lg font-semibold">{quiz.name}</h2>
                        <p>Score: {quiz.score}</p>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default PastRooms