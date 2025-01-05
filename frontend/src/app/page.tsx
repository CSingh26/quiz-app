"use client"

import Header from "./components/homePage/Header"
import Features from "./components/homePage/Features"
import LoginLinks from "./components/homePage/LoginLinks"

export default function Page() {
  return (
    <div className="min-h-screen bg-[3c6ca8] text-white flex-col flex items-center">
      <Header />
      <div className="w-full text-center mt-40 custom-font-2">
        <h2 className="text-3xl font-bold mb-4">Features</h2>
      </div>
      <Features />
      <LoginLinks />
    </div>
  )
}