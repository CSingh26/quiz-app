"use client"

import { useForm, FormProvider } from "react-hook-form"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { FormField, FormItem, FormMessage } from "@/components/ui/form"
import { motion } from "framer-motion"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"

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
          "Content-Type": "application/json",
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
      console.error("Error during Signup:", err)
    }
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen custom-font-1">
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="hidden md:flex md:w-1/2 bg-[#00004d] items-center justify-center"
      >
        <img
          src="/Assests/Images/login.svg" 
          alt="3D Cubes"
          className="w-[120%] h-auto"
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: -100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full md:w-1/2 bg-gray-100 flex flex-col items-center justify-center"
      >
        <div className="w-full max-w-md px-6">
          <motion.h1
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="text-center text-7xl font-bold text-[#ac53a6] mb-6"
          >
            Student Sign Up
          </motion.h1>
          <Alert className="mb-4 bg-blue-100 text-blue-800">
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              Ensure your password meets all requirements listed below.
            </AlertDescription>
          </Alert>
          <FormProvider {...methods}>
            <form
              onSubmit={methods.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <FormField
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="name" className="text-2xl text-[#ac53a6]">
                      Name
                    </Label>
                    <Input
                      id="name"
                      placeholder="Name"
                      {...field}
                      className="mt-2 text-white bg-[#00004d] placeholder:text-white placeholder-opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-5 py-7 pr-12"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <Label
                      htmlFor="username"
                      className="text-2xl text-[#ac53a6]"
                    >
                      Username
                    </Label>
                    <Input
                      id="username"
                      placeholder="Username"
                      {...field}
                      className="mt-2 text-white bg-[#00004d] placeholder:text-white placeholder-opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-5 py-7 pr-12"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <Label
                      htmlFor="password"
                      className="text-2xl text-[#ac53a6]"
                    >
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Password"
                      {...field}
                      className="mt-2 text-white bg-[#00004d] placeholder:text-white placeholder-opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-5 py-7 pr-12"
                    />
                    <ul className="text-sm mt-2">
                      <li
                        className={
                          field.value.length >= 8
                            ? "text-green-500"
                            : "text-red-500"
                        }
                      >
                        At least 8 characters
                      </li>
                      <li
                        className={
                          /[A-Z]/.test(field.value)
                            ? "text-green-500"
                            : "text-red-500"
                        }
                      >
                        At least one uppercase letter
                      </li>
                      <li
                        className={
                          /\d/.test(field.value)
                            ? "text-green-500"
                            : "text-red-500"
                        }
                      >
                        At least one number
                      </li>
                      <li
                        className={
                          /[@#$%^&*?!]/.test(field.value)
                            ? "text-green-500"
                            : "text-red-500"
                        }
                      >
                        At least one special character (@$!%*?&)
                      </li>
                    </ul>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <Label
                      htmlFor="confirmPassword"
                      className="text-2xl text-[#ac53a6]"
                    >
                      Confirm Password
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm Password"
                      {...field}
                      className="mt-2 text-white bg-[#00004d] placeholder:text-white placeholder-opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-5 py-7 pr-12"
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
              <Button
                type="submit"
                className="text-3xl w-full py-5 bg-white text-[#00004d] font-bold rounded-lg shadow-lg hover:shadow-2xl hover:scale-105 hover:text-lg transition-all duration-300 active:scale-95 active:shadow-md focus:outline-none"
                style={{ backgroundColor: "#ac53a6" }}
              >
                Sign Up
              </Button>
            </form>
          </FormProvider>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-6 text-center text-gray-600 text-xl"
          >
            Already have an account?{" "}
            <Link href="/login/student" className="text-[#00004d] underline">
              Login Here
            </Link>
          </motion.p>
        </div>
      </motion.div>
    </div>
  )
}