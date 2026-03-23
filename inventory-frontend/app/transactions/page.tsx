"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
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
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    product_id: "",
    type: "sale" as "sale" | "purchase",
    quantity: "",
    price: "",
    notes: "",
  });
  // Auto-fill unit price based on product and transaction type
  useEffect(() => {
    const selectedProduct = products.find((p) => p.item_id === formData.product_id);
    if (selectedProduct) {
      if (formData.type === "sale") {
        setFormData((prev) => ({ ...prev, price: selectedProduct.selling_price.toString() }));
      } else if (formData.type === "purchase") {
        setFormData((prev) => ({ ...prev, price: selectedProduct.cost_price.toString() }));
      }
    }
  }, [formData.product_id, formData.type, products]);

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
      (transaction) =>
        transaction.item_name
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        transaction.type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filterType !== "all") {
      filtered = filtered.filter(
        (transaction) => transaction.type === filterType
      );
    }

    setFilteredTransactions(filtered);
  }, [transactions, searchTerm, filterType]);

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
      const selectedProduct = products.find(
        (p) => p.item_id === formData.product_id
      );
      if (!selectedProduct) return;


      /*
      id: string
  item_name: string
  type: "sale" | "purchase"
  quantity: number
  unit_price: number
  total_price: number
  remarks?: string
  customer_supplier: string
  Status: "completed" | "pending"
      */
      /*const transactionData = {
        id: formData.product_id,
        item_name: selectedProduct.name,
        type: formData.type,
        quantity: Number.parseInt(formData.quantity),
        unit_price: Number.parseFloat(formData.price),
        total_price: Number.parseInt(formData.quantity) * Number.parseFloat(formData.price),
        remarks: formData.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        customer_supplier: "current_user", // Replace with actual user ID
        Status: "completed", // Default to completed, can be changed later
      };*/
      const transactionData: Omit<Transaction, "id" | "created_at" | "Status"> = {
        item_name: selectedProduct.name,
        type: formData.type,
        quantity: parseInt(formData.quantity, 10),
        unit_price: parseFloat(formData.price),
        total_price: parseInt(formData.quantity, 10) * parseFloat(formData.price),
        remarks: formData.notes || undefined,
        customer_supplier: formData.type === "sale" ? "Customer" : "Supplier", // Default values
      };
      const newTransaction = await api.createTransaction(transactionData);
        setTransactions((prev) => [newTransaction, ...prev]);
        resetForm();
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Error creating transaction:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      product_id: "",
      type: "sale",
      quantity: "",
      price: "",
      notes: "",
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "sale":
        return <ArrowUpRight className="h-4 w-4 text-green-600" />;
      case "purchase":
        return <ArrowDownRight className="h-4 w-4 text-blue-600" />;
      case "adjustment":
        return <Settings className="h-4 w-4 text-orange-600" />;
      default:
        return <ShoppingCart className="h-4 w-4" />;
    }
  };

  const getTransactionBadgeColor = (type: string) => {
    switch (type) {
      case "sale":
        return "default";
      case "purchase":
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
      .filter((t) => t.type === "sale")
      .reduce((sum, t) => sum + t.total_price, 0);

    const totalPurchases = transactions
      .filter((t) => t.type === "purchase")
      .reduce((sum, t) => sum + t.total_price, 0);

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
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Transaction</DialogTitle>
                    <DialogDescription>
                      Record a new inventory transaction
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="product">Product</Label>
                      <Select
                        value={formData.product_id}
                        onValueChange={(value) => {
                          setFormData({ ...formData, product_id: value });
                        }}
                      >
                        <SelectTrigger>
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
                    <div>
                      <Label htmlFor="type">Transaction Type</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value: any) => {
                          setFormData({ ...formData, type: value });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sale">Customer</SelectItem>
                          <SelectItem value="purchase">Supplier</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input
                          id="quantity"
                          type="number"
                          value={formData.quantity}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              quantity: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="price">Unit Price ($)</Label>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          required
                          // Optionally, you can add readOnly if you want to prevent manual editing:
                          // readOnly
                        />
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
                    className={`w-8 h-8 ${
                      grossMargin >= 0 ? "bg-green-100" : "bg-red-100"
                    } rounded-lg flex items-center justify-center`}
                  >
                    <DollarSign
                      className={`h-4 w-4 ${
                        grossMargin >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${
                      grossMargin >= 0 ? "text-green-600" : "text-red-600"
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
                  <SelectItem value="sale">Sales</SelectItem>
                  <SelectItem value="purchase">Purchases</SelectItem>
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
                            className={`p-3 rounded-full ${
                              transaction.type === "sale"
                                ? "bg-green-100"
                                : transaction.type === "purchase"
                                ? "bg-blue-100"
                                : "bg-orange-100"
                            }`}
                          >
                            {getTransactionIcon(transaction.type)}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-lg break-words">
                              {transaction.item_name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                              <Badge
                                variant={
                                  getTransactionBadgeColor(
                                    transaction.type as string
                                  ) as any
                                }
                              >
                                {transaction.type === "sale"
                                  ? "Customer (Sale)"
                                  : transaction.type === "purchase"
                                  ? "Supplier (Purchase)"
                                  : typeof transaction.type === "string"
                                  ? transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)
                                  : "Other"}
                              </Badge>
                              <span>{transaction.quantity} units</span>
                              <span>${transaction.unit_price} per unit</span>
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
                            className={`text-2xl font-bold ${
                              transaction.type === "sale"
                                ? "text-green-600"
                                : transaction.type === "purchase"
                                ? "text-blue-600"
                                : "text-orange-600"
                            }`}
                          >
                            {transaction.type === "sale"
                              ? "+"
                              : transaction.type === "purchase"
                              ? "-"
                              : ""}
                            ${transaction.total_price.toFixed(2)}
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
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 text-red-600 hover:text-red-700 border-red-200"
                            onClick={() => handleDelete(transaction.id)}
                          >
                            Delete
                          </Button>
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
                  {searchTerm || filterType !== "all"
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
