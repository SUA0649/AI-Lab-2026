"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { useRoleAccess } from "@/hooks/use-role-access";
import { api } from "@/lib/api";
import {
  LayoutDashboard,
  Package,
  Archive,
  ShoppingCart,
  LineChart,
  AlertTriangle,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  Lock,
} from "lucide-react";

export function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { hasPermission, isAdmin } = useRoleAccess();

  // Fetch low stock count
  useEffect(() => {
    const fetchLowStockCount = async () => {
      try {
        const alerts = await api.getLowStockAlerts();
        setLowStockCount(alerts.length);
      } catch (error) {
        console.error("Error fetching low stock alerts:", error);
      }
    };

    fetchLowStockCount();

    // Refresh every 30 seconds
    const interval = setInterval(fetchLowStockCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      permission: "canViewDashboard" as const,
    },
    {
      name: "Forecasting",
      href: "/dashboard/forecasting",
      icon: LineChart,
      permission: "canViewDashboard" as const,
    },
    {
      name: "Products",
      href: "/products",
      icon: Package,
      permission: "canViewProducts" as const,
    },
    {
      name: "Inventory",
      href: "/inventory",
      icon: Archive,
      badge: lowStockCount > 0 ? lowStockCount.toString() : undefined,
      permission: "canViewInventory" as const,
    },
    {
      name: "Transactions",
      href: "/transactions",
      icon: ShoppingCart,
      permission: "canViewTransactions" as const,
    },

  ];

  // Filter navigation based on permissions
  const allowedNavigation = navigation.filter((item) =>
    hasPermission(item.permission)
  );

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-2 z-[60]">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="bg-white shadow-md"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:z-40",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Sidebar"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center px-12 py-4 border-b border-gray-200 relative">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="ml-3 text-lg font-semibold text-black">
              InventoryPro
            </span>
          </div>

          {/* User Welcome Section */}
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-sm text-gray-600 mb-1">Welcome back,</p>
            <div className="flex items-center justify-between">
              <p className="font-medium text-gray-900">
                {user?.name || "User"}
              </p>
              <Badge
                variant={isAdmin ? "default" : "secondary"}
                className={cn(
                  "text-xs flex items-center gap-1",
                  isAdmin
                    ? "bg-purple-100 text-purple-800"
                    : "bg-gray-100 text-gray-700"
                )}
              >
                {isAdmin ? (
                  <Shield className="w-3 h-3" />
                ) : (
                  <Lock className="w-3 h-3" />
                )}
                {user?.role?.toUpperCase() || "STAFF"}
              </Badge>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {allowedNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-colors group",
                    isActive
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <div className="flex items-center w-full">
                    <item.icon className="mr-3 h-5 w-5" />
                    <span className="w-full text-center sm:text-left">{item.name}</span>
                  </div>
                  {item.badge && (
                    <Badge
                      variant="destructive"
                      className="h-5 w-5 p-0 flex items-center justify-center text-xs"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Low Stock Alert */}
          {lowStockCount > 0 && (
            <div className="px-4 mb-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                  <span className="text-sm font-medium text-red-800">
                    Low Stock Alert
                  </span>
                </div>
                <p className="text-xs text-red-700">
                  {lowStockCount} items need restocking
                </p>
              </div>
            </div>
          )}

          {/* Logout only */}
          <div className="px-4 pb-4 border-t border-gray-200 pt-4">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start px-3 py-2.5 h-auto text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              onClick={signOut}
            >
              <LogOut className="mr-3 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 transition-opacity duration-300 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
}
