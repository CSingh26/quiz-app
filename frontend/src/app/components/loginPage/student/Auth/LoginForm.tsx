"use client"
import Link from "next/link"

import React, { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

import PasswordInput from "./PasswordInput"

interface LoginFormProps {
    handleLogin: (
        username: string,
        password: string
    ) => void
}

export default function LoginForm({ handleLogin}: LoginFormProps) {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")

    const onSubmit = () => {
        handleLogin(username, password)
    }

    return (
        <div className="w-full max-w-md px-6">
            <ToastContainer 
                position="top-left"
                autoClose={3000}
            />
            <h1 className="text-center text-7xl font-bold text-[#ac53a6] mb-6">Login</h1>
            <div className="space-y-4">
                <div>
                    <Label htmlFor="username" className="text-2xl text-[#ac53a6]">
                        Username
                    </Label>
                    <Input 
                        id="username"
                        type="text"
                        placeholder="Enter your Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="mt-2 text-white bg-[#00004d] placeholder:text-white 
                                          placeholder-opacity-100 focus:outline-none focus:ring-2 
                                        focus:ring-blue-500 rounded-lg px-5 py-7 pr-12"
                    />
                </div>
                <PasswordInput 
                    value={password}
                    onChange={(value: string) => setPassword(value)}
                />
                <Button
                    onClick={onSubmit}
                    style={{
                        backgroundColor: '#ac53a6'
                    }}
                    className="text-3xl w-full py-5 bg-white text-[#00004d] font-bold 
                               rounded-lg shadow-lg hover:shadow-2xl hover:scale-105 hover:text-lg 
                               transition-all duration-300 active:scale-95 active:shadow-md 
                               focus:outline-none"
                >
                    Login
                </Button>
            </div>
            <p
                className="mt-6 text-center text-gray-600 text-xl"
            >
                Don't have an account?{" "}
                <Link href="/register" className="text-[#00004d] underline">
                    Register Here
                </Link>
            </p>
        </div>
    )
}