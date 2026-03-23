"use client"

import { useAuth } from "@/contexts/auth-context"

export interface RolePermissions {
  canViewDashboard: boolean
  canViewProducts: boolean
  canCreateProducts: boolean
  canEditProducts: boolean
  canDeleteProducts: boolean
  canViewInventory: boolean
  canViewTransactions: boolean
  canCreateTransactions: boolean
  canViewSettings: boolean
  canManageUsers: boolean
  canExportData: boolean
  canImportData: boolean
  canManageSystemSettings: boolean
}

const ROLE_PERMISSIONS: Record<string, RolePermissions> = {
  admin: {
    canViewDashboard: true,
    canViewProducts: true,
    canCreateProducts: true,
    canEditProducts: true,
    canDeleteProducts: true,
    canViewInventory: true,
    canViewTransactions: true,
    canCreateTransactions: true,
    canViewSettings: true,
    canManageUsers: true,
    canExportData: true,
    canImportData: true,
    canManageSystemSettings: true,
  },
  staff: {
    canViewDashboard: true,
    canViewProducts: true,
    canCreateProducts: false,
    canEditProducts: false,
    canDeleteProducts: false,
    canViewInventory: true,
    canViewTransactions: true,
    canCreateTransactions: true,
    canViewSettings: false,
    canManageUsers: false,
    canExportData: false,
    canImportData: false,
    canManageSystemSettings: false,
  },
}

export function useRoleAccess() {
  const { user } = useAuth()

  const permissions = user?.role ? ROLE_PERMISSIONS[user.role] : ROLE_PERMISSIONS.staff

  const hasPermission = (permission: keyof RolePermissions): boolean => {
    return permissions[permission]
  }

  const requirePermission = (permission: keyof RolePermissions): void => {
    if (!hasPermission(permission)) {
      throw new Error(`Access denied: ${permission} permission required`)
    }
  }

  const isAdmin = user?.role === "admin"
  const isStaff = user?.role === "staff"

  return {
    permissions,
    hasPermission,
    requirePermission,
    isAdmin,
    isStaff,
  }
}
