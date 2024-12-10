"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"

interface Question {
    id: string
    text: string
    options: { label: string; text: string; id: string }[]
}

export default function Quiz() {
    const router = useRouter()

    const [questions, setQuestions] = useState<Question[]>([])
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [submitted, setSubmitted] = useState(false)
    const [loading, setLoading] = useState(true)
    const { roomCode } = useParams() as { roomCode: string }

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                console.log("Fetching questions for room code:", roomCode)

                const response = await fetch(
                    `http://localhost:6573/api/quiz/${encodeURIComponent(roomCode)}/get-questions`
                )

                const data = await response.json()
                console.log("Fetched Questions:", data)

                if (response.ok) {
                    setQuestions(
                        data.questions.map((q: any) => ({
                            ...q,
                            options: q.options.sort(() => Math.random() - 0.5),
                        }))
                    )
                } else {
                    console.error("Error fetching questions:", data.message || "Unknown error")
                    alert("Failed to fetch questions")
                    router.push("/dashboard/student")
                }
            } catch (err) {
                console.error("Error fetching quiz questions:", err)
                router.push("/dashboard/student")
            } finally {
                setLoading(false)
            }
        }

        fetchQuestions()
    }, [roomCode, router])

    const handleOptionSelect = (questionId: string, option: string) => {
        setAnswers((prev) => ({ ...prev, [questionId]: option }))
    }

    const handleSubmit = async () => {
        try {
            const response = await fetch("http://localhost:6573/api/quiz/submit-quiz", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    roomCode: roomCode,
                    answers,
                }),
            })

            if (response.ok) {
                alert("Quiz submitted successfully")
                setSubmitted(true)
                router.push(`/leaderboard/${roomCode}`)
            } else {
                alert("Failed to submit quiz")
            }
        } catch (err) {
            console.error("Error submitting quiz:", err)
        }
    }

    if (submitted) {
        return <p>Submitting your quiz...</p>
    }

    if (loading) {
        return <p>Loading quiz questions...</p>
    }

    const currentQuestion = questions[currentQuestionIndex]

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <h1 className="text-3xl font-bold mb-4">Quiz</h1>
            {currentQuestion ? (
                <div className="w-full max-w-lg bg-white p-6 rounded shadow">
                    <p className="text-lg font-bold mb-4">
                        Question {currentQuestionIndex + 1} of {questions.length}
                    </p>
                    <p className="mb-4">{currentQuestion.text}</p>
                    <div className="mb-4">
                        {currentQuestion.options.map((option, index) => (
                            <button
                                key={index}
                                className={`w-full mb-2 px-4 py-2 rounded ${
                                    answers[currentQuestion.id] === option.text
                                        ? "bg-green-500 text-white"
                                        : "bg-gray-200"
                                }`}
                                onClick={() => handleOptionSelect(currentQuestion.id, option.text)}
                            >
                                {String.fromCharCode(97 + index)}. {option.text}
                            </button>
                        ))}
                    </div>
                    <div className="mt-4 flex justify-between">
                        <button
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            disabled={currentQuestionIndex === 0}
                            onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                        >
                            Previous
                        </button>
                        <button
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            disabled={currentQuestionIndex === questions.length - 1}
                            onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                        >
                            Next
                        </button>
                    </div>
                    {currentQuestionIndex === questions.length - 1 && (
                        <button
                            className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                            onClick={handleSubmit}
                        >
                            Submit Quiz
                        </button>
                    )}
                </div>
            ) : (
                <p>No questions available.</p>
            )}
        </div>
    )
}