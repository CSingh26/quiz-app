"use client"

import { useForm, FormProvider } from "react-hook-form"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { FormField, FormItem, FormMessage } from "@/components/ui/form"
import { useState } from "react"

export default function StudentSignUp() {
  const methods = useForm({
    defaultValues: {
      name: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  })
  const [loading, setLoading] = useState(false)

  const onSubmit = async (data: any) => {
    if (data.password !== data.confirmPassword) {
      methods.setError("confirmPassword", {
        type: "manual",
        message: "Passwords do not match",
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch("http://localhost:6573/api/auth/student/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: data.username,
          name: data.name,
          password: data.password,
        }),
      })

      const responseData = await response.json()

      if (response.ok) {
        alert("Signup Successful!")
        methods.reset()
      } else {
        alert(responseData.message || "Signup Failed")
      }
    } catch (err) {
      console.error("Error during signup:", err)
      alert("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">Student Sign Up</h1>
      <FormProvider {...methods}>
        <form
          onSubmit={methods.handleSubmit(onSubmit)}
          className="w-full max-w-md bg-white p-6 rounded shadow"
        >
          {/* Name Field */}
          <FormField
            name="name"
            rules={{ required: "Name is required" }}
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Name" {...field} />
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Username Field */}
          <FormField
            name="username"
            rules={{ required: "Username is required" }}
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="username">Username</Label>
                <Input id="username" placeholder="Username" {...field} />
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Password Field */}
          <FormField
            name="password"
            rules={{
              required: "Password is required",
              minLength: { value: 8, message: "Password must be at least 8 characters long" },
              pattern: {
                value: /(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&*?!])/,
                message: "Password must include uppercase, number, and special character",
              },
            }}
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="Password" {...field} />
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Confirm Password Field */}
          <FormField
            name="confirmPassword"
            rules={{
              required: "Confirm Password is required",
            }}
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input id="confirmPassword" type="password" placeholder="Confirm Password" {...field} />
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit Button */}
          <Button type="submit" className="w-full mt-4" disabled={loading}>
            {loading ? "Signing Up..." : "Sign Up"}
          </Button>
          <p className="mt-4 text-center">
            Already have an account? <Link href="/login/student">Login here</Link>.
          </p>
        </form>
      </FormProvider>
    </div>
  )
}