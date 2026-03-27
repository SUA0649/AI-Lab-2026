"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import type { Product } from "@/lib/types";
import {
  Package,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";

export default function InventoryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [loading2, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /*const [inventory_table, setinventory_table] = useState([]);
  const [top_3_recent_transactions, settop_3_recent_transactions] = useState([]);
  const [total_stock_value, settotal_stock_value] = useState<number | null>(null);
  const [n_active_items, setn_active_items] = useState<number | null>(null);
  const [n_low_stock_items, setn_low_stock_items] = useState<number | null>(null);
  const [get_n_out_of_stock_items, setget_n_out_of_stock_items] = useState<number | null>(null);*/

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchProducts();
    }
  }, [user]);

  useEffect(() => {
    const filtered = products.filter(
      (product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [products, searchTerm]);

  const fetchProducts = async () => {
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (err: any) {
      console.error("Error fetching products:", err);
      setError(err.message);
    } finally {
      setInventoryLoading(false);
      setLoading(false);
    }
  };

  /*useEffect(() => {
    const fetchTotalInventory = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/Inventory');
        const data = await response.json();
        setinventory_table(data.inventory_table);
        settop_3_recent_transactions(data.top_3_recent_transactions);
        settotal_stock_value(data.total_stock_value);
        setn_active_items(data.n_active_items);
        setget_n_out_of_stock_items(data.get_n_out_of_stock_items);
        setn_low_stock_items(data.n_low_stock_items);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTotalInventory();
  }, []);
  
  const fetchTotalInventory = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/Inventory');
      const data = await response.json();
      setinventory_table(data.inventory_table);
      settop_3_recent_transactions(data.top_3_recent_transactions);
      settotal_stock_value(data.total_stock_value);
      setn_active_items(data.n_active_items);
      setget_n_out_of_stock_items(data.get_n_out_of_stock_items);
      setn_low_stock_items(data.n_low_stock_items);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };*/

  const getStockStatus = (product: Product) => {
    if (product.quantity === 0)
      return { status: "Out of Stock", color: "destructive", icon: XCircle };
    if (product.quantity <= product.threshold)
      return { status: "Low Stock", color: "secondary", icon: AlertTriangle };
    return { status: "In Stock", color: "default", icon: CheckCircle };
  };

  const lowStockItems = products.filter(
    (p) => p.quantity <= p.threshold && p.quantity > 0
  );
  const outOfStockItems = products.filter((p) => p.quantity === 0);

  if (loading || loading2) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) return <div>Error: {error}</div>;
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:pl-64">
        <main className="min-h-screen">
          <div className="p-6 space-y-6">
            <div className="w-full">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 text-center sm:text-left break-words">Inventory</h1>
              <p className="text-gray-600 text-center sm:text-left text-sm sm:text-base">Monitor and manage your stock levels</p>
            </div>

            {/* Alert Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-orange-50 border-orange-200">
                <CardHeader>
                  <CardTitle className="text-orange-800 flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Low Stock Alert
                  </CardTitle>
                  <CardDescription className="text-orange-700">
                    {lowStockItems.length} items need restocking
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {lowStockItems.slice(0, 3).map((product) => (
                      <div
                        key={product.name}
                        className="flex justify-between items-center"
                      >
                        <span className="text-sm text-orange-800">
                          {product.name}
                        </span>
                        <Badge
                          variant="secondary"
                          className="bg-orange-100 text-orange-800"
                        >
                          {product.quantity} left
                        </Badge>
                      </div>
                    ))}
                    {lowStockItems.length > 3 && (
                      <p className="text-xs text-orange-700">
                        +{lowStockItems.length - 3} more items
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-red-50 border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-800 flex items-center">
                    <XCircle className="w-5 h-5 mr-2" />
                    Out of Stock
                  </CardTitle>
                  <CardDescription className="text-red-700">
                    {outOfStockItems.length} items are completely out of stock
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {outOfStockItems.slice(0, 3).map((product) => (
                      <div
                        key={product.name}
                        className="flex justify-between items-center"
                      >
                        <span className="text-sm text-red-800">
                          {product.name}
                        </span>
                        <Badge
                          variant="destructive"
                          className="bg-red-100 text-red-800"
                        >
                          0 stock
                        </Badge>
                      </div>
                    ))}
                    {outOfStockItems.length > 3 && (
                      <p className="text-xs text-red-700">
                        +{outOfStockItems.length - 3} more items
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search inventory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>

            {/* Inventory Grid */}
            {inventoryLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-64 bg-white rounded-lg shadow animate-pulse"
                  ></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product);
                  const StatusIcon = stockStatus.icon;
                  return (
                    <Card
                      key={product.name}
                      className="bg-white shadow-sm border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-2">
                            <Package className="h-5 w-5 text-blue-600" />
                            <CardTitle className="text-lg">
                              {product.name}
                            </CardTitle>
                          </div>
                          <Badge
                            variant={stockStatus.color as any}
                            className="flex items-center"
                          >
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {stockStatus.status}
                          </Badge>
                        </div>
                        <CardDescription>{product.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Status:</span>
                            <Badge
                              variant={(product.Status || product.status) === "active" ? "default" : "secondary"}
                              className="capitalize"
                            >
                              {product.Status || product.status || "N/A"}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">SKU:</span>
                            <span className="text-sm font-medium">
                              {product.sku}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">
                              Category:
                            </span>
                            <span className="text-sm font-medium">
                              {product.category}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">
                              Current Stock:
                            </span>
                            <span
                              className={`text-sm font-medium ${
                                product.quantity <= product.threshold
                                  ? "text-orange-600"
                                  : "text-green-600"
                              }`}
                            >
                              {product.quantity} units
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">
                              Threshold:
                            </span>
                            <span className="text-sm font-medium">
                              {product.threshold} units
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">
                              Value:
                            </span>
                            <span className="text-sm font-medium">
                              $
                              {(product.cost_price * product.quantity).toFixed(
                                2
                              )}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {filteredProducts.length === 0 && !inventoryLoading && (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No inventory items found
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm
                    ? "Try adjusting your search terms."
                    : "No inventory data available."}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
