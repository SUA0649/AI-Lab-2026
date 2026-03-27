"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/api"
import type { Product } from "@/lib/types"
import { Plus, Search, Edit, Trash2, Package, AlertTriangle } from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import { useRoleAccess } from "@/hooks/use-role-access"

export default function ProductsPage() {
  const { user, loading } = useAuth()
  const { hasPermission, isStaff } = useRoleAccess()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [productsLoading, setProductsLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

// handleSubmit: remove DB auto-generated fields from payload


  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sku: "",
    category: "",
    price: "",
    cost: "",
    quantity: "",
    threshold: "",
    Status: "active", // Set default status to active
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])


  useEffect(() => {
    const filtered = products.filter(
      (product) =>
        (product.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.sku || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.category || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered)
  }, [products, searchTerm])

  useEffect(() => {
    if (user) {
      fetchProducts()
    }
  }, [user])

  const fetchProducts = async () => {
    try {
      const data = await api.getProducts()
      setProducts(data)
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setProductsLoading(false)
    }
  }

  /*
  const [Products_table, set_Products_table] = useState([]);
  const [message, setMessage] = useState('');
  const [loading2, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchTotalInventory()
    }
  }, [user])

  const fetchTotalInventory = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/Products');
      const data = await response.json();
      setProducts(data.Products_table);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProductsLoading(false)
      setLoading(false);
    }
  }
*/
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const productData = {
        name: formData.name,
        description: formData.description || "",
        sku: formData.sku,
        category: formData.category,
        selling_price: parseFloat(formData.price),
        cost_price: parseFloat(formData.cost),
        quantity: parseInt(formData.quantity),
        threshold: parseInt(formData.threshold),
        Status: formData.Status as "active" | "inactive"
      };

      if (editingProduct) { 
        const updatedProduct = await api.updateProduct(editingProduct.item_id, productData)
        setProducts((prev) => prev.map((p) => (p.item_id === editingProduct.item_id ? updatedProduct : p)))
      }
      else {
  const newProduct = await api.createProduct(productData);
  setProducts((prev) => [...prev, newProduct]); // now includes uuid item_id
      }
      resetForm()
      setIsAddDialogOpen(false)
      setEditingProduct(null)
    } catch (error) {
      console.error("Error saving product:", error)
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name || "",
      description: product.description || "",
      sku: product.sku || "",
      category: product.category || "",
      price: product.selling_price?.toString() || "",
      cost: product.cost_price?.toString() || "",
      quantity: product.quantity?.toString() || "",
      threshold: product.threshold?.toString() || "",
      Status: product.Status || "active",
    })

    setIsAddDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      try {
        await api.deleteProduct(id)
        // Remove product from state immediately
        setProducts((prev) => prev.filter((p) => p.item_id !== id))
      } catch (error) {
        console.error("Error deleting product:", error)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      sku: "",
      category: "",
      price: "",
      cost: "",
      quantity: "",
      threshold: "",
      Status: "active",
    })
  }

  const getStockStatus = (product: Product) => {
    if (product.quantity === 0) return { status: "Out of Stock", color: "destructive" }
    if (product.quantity <= product.threshold) return { status: "Low Stock", color: "secondary" }
    return { status: "In Stock", color: "default" }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:pl-64">
        <main className="min-h-screen">
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <div className="w-full">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 text-center sm:text-left break-words">Products</h1>
                <p className="text-gray-600 text-center sm:text-left text-sm sm:text-base">Manage your inventory items</p>
              </div>
              {hasPermission("canCreateProducts") ? (
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={resetForm} className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Product
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
                      <DialogDescription>
                        {editingProduct ? "Update product information" : "Enter the details for the new product"}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name">Product Name</Label>
                          <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                        </div>
                        <div>
                          <Label htmlFor="sku">SKU</Label>
                          <Input id="sku" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} required />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="category">Category</Label>
                          <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Electronics">Electronics</SelectItem>
                              <SelectItem value="Food & Beverage">Food & Beverage</SelectItem>
                              <SelectItem value="Furniture">Furniture</SelectItem>
                              <SelectItem value="Clothing">Clothing</SelectItem>
                              <SelectItem value="Books">Books</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="price">Selling Price ($)</Label>
                          <Input id="price" type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required />
                        </div>
                        <div>
                          <Label htmlFor="cost">Cost Price ($)</Label>
                          <Input id="cost" type="number" step="0.01" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: e.target.value })} required />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="quantity">Quantity</Label>
                          <Input id="quantity" type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} required />
                        </div>
                        <div>
                          <Label htmlFor="threshold">Low Stock Threshold</Label>
                          <Input id="threshold" type="number" value={formData.threshold} onChange={(e) => setFormData({ ...formData, threshold: e.target.value })} required />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => { setIsAddDialogOpen(false); setEditingProduct(null); resetForm(); }}>Cancel</Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">{editingProduct ? "Update Product" : "Add Product"}</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              ) : (
                <span className="text-sm font-semibold text-red-600 border border-red-300 bg-red-50 px-4 py-2 rounded">Admin access required</span>
              )}
            </div>
            {/* Duplicate form and dialog removed. */}

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>

            {/* Products Grid */}
            {productsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-64 bg-white rounded-lg shadow animate-pulse"></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product, index) => {
                  const stockStatus = getStockStatus(product)
                  // Guarantee unique key by combining prefix, stringified id, and index
                  return (
                    <Card
                      key={`product-card-${String(product.item_id)}-${index}`}
                      className="bg-white shadow-sm border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-2">
                            <Package className="h-5 w-5 text-blue-600" />
                            <CardTitle className="text-lg">{product.name}</CardTitle>
                          </div>
                          <Badge variant={stockStatus.color as any}>{stockStatus.status}</Badge>
                        </div>
                        <CardDescription>{product.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">SKU:</span>
                            <span className="text-sm font-medium">{product.sku}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Category:</span>
                            <span className="text-sm font-medium">{product.category}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Price:</span>
                            <span className="text-sm font-medium">${product.selling_price}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Quantity:</span>
                            <span
                              className={`text-sm font-medium ${
                                product.quantity <= product.threshold ? "text-orange-600" : ""
                              }`}
                            >
                              {product.quantity}
                              {product.quantity <= product.threshold && (
                                <AlertTriangle className="inline ml-1 h-3 w-3" />
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Status:</span>
                            <span className={"text-sm font-medium " + (product.Status === "inactive" ? "text-red-600" : "text-green-700")}>{product.Status === "inactive" ? "Inactive" : "Active"}</span>
                          </div>
                        </div>
                        <div className="flex space-x-2 mt-4">
                          {hasPermission("canEditProducts") || hasPermission("canDeleteProducts") ? (
                            <>
                              {hasPermission("canEditProducts") && (
                                <Button variant="outline" size="sm" onClick={() => handleEdit(product)} className="flex-1">
                                  <Edit className="mr-1 h-3 w-3" />
                                  Edit
                                </Button>
                              )}
                              {hasPermission("canDeleteProducts") && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDelete(product.item_id)}
                                  className="flex-1 text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="mr-1 h-3 w-3" />
                                  Delete
                                </Button>
                              )}
                            </>
                          ) : (
                            <span className="text-xs font-semibold text-yellow-700 bg-yellow-100 border border-yellow-300 rounded px-2 py-1 w-full text-center">View access only</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {filteredProducts.length === 0 && !productsLoading && (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? "Try adjusting your search terms." : "Get started by adding your first product."}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
