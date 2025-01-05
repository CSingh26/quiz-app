"use client"

import React, { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff } from "lucide-react"

interface PasswordInputProps {
    value: string
    onChange: (value: string) => void
}

export default function PasswordInput({ value, onChange}: PasswordInputProps) {
    const [showPassword, setShowPassword] = useState(false)

    return (
        <div className="relative">
            <Label htmlFor="password" className="text-2xl text-[#ac53a6]">
                Password
            </Label>
            <Input 
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="mt-2 text-white bg-[#00004d] placeholder:text-white placeholder-opacity-100 
                           focus:outline-none focus:ring-blue-500 rounded-lg px-5 py-7 pr-12"
            />
            <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-white absolute top-[calc(50%+12px)] right-3 flex items-center 
                           hover:text-white focus:outline-none transform -translate-y-1/2"
                style={{ padding: 0, background: "none"}}
            >
                {showPassword ? (
                    <EyeOff size={20} aria-hidden="true" />
                ) : (
                    <Eye size={20} aria-hidden="true" />
                )}
            </button>
        </div>
    )
}