"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import type { DashboardStats } from "@/lib/types"
import { Package, AlertTriangle, DollarSign, Users, TrendingUp, TrendingDown } from "lucide-react"
import { BarChart } from "@/components/charts/bar-chart"
import { DonutChart } from "@/components/charts/donut-chart"
import { Sidebar } from "@/components/layout/sidebar"


export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  //const [stats, setStats] = useState<DashboardStats[]>([])// | null>(null)
  const [dashboardLoading, setDashboardLoading] = useState(true)

  const [totalProducts, setTotalProducts] = useState<number | null>(null);
  const [activeUsers, setactiveUsers] = useState<number | null>(null);
  const [today_sell_total, settoday_sell_total] = useState<number | null>(null);
  const [n_low_stock_items, setn_low_stock_items] = useState<number | null>(null);
  const [n_in_stock_items, setn_in_stock_items] = useState<number | null>(null);
  const [get_n_out_of_stock_items, setget_n_out_of_stock_items] = useState<number | null>(null);
  const [salesVsPurchasesData, setweekly_sales_purchases] = useState<any[]>([]);
  const [loading2, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  /* 
    const fetchDashboardData = async () => {
      try {
        const statsData = api.getDashboardStats().then((data) => {
          setTotalProducts(data.total_products);
          setactiveUsers(data.active_users);
          settoday_sell_total(data.today_sell_total);
          setn_low_stock_items(data.n_low_stock_items);
          setn_in_stock_items(data.n_in_stock_items);
          setget_n_out_of_stock_items(data.get_n_out_of_stock_items);
        });
        setStats(api.getDashboardStats())
        console.log("Dashboard Stats:", stats)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setDashboardLoading(false)
      }
    };
  */

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const fetchTotalInventory = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/Dashboard"); //"https://inventory-pro-self.vercel.app/api/Dashboard"
      const data = await response.json();
      setTotalProducts(data.total_products);
      setactiveUsers(data.n_active_users);
      settoday_sell_total(data.today_sell_total);
      setn_low_stock_items(data.n_low_stock_items);
      setget_n_out_of_stock_items(data.get_n_out_of_stock_items);
      setn_in_stock_items(data.n_in_stock_items);
      setweekly_sales_purchases(data.weekly_sales_purchases);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setDashboardLoading(false);
    }
  };



  useEffect(() => {
    if (user) {
      //fetchDashboardData();
      fetchTotalInventory();
    }
  }, [user])


  const inventoryStatusData = [
    { label: "In Stock", value: n_in_stock_items, color: "#10b981" },
    { label: "Low Stock", value: n_low_stock_items, color: "#f59e0b" },
    { label: "Out of Stock", value: get_n_out_of_stock_items, color: "#ef4444" },
  ]

  if (loading || loading2) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:pl-64">
        <main className="min-h-screen">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 ml-10 sm:ml-0">Dashboard</h1>
                <p className="text-gray-600 ml-10 sm:ml-0">Welcome to your inventory management system</p>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <span className="mr-2">📊</span>
                Live Data
              </div>
            </div>

            {/* Stats Cards */}
            {dashboardLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-32 bg-white rounded-lg shadow animate-pulse"></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-white shadow-sm border-gray-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Total Products</CardTitle>
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Package className="h-4 w-4 text-blue-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900">{totalProducts}</div>
                    <div className="flex items-center text-xs text-green-600">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +12% from last month
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white shadow-sm border-gray-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Low Stock Items</CardTitle>
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900">{n_low_stock_items}</div>
                    <div className="flex items-center text-xs text-red-600">
                      <TrendingDown className="w-3 h-3 mr-1" />
                      -5% from last month
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white shadow-sm border-gray-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Today's Sales</CardTitle>
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-green-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900">{today_sell_total}</div>
                    <div className="flex items-center text-xs text-green-600">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +8% from last month
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white shadow-sm border-gray-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Active Users</CardTitle>
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Users className="h-4 w-4 text-purple-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900">{activeUsers}</div>
                    <div className="flex items-center text-xs text-green-600">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +2% from last month
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sales vs Purchases Chart */}
              <Card className="bg-white shadow-sm border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">Sales vs Purchases</CardTitle>
                  <CardDescription className="text-gray-600">
                    Weekly overview of sales and purchase transactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BarChart data={salesVsPurchasesData} height={300} />
                </CardContent>
              </Card>

              {/* Inventory Status Chart */}
              <Card className="bg-white shadow-sm border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">Inventory Status</CardTitle>
                  <CardDescription className="text-gray-600">
                    Current stock distribution across all products
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <DonutChart data={inventoryStatusData.map(d => ({ ...d, value: d.value ?? 0 }))} size={250} />
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
