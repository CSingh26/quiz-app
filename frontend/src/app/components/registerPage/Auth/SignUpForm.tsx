"use client"
import Link from "next/link"

import React from "react"
import { useForm, FormProvider } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { FormField, FormItem, FormMessage } from "@/components/ui/form"
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

interface SignUpFormProps {
  onSubmit: (data: {
    name: string
    username: string
    email: string
    password: string
    confirmPassword: string
  }) => void
}

export default function SignUpForm({ onSubmit }: SignUpFormProps) {
  const methods = useForm({
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  const {
    handleSubmit,
    register,
    formState: { errors },
  } = methods

  return (
    <FormProvider {...methods}>
      <ToastContainer position="top-left" autoClose={3000} />
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <FormItem>
          <Label htmlFor="name" className="text-2xl text-[#ac53a6]">
            Name
          </Label>
          <Input
            id="name"
            placeholder="Name"
            {...register("name", { required: "Name is required" })}
            className="mt-2 text-white bg-[#00004d] placeholder:text-white placeholder-opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-5 py-7 pr-12"
          />
          <FormMessage>{errors.name?.message}</FormMessage>
        </FormItem>

        <FormItem>
          <Label htmlFor="username" className="text-2xl text-[#ac53a6]">
            Username
          </Label>
          <Input
            id="username"
            placeholder="Username"
            {...register("username", { required: "Username is required" })}
            className="mt-2 text-white bg-[#00004d] placeholder:text-white placeholder-opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-5 py-7 pr-12"
          />
          <FormMessage>{errors.username?.message}</FormMessage>
        </FormItem>

        <FormItem>
          <Label htmlFor="email" className="text-2xl text-[#ac53a6]">
            Email
          </Label>
          <Input
            id="email"
            placeholder="Email"
            {...register("email", {
              required: "Email is required",
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "Invalid email format",
              },
            })}
            className="mt-2 text-white bg-[#00004d] placeholder:text-white placeholder-opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-5 py-7 pr-12"
          />
          <FormMessage>{errors.email?.message}</FormMessage>
        </FormItem>

        <FormItem>
          <Label htmlFor="password" className="text-2xl text-[#ac53a6]">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="Password"
            {...register("password", { required: "Password is required" })}
            className="mt-2 text-white bg-[#00004d] placeholder:text-white placeholder-opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-5 py-7 pr-12"
          />
          <FormMessage>{errors.password?.message}</FormMessage>
        </FormItem>

        <FormItem>
          <Label htmlFor="confirmPassword" className="text-2xl text-[#ac53a6]">
            Confirm Password
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Confirm Password"
            {...register("confirmPassword", {
              required: "Confirm Password is required",
            })}
            className="mt-2 text-white bg-[#00004d] placeholder:text-white placeholder-opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-5 py-7 pr-12"
          />
          <FormMessage>{errors.confirmPassword?.message}</FormMessage>
        </FormItem>

        <Button
          type="submit"
          className="text-3xl w-full py-5 bg-white text-[#00004d] font-bold rounded-lg shadow-lg hover:shadow-2xl hover:scale-105 hover:text-lg transition-all duration-300 active:scale-95 active:shadow-md focus:outline-none"
          style={{ backgroundColor: "#ac53a6" }}
        >
          Sign Up
        </Button>
      </form>
        <p
          className="mt-6 text-center text-gray-600 text-xl"
        >
          Already have an account?{" "}
          <Link href="/login/student" className="text-[#00004d] underline">
                Login Here
          </Link>
      </p>
    </FormProvider>
  )
}