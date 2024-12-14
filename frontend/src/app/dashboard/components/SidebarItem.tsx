"use client"

import React from "react"
import Link from "next/link"

const SidebarItem = ({ icon, link, alt }: { icon: string; link: string; alt: string }) => (
    <Link href={link}>
      <img
        src={icon}
        alt={alt}
        className="w-8 h-8 cursor-pointer transition-transform hover:scale-110"
      />
    </Link>
)

export default SidebarItem
