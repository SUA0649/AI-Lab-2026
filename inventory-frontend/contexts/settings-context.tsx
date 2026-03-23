"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"

interface SystemSettings {
  theme: "light" | "dark" | "auto"
  colorScheme: string
  currency: string
  timezone: string
  lowStockThreshold: string
  autoBackup: boolean
}

interface NotificationSettings {
  lowStockAlerts: boolean
  dailyReports: boolean
  weeklyReports: boolean
  emailNotifications: boolean
}

interface SettingsContextType {
  systemSettings: SystemSettings
  notificationSettings: NotificationSettings
  updateSystemSettings: (updates: Partial<SystemSettings>) => void
  updateNotificationSettings: (updates: Partial<NotificationSettings>) => void
}

const defaultSystemSettings: SystemSettings = {
  theme: "light",
  colorScheme: "blue",
  currency: "USD",
  timezone: "UTC-5",
  lowStockThreshold: "10",
  autoBackup: true,
}

const defaultNotificationSettings: NotificationSettings = {
  lowStockAlerts: true,
  dailyReports: false,
  weeklyReports: true,
  emailNotifications: true,
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(defaultSystemSettings)
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings)

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const savedSystemSettings = localStorage.getItem("inventory-system-settings")
      const savedNotificationSettings = localStorage.getItem("inventory-notification-settings")

      if (savedSystemSettings) {
        const parsed = JSON.parse(savedSystemSettings)
        setSystemSettings({ ...defaultSystemSettings, ...parsed })
      }

      if (savedNotificationSettings) {
        const parsed = JSON.parse(savedNotificationSettings)
        setNotificationSettings({ ...defaultNotificationSettings, ...parsed })
      }
    } catch (error) {
      console.error("Failed to load settings:", error)
    }
  }, [])

  // Apply theme changes to document
  useEffect(() => {
    const root = document.documentElement

    // Handle theme
    if (systemSettings.theme === "auto") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      const applyTheme = (e: MediaQueryListEvent | MediaQueryList) => {
        root.classList.toggle("dark", e.matches)
      }
      applyTheme(mediaQuery)
      mediaQuery.addEventListener("change", applyTheme)
      return () => mediaQuery.removeEventListener("change", applyTheme)
    } else {
      root.classList.toggle("dark", systemSettings.theme === "dark")
    }

    // Apply color scheme
    root.setAttribute("data-color-scheme", systemSettings.colorScheme)
  }, [systemSettings.theme, systemSettings.colorScheme])

  const updateSystemSettings = (updates: Partial<SystemSettings>) => {
    const updatedSettings = { ...systemSettings, ...updates }
    setSystemSettings(updatedSettings)
    localStorage.setItem("inventory-system-settings", JSON.stringify(updatedSettings))
  }

  const updateNotificationSettings = (updates: Partial<NotificationSettings>) => {
    const updatedSettings = { ...notificationSettings, ...updates }
    setNotificationSettings(updatedSettings)
    localStorage.setItem("inventory-notification-settings", JSON.stringify(updatedSettings))
  }

  return (
    <SettingsContext.Provider
      value={{
        systemSettings,
        notificationSettings,
        updateSystemSettings,
        updateNotificationSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider")
  }
  return context
}
