"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useRoleAccess } from "@/hooks/use-role-access";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import type { Transaction, Product } from "@/lib/types";
import {
  Plus,
  Search,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  Settings,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";

export default function TransactionsPage() {
  const { user, loading } = useAuth();
  const { hasPermission } = useRoleAccess();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    items: [{ product_id: "", quantity: "", price: "", extended_price: 0 }],
    type: "Sell",
    notes: "",
    name: "",
    status: "Pending",
  });

  const updateItem = (index: number, field: string, value: string) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      const item = { ...newItems[index], [field]: value };

      const selectedProduct = products.find((p) => p.item_id === item.product_id);
      if (selectedProduct) {
        if (prev.type === "Sell" || prev.type === "Customer Return") {
          item.price = selectedProduct.selling_price.toFixed(2);
        } else if (prev.type === "Buy" || prev.type === "Supplier Return") {
          item.price = selectedProduct.cost_price.toFixed(2);
        }
      }

      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.price) || 0;
      item.extended_price = parseFloat((qty * price).toFixed(2));

      newItems[index] = item;
      return { ...prev, items: newItems };
    });
  };

  const handleTypeChange = (value: string) => {
    setFormData((prev) => {
      const newItems = prev.items.map((item) => {
        const newItem = { ...item };
        const selectedProduct = products.find((p) => p.item_id === newItem.product_id);
        if (selectedProduct) {
          if (value === "Sell" || value === "Customer Return") {
            newItem.price = selectedProduct.selling_price.toFixed(2);
          } else if (value === "Buy" || value === "Supplier Return") {
            newItem.price = selectedProduct.cost_price.toFixed(2);
          }
        }
        const qty = parseFloat(newItem.quantity) || 0;
        const price = parseFloat(newItem.price) || 0;
        newItem.extended_price = parseFloat((qty * price).toFixed(2));
        return newItem;
      });
      return { ...prev, type: value, items: newItems };
    });
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { product_id: "", quantity: "", price: "", extended_price: 0 }],
    }));
  };

  const removeItem = (index: number) => {
    setFormData((prev) => {
      const newItems = prev.items.filter((_, i) => i !== index);
      return { ...prev, items: newItems };
    });
  };

  const grandTotal = formData.items.reduce((sum, item) => sum + item.extended_price, 0).toFixed(2);

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this transaction?")) {
      try {
        await api.deleteTransaction(id);
        setTransactions((prev: Transaction[]) =>
          prev.filter((t) => t.id !== id)
        );
      } catch (error) {
        console.error("Error deleting transaction:", error);
      }
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    let filtered = transactions.filter(
      (transaction) => {
        const itemNameStr = Array.isArray(transaction.item_name) 
          ? transaction.item_name.join(' ') 
          : String(transaction.item_name || '');
          
        return itemNameStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
               String(transaction.type || '').toLowerCase().includes(searchTerm.toLowerCase());
      }
    );

    if (filterType !== "all") {
      filtered = filtered.filter(
        (transaction) => transaction.type === filterType
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter(
        (transaction) => (transaction as any).Status === filterStatus
      );
    }

    setFilteredTransactions(filtered);
  }, [transactions, searchTerm, filterType, filterStatus]);

  const fetchData = async () => {
    try {
      const [transactionsData, productsData] = await Promise.all([
        api.getTransactions(),
        api.getProducts(),
      ]);
      setTransactions(transactionsData);
      setProducts(productsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validItems = formData.items.filter(item => item.product_id && item.quantity);
      if (validItems.length === 0) return;

      const itemNames = validItems.map(item => {
        const p = products.find(prod => prod.item_id === item.product_id);
        return p ? p.name : "";
      });
      const quantities = validItems.map(item => parseFloat(item.quantity) || 0);

      const transactionData: any = {
        item_name: itemNames,
        type: formData.type,
        quantity: quantities,
        remarks: formData.notes || "",
        name: formData.name,
        Status: formData.status,
        total_price: parseFloat(grandTotal)
      };

      const newTransaction = await api.createTransaction(transactionData);
      setTransactions((prev: any) => [newTransaction, ...prev]);
      resetForm();
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Error creating transaction:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      items: [{ product_id: "", quantity: "", price: "", extended_price: 0 }],
      type: "Sell",
      notes: "",
      name: "",
      status: "Pending",
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "Sell":
      case "Customer Return":
        return <ArrowUpRight className="h-4 w-4 text-green-600" />;
      case "Buy":
      case "Supplier Return":
        return <ArrowDownRight className="h-4 w-4 text-blue-600" />;
      case "adjustment":
        return <Settings className="h-4 w-4 text-orange-600" />;
      default:
        return <ShoppingCart className="h-4 w-4" />;
    }
  };

  const getTransactionBadgeColor = (type: string) => {
    switch (type) {
      case "Sell":
      case "Customer Return":
        return "default";
      case "Buy":
      case "Supplier Return":
        return "secondary";
      case "adjustment":
        return "outline";
      default:
        return "default";
    }
  };

  // Calculate financial summaries
  const calculateFinancialSummary = () => {
    const totalSales = transactions
      .filter((t: any) => t.type === "Sell" || t.type === "Customer Return")
      .reduce((sum, t: any) => sum + (t.total_price || 0), 0);

    const totalPurchases = transactions
      .filter((t: any) => t.type === "Buy" || t.type === "Supplier Return")
      .reduce((sum, t: any) => sum + (t.total_price || 0), 0);

    const grossMargin = totalSales - totalPurchases;

    return {
      totalSales,
      totalPurchases,
      grossMargin,
    };
  };

  const { totalSales, totalPurchases, grossMargin } =
    calculateFinancialSummary();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:pl-64">
        <main className="min-h-screen">
          <div className="p-4 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div className="w-full">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 text-center sm:text-left break-words">
                  Transactions
                </h1>
                <p className="text-gray-600 text-center sm:text-left text-sm sm:text-base">
                  Track all inventory movements and financial performance
                </p>
              </div>
              {hasPermission("canCreateTransactions") ? (
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={resetForm}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Transaction
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[84rem] max-h-[95vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-2xl">Add New Transaction</DialogTitle>
                      <DialogDescription>
                        Record a new inventory transaction
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="type">Transaction Type</Label>
                          <Select
                            value={formData.type}
                            onValueChange={handleTypeChange}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Buy">Buy</SelectItem>
                              <SelectItem value="Sell">Sell</SelectItem>
                              <SelectItem value="Customer Return">Customer Return</SelectItem>
                              <SelectItem value="Supplier Return">Supplier Return</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="status">Status</Label>
                          <Select
                            value={formData.status}
                            onValueChange={(value) => setFormData({ ...formData, status: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pending">Pending</SelectItem>
                              <SelectItem value="Completed">Completed</SelectItem>
                              <SelectItem value="Cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {(formData.type === "Sell" || formData.type === "Customer Return" || formData.type === "Buy" || formData.type === "Supplier Return") && (
                        <div>
                          <Label htmlFor="name">
                            {(formData.type === "Sell" || formData.type === "Customer Return") ? "Customer Name:" : "Supplier Name:"}
                          </Label>
                          <Input
                            id="name"
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                          />
                        </div>
                      )}

                      <div className="space-y-2 border p-3 rounded-md">
                        <div className="flex justify-between items-center mb-2">
                          <Label className="font-semibold">Products</Label>
                          <Button type="button" size="sm" variant="outline" onClick={addItem}>
                            <Plus className="h-4 w-4 mr-1" /> Add Product
                          </Button>
                        </div>
                        {formData.items.map((item, index) => (
                          <div key={index} className="grid grid-cols-12 gap-2 items-end mb-2">
                            <div className="col-span-5">
                              <Label className="text-xs">Product</Label>
                              <Select
                                value={item.product_id}
                                onValueChange={(value) => updateItem(index, "product_id", value)}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Select product" />
                                </SelectTrigger>
                                <SelectContent>
                                  {products.map((product) => (
                                    <SelectItem key={product.item_id} value={product.item_id}>
                                      {product.name} ({product.sku})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">Qty</Label>
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateItem(index, "quantity", e.target.value)}
                                className="h-9"
                                required
                              />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">Unit Price</Label>
                              <Input
                                type="number"
                                value={item.price}
                                readOnly
                                className="h-9 bg-gray-50"
                              />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">Ext Price</Label>
                              <Input
                                type="text"
                                value={item.extended_price.toFixed(2)}
                                readOnly
                                className="h-9 bg-gray-50 font-medium"
                              />
                            </div>
                            <div className="col-span-1 pb-1">
                              {formData.items.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => removeItem(index)}
                                >
                                  &times;
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-end pt-2 pb-2">
                        <div className="text-lg">
                          <span className="font-semibold mr-2">Grand Total:</span>
                          <span className="font-bold">${grandTotal}</span>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Textarea
                          id="notes"
                          value={formData.notes}
                          onChange={(e) =>
                            setFormData({ ...formData, notes: e.target.value })
                          }
                          placeholder="Add any additional notes..."
                        />
                      </div>
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsAddDialogOpen(false);
                            resetForm();
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Add Transaction
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              ) : (
                <span className="text-sm font-semibold text-red-600 border border-red-300 bg-red-50 px-4 py-2 rounded">
                  Admin access required
                </span>
              )}
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              <Card className="bg-white shadow-sm border-gray-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Total Sales
                  </CardTitle>
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ${totalSales.toFixed(2)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Revenue from sales transactions
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-sm border-gray-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Total Purchases
                  </CardTitle>
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <TrendingDown className="h-4 w-4 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    ${totalPurchases.toFixed(2)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Cost of purchase transactions
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-sm border-gray-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Gross Margin
                  </CardTitle>
                  <div
                    className={`w-8 h-8 ${grossMargin >= 0 ? "bg-green-100" : "bg-red-100"
                      } rounded-lg flex items-center justify-center`}
                  >
                    <DollarSign
                      className={`h-4 w-4 ${grossMargin >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${grossMargin >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                  >
                    ${grossMargin.toFixed(2)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Sales minus cost of goods sold
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="relative flex-1 max-w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white text-sm"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-48 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Buy">Buy</SelectItem>
                  <SelectItem value="Sell">Sell</SelectItem>
                  <SelectItem value="Customer Return">Customer Return</SelectItem>
                  <SelectItem value="Supplier Return">Supplier Return</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-48 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Transactions List */}
            {transactionsLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-20 bg-white rounded-lg shadow animate-pulse"
                  ></div>
                ))}
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {filteredTransactions.map((transaction, index) => (
                  <Card
                    key={index}
                    className="bg-white shadow-sm border-gray-200 hover:shadow-md transition-shadow w-full"
                    style={{ fontSize: '0.95rem' }}
                  >
                    <CardContent className="p-2 sm:p-4 flex flex-col flex-wrap break-words">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center space-x-4 flex-1 min-w-0">
                          <div
                            className={`p-3 rounded-full ${transaction.type === "Sell"
                              ? "bg-green-100"
                              : transaction.type === "Buy"
                                ? "bg-blue-100"
                                : "bg-orange-100"
                              }`}
                          >
                            {getTransactionIcon(transaction.type)}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-lg break-words">
                              {Array.isArray(transaction.item_name) ? transaction.item_name.join(', ') : transaction.item_name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                              <Badge
                                variant={
                                  getTransactionBadgeColor(
                                    transaction.type as string
                                  ) as any
                                }
                              >
                                {typeof transaction.type === "string" ? transaction.type : "Other"}
                              </Badge>
                              <span>{Array.isArray(transaction.quantity) ? transaction.quantity.join(', ') : transaction.quantity} units</span>
                              <span>{((transaction as any).name) ? `Name: ${(transaction as any).name}` : ""}</span>
                              {((transaction as any).Status) && (
                                <Badge variant="outline">{(transaction as any).Status}</Badge>
                              )}
                            </div>
                            {transaction.remarks && (
                              <p className="text-sm text-gray-600 mt-1 break-words">
                                {transaction.remarks}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 mt-2 sm:mt-0">
                          <p
                            className={`text-2xl font-bold ${(String(transaction.type) === "Sell" || String(transaction.type) === "Customer Return")
                              ? "text-green-600"
                              : (String(transaction.type) === "Buy" || String(transaction.type) === "Supplier Return")
                                ? "text-blue-600"
                                : "text-orange-600"
                              }`}
                          >
                            {(String(transaction.type) === "Sell" || String(transaction.type) === "Customer Return")
                              ? "+"
                              : (String(transaction.type) === "Buy" || String(transaction.type) === "Supplier Return")
                                ? "-"
                                : ""}
                            ${transaction.total_price ? transaction.total_price.toFixed(2) : "0.00"}
                          </p>
                          <p className="text-sm text-gray-500 text-right break-words">
                            {new Date(
                              transaction.created_at
                            ).toLocaleDateString()} {" "}
                            at {" "}
                            {new Date(
                              transaction.created_at
                            ).toLocaleTimeString()}
                          </p>
                          {hasPermission("canDeleteTransactions") && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 text-red-600 hover:text-red-700 border-red-200"
                              onClick={() => handleDelete(transaction.id)}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {filteredTransactions.length === 0 && !transactionsLoading && (
              <div className="text-center py-12">
                <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No transactions found
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || filterType !== "all" || filterStatus !== "all"
                    ? "Try adjusting your search or filter criteria."
                    : "Get started by recording your first transaction."}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
