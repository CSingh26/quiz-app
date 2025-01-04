"use client"

import Link from "next/link"

export default function Page() {
  return (
    <div className="min-h-screen bg-[#3c6ca8] text-white flex flex-col items-center">
      <div className="text-center mt-6">
        <h1 className="text-5xl font-bold mb-2 custom-font-4">QuizBee</h1>
        <p className="text-2xl font-semibold custom-font-4">Quiz Smarter, Learn Faster</p>
      </div>

      <div className="w-full text-center mt-40 custom-font-2">
        <h2 className="text-3xl font-bold mb-4">FEATURES</h2>
      </div>

      <div className="w-full bg-[#eab2bb] rounded-full py-10 px-6 shadow-md mt-10 custom-font-2">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
          <div>
            <img
              src="/Assests/HomePage/Upload.png"
              alt="Upload Quiz"
              className="w-16 h-16 mx-auto mb-4"
            />
            <p className="font-semibold">UPLOAD QUIZ AS INSTRUCTOR</p>
          </div>
          <div>
            <img
              src="/Assests/HomePage/MakeRoom.png"
              alt="Create Room"
              className="w-16 h-16 mx-auto mb-4"
            />
            <p className="font-semibold">MAKE QUIZ ROOMS AS INSTRUCTOR</p>
          </div>
          <div>
            <img
              src="/Assests/HomePage/TakeQuiz.png"
              alt="Take Quiz"
              className="w-16 h-16 mx-auto mb-4"
            />
            <p className="font-semibold">TAKE QUIZ AS A STUDENT</p>
          </div>
          <div>
            <img
              src="/Assests/HomePage/Ranking.png"
              alt="Ranking"
              className="w-16 h-16 mx-auto mb-4"
            />
            <p className="font-semibold">SEE YOUR RANKING IN THE QUIZ</p>
          </div>
        </div>
      </div>

      <div className="mt-16 flex gap-8 custom-font-2">
        <Link
          href="/login/student"
          className="bg-white text-[#3c6ca8] px-10 py-4 rounded-full font-bold text-lg shadow hover:scale-105 transition-transform"
        >
          LOGIN AS STUDENT
        </Link>
        <Link
          href="/login/instructor"
          className="bg-white text-[#3c6ca8] px-10 py-4 rounded-full font-bold text-lg shadow hover:scale-105 transition-transform"
        >
          LOGIN AS INSTRUCTOR
        </Link>
      </div>
    </div>
  )
}