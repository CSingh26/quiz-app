import { PastQuiz } from "./roomInterface"

const PastRoomCard = ({ quiz }: { quiz: PastQuiz }) => {
    return (
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
    )
  }
  
  export default PastRoomCard