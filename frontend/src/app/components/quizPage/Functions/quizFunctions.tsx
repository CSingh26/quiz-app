import { toast } from "react-toastify"

export const fetchQuestions = async (
  roomCode: string,
  setQuestions: React.Dispatch<React.SetStateAction<any[]>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  router: any
) => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}quiz/${encodeURIComponent(roomCode)}/get-questions`
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
      toast.error("Failed to fetch questions", { position: "top-center" })
      router.push("/dashboard/student")
    }
  } catch (err) {
    toast.error("Error fetching questions. Redirecting...", { position: "top-center" })
    router.push("/dashboard/student")
  } finally {
    setLoading(false)
  }
}

export const submitQuiz = async (
  roomCode: string,
  answers: Record<string, string>,
  router: any
) => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}quiz/submit-quiz`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ roomCode, answers }),
    })

    if (response.ok) {
      toast.success("Quiz submitted successfully", { position: "top-center" })
      router.push(`/leaderboard/${roomCode}`)
    } else {
      toast.error("Failed to submit quiz", { position: "top-center" })
    }
  } catch (err) {
    toast.error("Error submitting quiz. Please try again.", { position: "top-center" })
  }
}
