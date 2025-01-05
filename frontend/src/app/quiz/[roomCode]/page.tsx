"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import QuestionDisplay from "../../components/quizPage/questionDisplay"
import QuizNavigation from "../../components/quizPage/quizNavigation"
import { 
    fetchQuestions, 
    submitQuiz
} from "../../components/quizPage/Functions/quizFunctions"

export default function QuizPage() {
  const { roomCode } = useParams() as { roomCode: string }
  const router = useRouter()

  const [questions, setQuestions] = useState<any[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchQuestions(roomCode, setQuestions, setLoading, router)
  }, [roomCode, router])

  const handleOptionSelect = (questionId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }))
  }

  const handleSubmit = async () => {
    await submitQuiz(roomCode, answers, router)
  }

  const currentQuestion = questions[currentQuestionIndex]

  if (loading) {
    return <p>Loading quiz questions...</p>
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#3c6ca8]">
      <ToastContainer position="top-center" autoClose={3000} />
      <h1 className="text-5xl font-bold mb-6 text-[#eab2bb] custom-font-2">QUIZ</h1>
      {currentQuestion ? (
        <>
          <QuestionDisplay
            question={currentQuestion}
            selectedAnswer={answers[currentQuestion.id]}
            onSelect={handleOptionSelect}
          />
          <QuizNavigation
            currentIndex={currentQuestionIndex}
            totalQuestions={questions.length}
            onPrevious={() => setCurrentQuestionIndex((prev) => prev - 1)}
            onNext={() => setCurrentQuestionIndex((prev) => prev + 1)}
            onSubmit={handleSubmit}
          />
        </>
      ) : (
        <p>No questions available.</p>
      )}
    </div>
  )
}
