"use client"

import { useForm, FormProvider } from "react-hook-form"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { FormField, FormItem, FormMessage } from "@/components/ui/form"

export default function StudentSignUp() {
  const methods = useForm({
    defaultValues: {
      name: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  })

  const onSubmit = async (data: any) => {
    if (data.password !== data.confirmPassword) {
      alert("Passwords do not match!")
      return
    }

    try {
      const response = await fetch("http://localhost:6573/api/auth/student/signup", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({
          username: data.username,
          name: data.name,
          password: data.password,
        }),
      })

      const responseData = await response.json()

      if (response.ok) {
        alert("Signup Successful!")
      } else {
        alert(responseData.message || "Signup Failed")
      }
    } catch (err) {
      console.error("Error during signup:", err)
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
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="Password" {...field} />
                <ul className="text-sm mt-2">
                  <li className={field.value.length >= 8 ? "text-green-500" : "text-red-500"}>
                    At least 8 characters
                  </li>
                  <li className={/[A-Z]/.test(field.value) ? "text-green-500" : "text-red-500"}>
                    At least one uppercase letter
                  </li>
                  <li className={/\d/.test(field.value) ? "text-green-500" : "text-red-500"}>
                    At least one number
                  </li>
                  <li
                    className={/[@#$%^&*?!]/.test(field.value) ? "text-green-500" : "text-red-500"}
                  >
                    At least one special character (@$!%*?&)
                  </li>
                </ul>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Confirm Password Field */}
          <FormField
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm Password"
                  {...field}
                />
                {field.value.length > 0 && (
                  <p
                    className={
                      field.value === methods.getValues("password")
                        ? "text-green-500 text-sm"
                        : "text-red-500 text-sm"
                    }
                  >
                    {field.value === methods.getValues("password")
                      ? "Passwords match"
                      : "Passwords do not match"}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit Button */}
          <Button type="submit" className="w-full mt-4">
            Sign Up
          </Button>
          <p className="mt-4 text-center">
            Already have an account? <Link href="/login/student">Login here</Link>.
          </p>
        </form>
      </FormProvider>
    </div>
  )
}