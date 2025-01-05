"use client"

export const validatePassword = (password: string): string | null => {
  const criteria = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    specialChar: /[!@#$%^&*]/.test(password),
  }

  if (!criteria.length) return "Password must be at least 8 characters long."
  if (!criteria.uppercase) return "Password must have at least one uppercase letter."
  if (!criteria.number) return "Password must have at least one number."
  if (!criteria.specialChar) return "Password must have at least one special character."
  return null
}