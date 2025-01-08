import React from "react"

interface QuizNavigationProps {
  currentIndex: number
  totalQuestions: number
  onPrevious: () => void
  onNext: () => void
  onSubmit: () => void
}

const QuizNavigation: React.FC<QuizNavigationProps> = ({
  currentIndex,
  totalQuestions,
  onPrevious,
  onNext,
  onSubmit,
}) => {
  return (
    <div className="flex justify-between mt-6 w-full max-w-2xl">
      <button
        className={`custom-font-2 bg-[#eab2bb] hover:bg-pink-500 hover:text-white text-[#2d2e73] py-2 px-6 rounded-full font-bold ${
          currentIndex === 0 ? "opacity-50 cursor-not-allowed" : ""
        }`}
        disabled={currentIndex === 0}
        onClick={onPrevious}
      >
        PREVIOUS
      </button>
      {currentIndex === totalQuestions - 1 ? (
        <button
          className="custom-font-2 bg-[#eab2bb] hover:bg-pink-500 hover:text-white text-[#2d2e73] py-2 px-6 rounded-full font-bold"
          onClick={onSubmit}
        >
          SUBMIT
        </button>
      ) : (
        <button
          className="custom-font-2 bg-[#eab2bb] hover:bg-pink-500 hover:text-white text-[#2d2e73] py-2 px-6 rounded-full font-bold"
          onClick={onNext}
        >
          NEXT
        </button>
      )}
    </div>
  )
}

export default QuizNavigation