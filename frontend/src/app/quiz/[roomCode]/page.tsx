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
                const response = await fetch(
                    `http://localhost:6573/api/quiz/${encodeURIComponent(roomCode)}/get-questions`
                )

                const data = await response.json()

                if (response.ok) {
                    setQuestions(
                        data.questions.map((q: any) => ({
                            ...q,
                            options: q.options.sort(() => Math.random() - 0.5),
                        }))
                    )
                } else {
                    alert("Failed to fetch questions")
                    router.push("/dashboard/student")
                }
            } catch (err) {
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
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#3c6ca8]">
            <h1 className="text-5xl font-bold mb-6 text-[#eab2bb] custom-font-2">QUIZ</h1>
            {currentQuestion ? (
                <div className="bg-[#2d2e73] rounded-3xl shadow-lg w-full max-w-2xl p-8 text-center">
                    <p className="text-2xl font-semibold text-[#eab2bb] mb-6 custom-font-2">
                        QUESTION {currentQuestionIndex + 1} OF {questions.length}
                    </p>

                    <p className="text-xl mb-6 custom-font-3 text-[#eab2bb]">{currentQuestion.text}</p>

                    {/* Options */}
                    <div className="flex flex-col gap-4 mb-6">
                        {currentQuestion.options.map((option, index) => (
                            <button
                                key={option.id}
                                className={`py-3 px-6 text-lg font-bold rounded-full transition-all custom-font-2 ${
                                    answers[currentQuestion.id] === option.text
                                        ? "bg-pink-400 text-[#2d2e73] border-4 border-blue-300"
                                        : "bg-[#eab2bb] text-[#00004d] hover:bg-pink-500 hover:text-white"
                                }`}
                                onClick={() => handleOptionSelect(currentQuestion.id, option.text)}
                            >
                                {String.fromCharCode(65 + index)}. {option.text}
                            </button>
                        ))}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex justify-between">
                        <button
                            className="custom-font-2 bg-[#eab2bb] hover:bg-pink-500 hover:text-white text-[#2d2e73] py-2 px-6 rounded-full font-bold"
                            disabled={currentQuestionIndex === 0}
                            onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                        >
                            PREVIOUS
                        </button>
                        {currentQuestionIndex === questions.length - 1 ? (
                            <button
                                className="custom-font-2 bg-[#eab2bb] hover:bg-pink-500 hover:text-white text-[#2d2e73] py-2 px-6 rounded-full font-bold"
                                onClick={handleSubmit}
                            >
                                SUBMIT
                            </button>
                        ) : (
                            <button
                                className="custom-font-2 bg-[#eab2bb] hover:bg-pink-500 hover:text-white text-[#2d2e73] py-2 px-6 rounded-full font-bold"
                                onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                            >
                                NEXT
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <p>No questions available.</p>
            )}
        </div>
    )
}