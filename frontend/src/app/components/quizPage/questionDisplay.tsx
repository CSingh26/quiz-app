import React from "react"

interface Question {
  id: string
  text: string
  options: { label: string; text: string; id: string }[]
}

interface QuestionDisplayProps {
  question: Question
  selectedAnswer: string | undefined
  onSelect: (questionId: string, option: string) => void
}

const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  question,
  selectedAnswer,
  onSelect,
}) => {
  return (
    <div className="bg-[#2d2e73] rounded-3xl shadow-lg w-full max-w-2xl p-8 text-center">
      <p className="text-xl mb-6 custom-font-3 text-[#eab2bb]">{question.text}</p>
      <div className="flex flex-col gap-4 mb-6">
        {question.options.map((option, index) => (
          <button
            key={option.id}
            className={`py-3 px-6 text-lg font-bold rounded-full transition-all custom-font-2 ${
              selectedAnswer === option.text
                ? "bg-pink-400 text-[#2d2e73] border-4 border-blue-300"
                : "bg-[#eab2bb] text-[#00004d] hover:bg-pink-500 hover:text-white"
            }`}
            onClick={() => onSelect(question.id, option.text)}
          >
            {String.fromCharCode(65 + index)}. {option.text}
          </button>
        ))}
      </div>
    </div>
  )
}

export default QuestionDisplay
