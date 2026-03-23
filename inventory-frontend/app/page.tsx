"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Package, Users, BarChart3, AlertTriangle, Shield, Zap } from "lucide-react"
import Link from "next/link"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

export default function HomePage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push("/dashboard")
      } else {
        router.push("/login")
      }
    }
  }, [user, loading, router])

  // Show loading animation while determining redirect
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="relative flex flex-col items-center">
          <div className="w-24 h-24 border-8 border-blue-400 border-t-transparent border-b-transparent rounded-full animate-spin mb-6"></div>
          <div className="text-lg text-blue-700 font-semibold animate-pulse">Loading InventoryPro...</div>
        </div>
      </div>
    )
  }
  // No landing page, just redirect logic
  return null;
}

