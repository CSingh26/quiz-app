"use client"

import React from "react"
import { useForm, FormProvider } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { FormField, FormItem, FormMessage } from "@/components/ui/form"

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

  return (
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
              <Label htmlFor="username" className="text-2xl text-[#ac53a6]">
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor="email" className="text-2xl text-[#ac53a6]">
                Email
              </Label>
              <Input
                id="email"
                placeholder="Email"
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
              <Label htmlFor="password" className="text-2xl text-[#ac53a6]">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Password"
                {...field}
                className="mt-2 text-white bg-[#00004d] placeholder:text-white placeholder-opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-5 py-7 pr-12"
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor="confirmPassword" className="text-2xl text-[#ac53a6]">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm Password"
                {...field}
                className="mt-2 text-white bg-[#00004d] placeholder:text-white placeholder-opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-5 py-7 pr-12"
              />
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
  )
}