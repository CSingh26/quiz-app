"use client"

import { useState } from "react"
import Link from "next/link"

export default function StudentSignUp() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [name, setName] = useState('')

    const isValidLength = password.length >= 8
    const hasUpperCase = /[A-Z]/.test(password)
    const hasNumber = /\d/.test(password)
    const hasSpecialChar = /[@#$%^&*?!]/.test(password)
    const passwordsMatch = (password == confirmPassword)

    const handleSignup = async () => {
        try {
            const resposne = await fetch("http://localhost:6573/api/auth/student/signup", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    name,
                    password
                })
            })

            const data = await resposne.json()

            if (resposne.ok) {
                alert("Signup Successfull!")
            } else {
                alert(data.message || "Signup Failed")
            }
        } catch (err) {
            console.log(err)
        }
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
          <h1 className="text-2xl font-bold mb-4">Student Sign Up</h1>
          <input
            type="text"
            placeholder="Name"
            className="mb-2 px-4 py-2 border rounded"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Username"
            className="mb-2 px-4 py-2 border rounded"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <div className="mb-4">
        <input
          type="password"
          placeholder="Password"
          className="mb-2 px-4 py-2 border rounded w-full"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <ul className="text-sm">
          <li className={isValidLength ? "text-green-500" : "text-red-500"}>
            At least 8 characters
          </li>
          <li className={hasUpperCase ? "text-green-500" : "text-red-500"}>
            At least one uppercase letter
          </li>
          <li className={hasNumber ? "text-green-500" : "text-red-500"}>
            At least one number
          </li>
          <li className={hasSpecialChar ? "text-green-500" : "text-red-500"}>
            At least one special character (@$!%*?&)
          </li>
        </ul>
      </div>
      <div className="mb-4">
        <input
          type="password"
          placeholder="Confirm Password"
          className="mb-2 px-4 py-2 border rounded w-full"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {confirmPassword.length > 0 && (
          <p
            className={
              passwordsMatch
                ? "text-green-500 text-sm"
                : "text-red-500 text-sm"
            }
          >
            {passwordsMatch
              ? "Passwords match"
              : "Passwords do not match"}
          </p>
        )}
      </div>
          <button
            onClick={handleSignup}
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Sign Up
          </button>
          <p className="mt-4">
            Already have an account? <Link href="/login/student">Login here</Link>.
          </p>
        </div>
      )
}