"use client"

import { useState } from "react"
import Link from "next/link"

export default function StudentLogin() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')

    const handleLogin = async () => {
        try {
            const response = await fetch("http://localhost:6573/api/auth/student/login", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    password
                })
            })

            const data = await response.json()
            if (response.ok) {
                alert('Student Login Successfull')
            } else {
                alert(data.message || 'Login Failed')
            }
        } catch (err) {
            console.error('Login Error', err)
        }
    }

    return(
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <h1 className="text-3xl font-bold mb-4">Student Login</h1>
            <input 
            type="text"
            placeholder="Username"
            className="mb-2 px-4 py-2 border rounded"
            value={username}
            onChange={(e) => setUsername(e.target.value)} 
            />
            <input 
            type="password"
            placeholder="Password"
            className="mb-2 px-4 py-2 border rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)} 
            />
            <button
                onClick={handleLogin}
                className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
                Login
            </button>
            <Link href={'/register'}>
                Register Here!
            </Link>
        </div>
    )
}