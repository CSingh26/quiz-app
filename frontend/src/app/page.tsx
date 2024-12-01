"use client"

export default function Page() {
    return (
        <div className="bg-[#79bac1] h-screen flex flex-col justify-center items-center custom-font">
        <div className="bg-[#aeddcc] p-8 rounded-lg shadow-md flex flex-col items-center justify-center w-4/5 h-4/5">
          <h1 className="text-6xl font-bold mb-10">Welcome to Grass Quiz Portal</h1>
          <h2 className="text-3xl mb-10">Please choose from the below options</h2>
          <div className="flex gap-6">
            <button className="px-6 py-2 bg-[#79bac1] text-white rounded-md hover:bg-[#2a7886] transition">
              Student
            </button>
            <button className="px-6 py-2 bg-[#79bac1] text-white rounded-md hover:bg-[#2a7886] transition">
              Instructor
            </button>
          </div>
        </div>
      </div>
    )
}