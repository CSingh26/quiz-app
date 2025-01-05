"use client"

import React from "react"
import Link from "next/link"
import Image from "next/image"

interface SidebarItemProps {
  href?: string 
  icon: string
  alt: string
  active: boolean
  size?: number
  onClick?: () => void 
}

export default function SidebarItem({
  href,
  icon,
  alt,
  active,
  size = 48,
  onClick,
}: SidebarItemProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault() 
      onClick()
    }
  }

  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick ? handleClick : undefined} 
        className={`flex items-center justify-center w-16 h-16 transition-all hover:scale-110 ${
          active ? "opacity-100" : "opacity-70"
        }`}
      >
        <Image
          src={icon}
          alt={alt || "Sidebar Icon"}
          width={size}
          height={size}
          className="object-contain"
          priority
        />
      </Link>
    )
  }

  return (
    <button
      onClick={handleClick}
      className={`flex items-center justify-center w-16 h-16 transition-all hover:scale-110 ${
        active ? "opacity-100" : "opacity-70"
      }`}
    >
      <Image
        src={icon}
        alt={alt || "Sidebar Icon"}
        width={size}
        height={size}
        className="object-contain"
        priority
      />
    </button>
  )
}