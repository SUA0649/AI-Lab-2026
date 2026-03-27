export interface Product {
  item_id: string
  name: string
  description: string
  sku: string
  category: string
  selling_price: number
  cost_price: number
  quantity: number
  threshold: number
  created_at: string
  updated_at: string
  supplier: string
  status?: string
  Status?: "active" | "inactive"
}

export type LedgerEntry = {
  //date: string
  accountTitle: string
  debit: number | null
  credit: number | null
  description?: string
}

export type LedgerEntry2 = {
  date: string
  accountTitle: string
  debit: number | null
  credit: number | null
  description?: string
}

export interface Transaction {
  id: string
  item_name: string
  type: "sale" | "purchase"
  quantity: number
  unit_price: number
  total_price: number
  remarks?: string
  created_at: string
  updated_at: string
  customer_supplier: string
  Status: "Pending" | "Completed"
}

export interface LowStockAlert {
  item_id: string
  name: string
  quantity: number
  threshold: number
  severity: string
  created_at: string
}

export type Accounts = {
    emails: string
}

export interface DashboardStats {
  total_products: number
  total_value: number
  low_stock_items: number
  recent_transactions: number
  top_selling_products: Array<{
    name: string
    quantity_sold: number
  }>
}

// User Management Types
export type UserRole = "admin" | "staff"

export interface User {
  id: string
  email: string
  role: UserRole
  name: string
  created_at: string
}

// For future user management features (e.g., listing users)
export type UserList = User[]

// Mock user list for demonstration (replace with real API/backend integration)
export const mockUsers: UserList = [
  {
    id: "1",
    email: "admin@example.com",
    role: "admin",
    name: "Admin User",
    created_at: "2024-01-01T10:00:00Z",
  },
  {
    id: "2",
    email: "staff@example.com",
    role: "staff",
    name: "Staff Member",
    created_at: "2024-01-02T11:00:00Z",
  },
  {
    id: "3",
    email: "staff2@example.com",
    role: "staff",
    name: "Jane Staff",
    created_at: "2024-01-03T09:00:00Z",
  },
  {
    id: "4",
    email: "admin2@example.com",
    role: "admin",
    name: "Alice Admin",
    created_at: "2024-01-04T08:00:00Z",
  },
]

// User management API (mock, for demonstration)
export const userApi = {
  list: async (): Promise<UserList> => mockUsers,
  add: async (user: User): Promise<void> => { mockUsers.push(user) },
  // Edit user profile or details
  edit: async (id: string, updates: Partial<User>): Promise<void> => {
    const idx = mockUsers.findIndex(u => u.id === id)
    if (idx !== -1) mockUsers[idx] = { ...mockUsers[idx], ...updates }
  },
  // Only allow removal of staff, not admins
  remove: async (id: string): Promise<void> => {
    const idx = mockUsers.findIndex(u => u.id === id)
    if (idx !== -1 && mockUsers[idx].role === "staff") mockUsers.splice(idx, 1)
  },

}
