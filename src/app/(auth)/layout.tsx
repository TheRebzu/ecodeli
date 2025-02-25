"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Navbar } from "@/components/layout/Navbar"
import { Sidebar } from "@/components/layout/Sidebar"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { data: session, status } = useSession()
  const [userData, setUserData] = useState(null)

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen)

  useEffect(() => {
    const fetchUserData = async () => {
      if (session?.user?.id) {
        try {
          const response = await fetch(`/api/auth/me`)
          if (response.ok) {
            const data = await response.json()
            setUserData(data)
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
        }
      }
    }

    fetchUserData()
  }, [session])

  if (status === "loading") {
    return <div>Loading...</div>
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar toggleSidebar={toggleSidebar} user={userData} />
      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} user={userData} />
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  )
}

